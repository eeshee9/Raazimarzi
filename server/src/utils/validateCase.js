// Server-side validation for the case-filing flow. This is the source of
// truth — the frontend mirrors these rules for UX, but a request that
// bypasses the frontend entirely must still be rejected here.

const normalize = (s) =>
  typeof s === "string" ? s.trim().toLowerCase().replace(/\s+/g, " ") : "";

const normalizePhone = (s) => (typeof s === "string" ? s.replace(/\D/g, "") : "");

/* ── Dummy / placeholder text detection ──────────────────────────────────── */

const DUMMY_WORDS = new Set([
  "test", "testing", "tester", "dummy", "asdf", "asdfg", "asdfasdf",
  "xyz", "abc", "abcd", "n/a", "na", "none", "unknown", "sample",
  "foo", "bar", "lorem", "ipsum", "fake", "xxx", "qwerty", "temp",
  "demo", "example", "placeholder", "blah", "abcdef",
]);

// "aaaa", "1111", "xxxxxx" — same character repeated through the whole string.
const isRepeatedChar = (s) => /^(.)\1+$/.test(s);

const isJunkWord = (word) => {
  const w = normalize(word);
  if (!w) return false;
  return DUMMY_WORDS.has(w) || isRepeatedChar(w);
};

/* A name is junk if it's too short to be real, or every "word" in it is a
   known placeholder / repeated-character string (catches "Test Test" and
   "Asdf Asdf" without blocking real short names like "Om Shah"). */
export const isJunkName = (fullName) => {
  const norm = normalize(fullName);
  if (norm.length < 2) return true;
  const words = norm.split(" ").filter(Boolean);
  return words.length > 0 && words.every(isJunkWord);
};

/* Free text (case title, dispute description) is junk if it's empty, below
   a minimum length, made of one repeated character, or entirely placeholder
   words. */
export const isJunkText = (text, minLength = 0) => {
  const norm = normalize(text);
  if (!norm) return true;
  if (norm.length < minLength) return true;
  if (isRepeatedChar(norm.replace(/\s+/g, ""))) return true;
  const words = norm.split(" ").filter(Boolean);
  return words.every(isJunkWord);
};

// All 10 digits identical — structurally a valid Indian mobile number per
// regex, but never a real assigned one in practice.
export const isRepeatedDigits = (phone) => /^(\d)\1{9}$/.test(phone || "");

/* ── DOB hardening ────────────────────────────────────────────────────────
   Browsers send <input type="date"> as a strict "YYYY-MM-DD" string, but a
   direct API call can send anything — so this re-validates the calendar
   date by hand (round-tripping through Date.UTC) instead of trusting
   `new Date(str)`, which silently rolls over invalid dates like Feb 30 in
   some non-ISO input shapes. */
export const isValidCalendarDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
};

/* Returns an error message string, or null if the DOB is acceptable. */
export const validateDob = (dobStr, { required = true, maxAgeYears = 120 } = {}) => {
  if (!dobStr || !String(dobStr).trim()) {
    return required ? "Date of birth is required" : null;
  }
  if (!isValidCalendarDate(dobStr)) return "Date of birth is not a valid date";

  const dob = new Date(`${dobStr}T00:00:00.000Z`);
  const now = new Date();
  if (dob.getTime() > now.getTime()) return "Date of birth cannot be in the future";

  const minDate = new Date(
    Date.UTC(now.getUTCFullYear() - maxAgeYears, now.getUTCMonth(), now.getUTCDate())
  );
  if (dob.getTime() < minDate.getTime())
    return `Date of birth cannot be more than ${maxAgeYears} years ago`;

  return null;
};

/* ── Petitioner vs respondent distinctness ───────────────────────────────
   Normalized comparison (trim + lowercase, digits-only for phone) — never
   raw string equality. Flags a match on name+contact, or on both contact
   fields alone (since a shared email or phone is itself a strong signal of
   the same identity, regardless of how the name was typed). */
export const isSameParty = (a, b) => {
  const nameA = normalize(a?.fullName);
  const nameB = normalize(b?.fullName);
  const emailA = normalize(a?.email);
  const emailB = normalize(b?.email);
  const phoneA = normalizePhone(a?.mobile);
  const phoneB = normalizePhone(b?.mobile);

  const sameName = !!nameA && nameA === nameB;
  const sameEmail = !!emailA && emailA === emailB;
  const samePhone = !!phoneA && phoneA === phoneB;

  if (sameName && (sameEmail || samePhone)) return true;
  if (sameEmail && samePhone) return true;
  return false;
};

// Retained for backwards compatibility with the original minimal version of
// this module (now superseded by the explicit checks in caseController.js,
// which call the named exports above directly).
export const validateCaseInput = (data) => {
  if (!data.caseTitle) return "Case title is required";
  if (!data.petitioner?.fullName) return "Petitioner name is required";
  if (!data.caseType) return "Case type is required";
  return null;
};

/* ── Text sanitization & length limits ───────────────────────────────────
   Strips control/non-printable characters (keeping \n and \t) in addition
   to the existing <>-stripping sanitizeInput in caseController.js, and
   enforces explicit min/max length so oversized or empty submissions fail
   with a clear message instead of either being silently truncated by a
   downstream Mongoose maxlength validator or bloating the database. */
export const stripControlChars = (s) =>
  typeof s === "string" ? s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") : s;

/* Returns an error message string, or null if the length is acceptable.
   `label` is used in the returned message (e.g. "Case title"). */
export const validateLength = (text, { min = 0, max = Infinity, label = "This field" } = {}) => {
  const len = typeof text === "string" ? text.trim().length : 0;
  if (len < min) return `${label} must be at least ${min} characters`;
  if (len > max) return `${label} must be under ${max} characters`;
  return null;
};

/* ── File-upload policy (shared constant — mirrored on the frontend) ──────
   Type/size limits live in middleware/documentUpload.js (multer); this is
   just the per-case document count cap, enforced in documentController.js. */
export const MAX_FILES_PER_CASE = 10;
