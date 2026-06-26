import path from "path";

const MAX_LENGTH = 255;

/* Makes a client-supplied filename safe to store/display without touching
   its extension (the upload type allowlist already governs that):
     - strips control characters (\r, \n, \t, etc.), collapsing each run to
       a single space so the name stays readable instead of disappearing,
     - trims surrounding whitespace,
     - caps the total length, truncating only the base name so the
       extension is always preserved intact.
   This is a display/storage hygiene layer, not a security boundary — the
   actual storage path is built server-side from caseId/userId/timestamp and
   never incorporates this value (see utils/storageProvider.js). */
export const sanitizeFilename = (name) => {
  if (typeof name !== "string") return "Untitled file";

  let safe = name.replace(/[\x00-\x1F\x7F]+/g, " ").trim();
  if (!safe) return "Untitled file";

  if (safe.length > MAX_LENGTH) {
    const ext = path.extname(safe);
    const base = safe.slice(0, safe.length - ext.length);
    safe = base.slice(0, MAX_LENGTH - ext.length) + ext;
  }

  return safe;
};
