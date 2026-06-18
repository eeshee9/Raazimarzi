// Maps legacy/garbage caseType strings found in production data to the
// valid Case.caseType enum: ["property", "rental", "consumer", "individual", "commercial"]

export const VALID_CASE_TYPES = ["property", "rental", "consumer", "individual", "commercial"];

const LEGACY_MAP = {
  "civil":               "individual",
  "legal":                "individual",
  "family":              "individual",
  "partnership dispute": "commercial",
  "property dispute":    "property",
};

// Returns a valid enum value, or null if the input can't be confidently mapped
// (e.g. garbage strings like "fhhf") — callers should leave those for manual cleanup.
export const normalizeCaseType = (raw) => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (VALID_CASE_TYPES.includes(trimmed)) return trimmed;
  return LEGACY_MAP[trimmed.toLowerCase()] || null;
};
