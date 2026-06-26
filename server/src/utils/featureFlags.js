// Server-side feature flags. Read lazily (inside a function, not at module
// top-level) — ES module static imports evaluate before server.js's own
// `dotenv.config()` call runs, so a top-level `process.env.X` read here
// would capture `undefined` permanently (same pitfall documented in
// utils/storageProvider.js).

/* Mediator signup + admin approval stay live regardless of this flag — only
   actual mediator login/portal access is gated behind it. Defaults to OFF
   (false) for any value other than the literal string "true", so an unset
   or misconfigured env var fails closed, not open. */
export const isMediatorPortalLive = () => process.env.ENABLE_MEDIATOR_PORTAL === "true";
