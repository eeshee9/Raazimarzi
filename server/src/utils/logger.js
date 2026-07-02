/**
 * Structured logger for RaaziMarzi backend.
 *
 * Emits JSON lines to stdout/stderr — compatible with PM2 log rotation
 * and any log aggregator (Loki, CloudWatch, Datadog).
 *
 * Usage:
 *   import log from "../utils/logger.js";
 *   log.info("Award PDF generated", { awardRef, caseId, userId });
 *   log.warn("Notification failed", { service: "whatsapp", error: err.message });
 *   log.error("Database write failed", { error: err.message, stack: err.stack });
 *
 * In development the output is human-readable; in production it is JSON.
 */

const isProd = process.env.NODE_ENV === "production";

const fmt = (level, message, meta = {}) => {
  const entry = {
    ts:      new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  return isProd ? JSON.stringify(entry) : `[${entry.ts}] ${level.toUpperCase().padEnd(5)} ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`.trimEnd();
};

const log = {
  info:  (msg, meta) => console.log(fmt("info",  msg, meta)),
  warn:  (msg, meta) => console.warn(fmt("warn",  msg, meta)),
  error: (msg, meta) => console.error(fmt("error", msg, meta)),
  debug: (msg, meta) => {
    if (!isProd) console.debug(fmt("debug", msg, meta));
  },

  /* Convenience wrappers for common audit events */
  consent: (caseId, stage, signerEmail) =>
    log.info("Consent recorded", { caseId, stage, signerEmail }),

  awardPDF: (caseId, awardRef, by, regen) =>
    log.info(regen ? "Award PDF regenerated" : "Award PDF generated", { caseId, awardRef, by }),

  closure: (caseId, closedBy, reason) =>
    log.info("Case formally closed", { caseId, closedBy, reason }),

  notifSent: (channel, caseId, to, success) =>
    log.info("Notification sent", { channel, caseId, to, success }),

  notifFailed: (channel, caseId, error) =>
    log.warn("Notification failed", { channel, caseId, error }),
};

export default log;
