// Frontend mirror of server/src/utils/validateCase.js — for inline UX only.
// The backend is the source of truth; these checks just let the user fix
// obvious problems before a request round-trip.

const normalize = (s) =>
  typeof s === "string" ? s.trim().toLowerCase().replace(/\s+/g, " ") : "";

const normalizePhone = (s) => (typeof s === "string" ? s.replace(/\D/g, "") : "");

const DUMMY_WORDS = new Set([
  "test", "testing", "tester", "dummy", "asdf", "asdfg", "asdfasdf",
  "xyz", "abc", "abcd", "n/a", "na", "none", "unknown", "sample",
  "foo", "bar", "lorem", "ipsum", "fake", "xxx", "qwerty", "temp",
  "demo", "example", "placeholder", "blah", "abcdef",
]);

const isRepeatedChar = (s) => /^(.)\1+$/.test(s);

const isJunkWord = (word) => {
  const w = normalize(word);
  if (!w) return false;
  return DUMMY_WORDS.has(w) || isRepeatedChar(w);
};

export const isJunkName = (fullName) => {
  const norm = normalize(fullName);
  if (norm.length < 2) return true;
  const words = norm.split(" ").filter(Boolean);
  return words.length > 0 && words.every(isJunkWord);
};

export const isJunkText = (text, minLength = 0) => {
  const norm = normalize(text);
  if (!norm) return true;
  if (norm.length < minLength) return true;
  if (isRepeatedChar(norm.replace(/\s+/g, ""))) return true;
  const words = norm.split(" ").filter(Boolean);
  return words.every(isJunkWord);
};

export const isRepeatedDigits = (phone) => /^(\d)\1{9}$/.test(phone || "");

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

/* Returns an error message string, or null if the length is acceptable. */
export const validateLength = (text, { min = 0, max = Infinity, label = "This field" } = {}) => {
  const len = typeof text === "string" ? text.trim().length : 0;
  if (len < min) return `${label} must be at least ${min} characters`;
  if (len > max) return `${label} must be under ${max} characters`;
  return null;
};

/* ── File-upload policy (mirrors server/src/utils/validateCase.js and
   server/src/middleware/documentUpload.js) ── */
export const MAX_FILES_PER_CASE = 10;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const ACCEPTED_FILE_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";
