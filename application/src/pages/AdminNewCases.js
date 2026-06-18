// src/pages/AdminNewCases.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell, FaSearch, FaDownload, FaSync,
  FaChevronDown, FaChevronLeft, FaChevronRight, FaChevronUp,
  FaUser, FaShoppingBag, FaBuilding,
} from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminNewCases.css";

/* ─────────────────────────────────────────
   CATEGORY TREE
───────────────────────────────────────── */
const CATEGORY_TREE = [
  {
    group: "Individual",
    icon: <FaUser />,
    sub: [
      "Property & Rental Disputes",
      "Family Disputes",
      "Neighbour & Community",
    ],
  },
  {
    group: "Consumer",
    icon: <FaShoppingBag />,
    sub: [
      "Product Complaints",
      "Service Complaints",
      "Delivery Issues",
      "Refund & Billing Disputes",
    ],
  },
  {
    group: "Commercial",
    icon: <FaBuilding />,
    sub: [
      "Trade & Business Disputes",
      "Finance & Banking Disputes",
      "Corporate & Business Agreement Disputes",
      "Construction & Infrastructure Disputes",
      "Commercial Property Disputes",
      "Intellectual Property Disputes",
      "Technology & Digital Disputes",
      "Franchise & Distribution Disputes",
      "Employment & Workforce Disputes",
      "Contract & Agreement Disputes",
    ],
  },
];

const ALL_SUBS = CATEGORY_TREE.flatMap(g => g.sub);

const STATUS_OPTIONS   = ["All Statuses", "Pending Review", "Mediation", "Rejected", "Resolved", "Closed"];
const MEDIATOR_OPTIONS = ["All Status", "Assigned", "Unassigned"];
const AMOUNT_OPTIONS   = ["All Ranges", "₹499 /-", "₹999 /-", "₹1499 /-", "₹1999 /-", "₹2499 /-"];
const ROWS_OPTIONS     = [5, 10, 20, 50];

/* Bug 3 fix: normalize status for case-insensitive group matching */
const STATUS_GROUPS = {
  "pending review": ["pending", "pending-review", "in review", "notice-sent", "notice sent"],
  "mediation":      ["mediation", "in-progress", "in progress", "assigned", "hearing", "arbitration"],
  "rejected":       ["rejected"],
  "resolved":       ["resolved", "awarded"],
  "closed":         ["closed", "withdrawn"],
};
const normalizeStatus = s => (s || "").toLowerCase().replace(/-/g, " ").trim();

/* Bug 4 fix: map UI subcategory labels → real caseType enum values */
const CATEGORY_TO_TYPE = {
  "Property & Rental Disputes":               ["property", "rental"],
  "Family Disputes":                          ["individual"],
  "Neighbour & Community":                    ["individual"],
  "Product Complaints":                       ["consumer"],
  "Service Complaints":                       ["consumer"],
  "Delivery Issues":                          ["consumer"],
  "Refund & Billing Disputes":                ["consumer"],
  "Trade & Business Disputes":                ["commercial"],
  "Finance & Banking Disputes":               ["commercial"],
  "Corporate & Business Agreement Disputes":  ["commercial"],
  "Construction & Infrastructure Disputes":   ["commercial"],
  "Commercial Property Disputes":             ["commercial"],
  "Intellectual Property Disputes":           ["commercial"],
  "Technology & Digital Disputes":            ["commercial"],
  "Franchise & Distribution Disputes":        ["commercial"],
  "Employment & Workforce Disputes":          ["commercial"],
  "Contract & Agreement Disputes":            ["commercial"],
};

/* Bug 8 fix: real numeric range bands for amount filter */
const AMOUNT_RANGES = {
  "₹499 /-":  { min: 0,    max: 499  },
  "₹999 /-":  { min: 500,  max: 999  },
  "₹1499 /-": { min: 1000, max: 1499 },
  "₹1999 /-": { min: 1500, max: 1999 },
  "₹2499 /-": { min: 2000, max: 2499 },
};

const getStatusClass = (s = "") => {
  const v = s.toLowerCase().replace(/\s+/g, "-");
  if (["resolved", "awarded"].includes(v))          return "adx2-badge--green";
  if (["pending", "pending-review"].includes(v))    return "adx2-badge--yellow";
  if (v === "rejected")                             return "adx2-badge--red";
  if (["mediation","assigned","in-progress","hearing"].includes(v)) return "adx2-badge--blue";
  if (["closed","withdrawn"].includes(v))           return "adx2-badge--grey";
  return "adx2-badge--grey";
};

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

/* ─────────────────────────────────────────
   PLAIN DROPDOWN
───────────────────────────────────────── */
const Dropdown = ({ options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="adx2-dropdown" ref={ref}>
      <button
        className={`adx2-dropdown__trigger ${open ? "open" : ""}`}
        onClick={() => setOpen(p => !p)}
      >
        <span>{value}</span>
        {open ? <FaChevronUp className="adx2-dropdown__chevron" /> : <FaChevronDown className="adx2-dropdown__chevron" />}
      </button>
      {open && (
        <div className="adx2-dropdown__menu">
          {options.map(opt => (
            <div
              key={opt}
              className="adx2-dropdown__item"
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              <span>{opt}</span>
              <span className={`adx2-radio ${value === opt ? "adx2-radio--checked" : ""}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   DATE RANGE PICKER
───────────────────────────────────────── */
const DateRangePicker = ({ dateFrom, dateTo, onFromChange, onToChange }) => (
  <div className="adx2-daterange">
    <input
      type="date"
      className="adx2-date-input"
      value={dateFrom}
      onChange={e => onFromChange(e.target.value)}
    />
    <span className="adx2-daterange__sep">—</span>
    <input
      type="date"
      className="adx2-date-input"
      value={dateTo}
      onChange={e => onToChange(e.target.value)}
    />
  </div>
);

/* ─────────────────────────────────────────
   CATEGORY DROPDOWN
───────────────────────────────────────── */
const CategoryDropdown = ({ value, onChange }) => {
  const [open, setOpen]         = useState(false);
  const [expanded, setExpanded] = useState({});
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggleGroup = (group, e) => {
    e.stopPropagation();
    setExpanded(p => ({ ...p, [group]: !p[group] }));
  };

  return (
    <div className="adx2-dropdown adx2-cat-dropdown" ref={ref}>
      <button
        className={`adx2-dropdown__trigger ${open ? "open" : ""}`}
        onClick={() => setOpen(p => !p)}
      >
        <span className="adx2-cat-trigger-text">{value}</span>
        {open ? <FaChevronUp className="adx2-dropdown__chevron" /> : <FaChevronDown className="adx2-dropdown__chevron" />}
      </button>

      {open && (
        <div className="adx2-dropdown__menu adx2-cat-menu">
          <div
            className="adx2-dropdown__item"
            onClick={() => { onChange("All Categories"); setOpen(false); }}
          >
            <span>All Categories</span>
            <span className={`adx2-radio ${value === "All Categories" ? "adx2-radio--checked" : ""}`} />
          </div>

          {CATEGORY_TREE.map(({ group, icon, sub }) => {
            const isExp     = !!expanded[group];
            const grpActive = sub.includes(value);
            return (
              <div key={group}>
                <div
                  className={`adx2-cat-group ${grpActive ? "adx2-cat-group--active" : ""}`}
                  onClick={e => toggleGroup(group, e)}
                >
                  <span className="adx2-cat-group__icon">{icon}</span>
                  <span className="adx2-cat-group__label">{group}</span>
                  <span className="adx2-cat-group__arrow">
                    {isExp ? <FaChevronDown style={{ fontSize: 10 }} /> : <FaChevronRight style={{ fontSize: 10 }} />}
                  </span>
                </div>
                {isExp && (
                  <div className="adx2-cat-subs">
                    {sub.map(s => (
                      <div
                        key={s}
                        className="adx2-cat-sub-item"
                        onClick={() => { onChange(s); setOpen(false); }}
                      >
                        <span>{s}</span>
                        <span className={`adx2-radio ${value === s ? "adx2-radio--checked" : ""}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   ROWS PER PAGE DROPDOWN
───────────────────────────────────────── */
const RowsDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="adx2-rows-dropdown" ref={ref}>
      <button
        className={`adx2-rows-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen(p => !p)}
      >
        <span>{value}</span>
        {open ? <FaChevronUp style={{ fontSize: 9 }} /> : <FaChevronDown style={{ fontSize: 9 }} />}
      </button>
      {open && (
        <div className="adx2-rows-menu">
          {ROWS_OPTIONS.map(opt => (
            <div
              key={opt}
              className={`adx2-rows-item ${value === opt ? "adx2-rows-item--active" : ""}`}
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
const AdminAllCases = () => {
  const navigate = useNavigate();

  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cases,           setCases]           = useState([]);
  const [serverTotal,     setServerTotal]     = useState(0);
  const [loading,         setLoading]         = useState(true);
  const [selectedRows,    setSelectedRows]    = useState([]);
  const [adminAvatar,     setAdminAvatar]     = useState("");

  const [filterStatus,   setFilterStatus]   = useState("All Statuses");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterAmount,   setFilterAmount]   = useState("All Ranges");
  const [filterMediator, setFilterMediator] = useState("All Status");
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");

  const [page,        setPage]        = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* Debounce search — avoids an API call on every keystroke */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    const params = { page, limit: rowsPerPage };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (filterStatus !== "All Statuses") {
      const rawStatuses = STATUS_GROUPS[normalizeStatus(filterStatus)] || [];
      if (rawStatuses.length) params.status = rawStatuses.join(",");
    }
    if (filterCategory !== "All Categories") {
      const types = CATEGORY_TO_TYPE[filterCategory] || [];
      if (types.length) params.caseType = types[0];
    }
    try {
      const res = await api.get("/admin/cases", { params });
      const data = res.data;
      if (data.success) {
        setCases(data.cases || []);
        setServerTotal(data.total || 0);
      } else {
        setCases([]);
        setServerTotal(0);
      }
    } catch {
      setCases([]);
      setServerTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, filterStatus, filterCategory]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    const stored = localStorage.getItem("user");
    if (stored) { try { setAdminAvatar(JSON.parse(stored)?.avatar || ""); } catch {} }
    fetchCases();
  }, [navigate, fetchCases]);

  /* Client-side filters for amount, mediator, and date range only.
     Status, category, and search are sent as server-side params. */
  const filtered = cases.filter(c => {
    const mAmt = (() => {
      if (filterAmount === "All Ranges") return true;
      const range = AMOUNT_RANGES[filterAmount];
      if (!range) return true;
      const fee = c.filingFee ?? 0;
      return fee >= range.min && fee <= range.max;
    })();

    const mMed = filterMediator === "All Status"     ||
      (filterMediator === "Assigned"   && !!c.assignedNeutral) ||
      (filterMediator === "Unassigned" && !c.assignedNeutral);

    let mDate = true;
    if (dateFrom && c.createdAt) mDate = new Date(c.createdAt) >= new Date(dateFrom);
    if (dateTo   && c.createdAt) mDate = mDate && new Date(c.createdAt) <= new Date(dateTo);

    return mAmt && mMed && mDate;
  });
  const hasClientFilters = filterAmount !== "All Ranges" || filterMediator !== "All Status" || !!dateFrom || !!dateTo;

  /* ── Active filter chips ── */
  const activeFilters = [];
  if (filterCategory !== "All Categories") activeFilters.push({ key: "cat", label: filterCategory, clear: () => setFilterCategory("All Categories") });
  if (filterStatus   !== "All Statuses")   activeFilters.push({ key: "st",  label: filterStatus,   clear: () => setFilterStatus("All Statuses") });
  if (filterAmount   !== "All Ranges")     activeFilters.push({ key: "amt", label: filterAmount,   clear: () => setFilterAmount("All Ranges") });
  if (filterMediator !== "All Status")     activeFilters.push({ key: "med", label: filterMediator, clear: () => setFilterMediator("All Status") });

  const clearAll = () => {
    setFilterStatus("All Statuses");
    setFilterCategory("All Categories");
    setFilterAmount("All Ranges");
    setFilterMediator("All Status");
    setDateFrom("");
    setDateTo("");
  };

  /* ── Pagination (server-side) ── */
  const totalPages = Math.max(1, Math.ceil(serverTotal / rowsPerPage));
  const paginated  = filtered; // server returns one page; amount/mediator/date applied client-side above

  /* ── Row selection ── */
  const toggleRow = id =>
    setSelectedRows(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () =>
    setSelectedRows(selectedRows.length === paginated.length ? [] : paginated.map(c => c._id));

  /* ── Export CSV ── */
  const exportCSV = () => {
    const rows = [["Case ID", "Title", "Petitioner", "Respondent", "Category", "Mediator", "Status", "Fee", "Filed"]];
    filtered.forEach(c => rows.push([
      c.caseId, c.caseTitle,
      c.petitionerDetails?.fullName, c.defendantDetails?.fullName,
      c.caseType,
      // ✅ Fixed: use assignedNeutral.name
      c.assignedNeutral?.name || "—",
      c.status,
      c.filingFee ? `₹${c.filingFee}` : "—",
      fmtDate(c.createdAt),
    ]));
    const csv  = rows.map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "cases.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const adminName = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").name || "Admin"; } catch { return "Admin"; }
  })();

  return (
    <div className="adx2-root">
      <AdminSidebar activePage="all-cases" />

      <main className="adx2-main">

        {/* ── Topbar ── */}
        <header className="adx2-topbar">
          <div className="adx2-search">
            <FaSearch className="adx2-search__icon" />
            <input
              className="adx2-search__input"
              placeholder="Search cases, mediators or files…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="adx2-topbar__right">
            <button className="adx2-topbar__bell" aria-label="Notifications"><FaBell /></button>
            <img
              src={adminAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`}
              alt="admin"
              className="adx2-topbar__avatar"
            />
          </div>
        </header>

        <div className="adx2-body">

          {/* ── Page header ── */}
          <div className="adx2-page-header">
            <div>
              <h2 className="adx2-page-title">All Cases</h2>
              <p className="adx2-page-sub">Manage and track all disputes across the platform</p>
            </div>
            <div className="adx2-page-header__actions">
              <button className="adx2-refresh-btn" onClick={fetchCases} title="Refresh">
                <FaSync />
              </button>
              <button className="adx2-export-btn" onClick={exportCSV} title="Exports current page results">
                <FaDownload /> Export as CSV
              </button>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="adx2-filters">
            <div className="adx2-filter-group">
              <label className="adx2-filter-label">STATUS</label>
              <Dropdown options={STATUS_OPTIONS} value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1); }} />
            </div>
            <div className="adx2-filter-group">
              <label className="adx2-filter-label">CATEGORY</label>
              <CategoryDropdown value={filterCategory} onChange={v => { setFilterCategory(v); setPage(1); }} />
            </div>
            <div className="adx2-filter-group">
              <label className="adx2-filter-label">AMOUNT</label>
              <Dropdown options={AMOUNT_OPTIONS} value={filterAmount} onChange={v => { setFilterAmount(v); setPage(1); }} />
            </div>
            <div className="adx2-filter-group">
              <label className="adx2-filter-label">DATE RANGE</label>
              <DateRangePicker
                dateFrom={dateFrom} dateTo={dateTo}
                onFromChange={v => { setDateFrom(v); setPage(1); }}
                onToChange={v => { setDateTo(v); setPage(1); }}
              />
            </div>
            <div className="adx2-filter-group">
              <label className="adx2-filter-label">MEDIATOR</label>
              <Dropdown options={MEDIATOR_OPTIONS} value={filterMediator} onChange={v => { setFilterMediator(v); setPage(1); }} />
            </div>
          </div>

          {/* ── Active filter chips ── */}
          {activeFilters.length > 0 && (
            <div className="adx2-active-filters">
              <span className="adx2-active-filters__label">Active Filters:</span>
              {activeFilters.map(f => (
                <span key={f.key} className="adx2-filter-tag">
                  {f.label}
                  <button className="adx2-filter-tag__x" onClick={f.clear}>×</button>
                </span>
              ))}
              <button className="adx2-clear-all" onClick={clearAll}>Clear All</button>
            </div>
          )}

          {/* ── Table card ── */}
          <div className="adx2-table-card">
            <div className="adx2-table-wrap">
              <table className="adx2-table">
                <thead>
                  <tr>
                    <th className="adx2-table__th-num">
                      <input
                        type="checkbox"
                        className="adx2-checkbox"
                        checked={paginated.length > 0 && selectedRows.length === paginated.length}
                        onChange={toggleAll}
                      />
                    </th>
                    <th>CASE ID</th>
                    <th>TOPIC</th>
                    <th>PARTICIPANTS</th>
                    <th>MEDIATOR</th>
                    <th>STATUS</th>
                    <th>FEE (₹)</th>
                    <th>FILED DATE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="adx2-table__empty">Loading cases…</td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="adx2-table__empty">
                        {search || activeFilters.length > 0
                          ? "No cases match your filters."
                          : "No cases filed yet."}
                      </td>
                    </tr>
                  ) : paginated.map((c, idx) => {
                    const rowNum = (page - 1) * rowsPerPage + idx + 1;
                    const isSel  = selectedRows.includes(c._id);
                    // ✅ Fixed: use assignedNeutral.name from populated field
                    const mediatorName = c.assignedNeutral?.name || "—";
                    return (
                      <tr key={c._id} className={isSel ? "adx2-table__row--selected" : ""}>
                        <td className="adx2-table__td-num">
                          <div
                            className={`adx2-row-num ${isSel ? "adx2-row-num--checked" : ""}`}
                            onClick={() => toggleRow(c._id)}
                          >
                            {isSel
                              ? <input type="checkbox" className="adx2-checkbox" checked readOnly />
                              : rowNum
                            }
                          </div>
                        </td>
                        <td className="adx2-table__caseid">{c.caseId}</td>
                        <td>{c.caseTitle || "—"}</td>
                        <td className="adx2-table__participants">
                          <span className="adx2-participant-role">(Petitioner)</span>
                          <span className="adx2-participant-name">{c.petitionerDetails?.fullName || "—"}</span>
                          <span className="adx2-participant-role">(Respondent)</span>
                          <span className="adx2-participant-name">
                            {c.defendantDetails?.fullName || c.respondent?.name || "—"}
                          </span>
                        </td>
                        <td>{mediatorName}</td>
                        <td>
                          <span className={`adx2-badge ${getStatusClass(c.status)}`}>
                            {c.status || "Pending"}
                          </span>
                        </td>
                        <td className="adx2-table__fee">
                          {c.filingFee ? `₹${c.filingFee.toLocaleString("en-IN")} /-` : "—"}
                        </td>
                        <td>{fmtDate(c.createdAt)}</td>
                        <td>
                          {/* ✅ Fixed: navigate to real case ID */}
                          <button
                            className="adx2-view-btn"
                            onClick={() => navigate(`/admin/view-details/${c._id}`)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination footer ── */}
            <div className="adx2-pagination">
              <div className="adx2-pagination__left">
                <span className="adx2-pagination__label">Rows per page:</span>
                <RowsDropdown value={rowsPerPage} onChange={v => { setRowsPerPage(v); setPage(1); }} />
                {selectedRows.length > 0 && (
                  <span className="adx2-pagination__selected">
                    Selected row(s) - {selectedRows.length}
                  </span>
                )}
              </div>
              <div className="adx2-pagination__right">
                <span className="adx2-pagination__info">
                  {serverTotal === 0
                    ? "0 cases"
                    : `${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, serverTotal)} of ${serverTotal} cases`
                  }
                  {hasClientFilters && filtered.length < cases.length && ` · ${filtered.length} shown`}
                </span>
                <button
                  className="adx2-pagination__btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <FaChevronLeft />
                </button>
                <button
                  className="adx2-pagination__btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminAllCases;
