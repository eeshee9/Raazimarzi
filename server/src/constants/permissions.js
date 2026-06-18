// Shared permission catalogue for the Sub-Admin module.
// Keys here must stay in sync with application/src/constants/permissions.js (frontend mirror).

export const PERMISSION_CATALOG = {
  users: {
    label: "Users",
    options: [
      { key: "view_directory",   label: "View Directory" },
      { key: "manage_profiles",  label: "Manage User Profiles" },
    ],
  },
  mediators: {
    label: "Mediators",
    options: [
      { key: "view_qualifications", label: "View Qualifications" },
      { key: "approve_verify",      label: "Approve/Verify" },
    ],
  },
  cases: {
    label: "Cases",
    options: [
      { key: "view_all_cases", label: "View All Cases" },
      { key: "manage_cases",   label: "Manage Cases" },
    ],
  },
  payments: {
    label: "Payments",
    options: [
      { key: "view_transactions",  label: "View Transactions" },
      { key: "export_financials",  label: "Export Financials" },
    ],
  },
  support: {
    label: "Support",
    options: [
      { key: "view_tickets",      label: "View Support Tickets" },
      { key: "resolve_disputes",  label: "Resolve Disputes" },
    ],
  },
  settings: {
    label: "Settings",
    options: [
      { key: "access_global_config", label: "Access Global Config" },
      { key: "manage_sub_admins",    label: "Manage Sub Admins" },
    ],
  },
};

export const PERMISSION_CATEGORY_KEYS = Object.keys(PERMISSION_CATALOG);

export const countPermissions = (permissions = {}) =>
  PERMISSION_CATEGORY_KEYS.reduce((sum, cat) => sum + (Array.isArray(permissions[cat]) ? permissions[cat].length : 0), 0);

// Strips out any unknown categories/keys a client might send.
export const sanitizePermissions = (input = {}) => {
  const clean = {};
  for (const cat of PERMISSION_CATEGORY_KEYS) {
    const validKeys = PERMISSION_CATALOG[cat].options.map((o) => o.key);
    const incoming = Array.isArray(input[cat]) ? input[cat] : [];
    clean[cat] = incoming.filter((k) => validKeys.includes(k));
  }
  return clean;
};
