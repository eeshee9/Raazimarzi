// Mirrors server/src/constants/permissions.js — keep keys in sync.

export const PERMISSION_CATALOG = {
  users: {
    label: "Users",
    options: [
      { key: "view_directory",  label: "View Directory" },
      { key: "manage_profiles", label: "Manage User Profiles" },
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
      { key: "view_transactions", label: "View Transactions" },
      { key: "export_financials", label: "Export Financials" },
    ],
  },
  support: {
    label: "Support",
    options: [
      { key: "view_tickets",     label: "View Support Tickets" },
      { key: "resolve_disputes", label: "Resolve Disputes" },
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
