// src/components/AdminAssignCaseModal.js — acm- namespace
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FaTimes, FaSearch, FaFilter, FaEye,
  FaChevronLeft, FaChevronRight,
} from "react-icons/fa";
import api from "../api/axios";
import "./AdminAssignCaseModal.css";

const initials = (name = "") =>
  (name || "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const CASE_TYPE_LABEL = {
  property: "Property", rental: "Rental",
  consumer: "Consumer", individual: "Individual", commercial: "Commercial",
};

const EXPERTISE_OPTIONS = ["Individual Disputes", "Consumer Disputes", "Commercial Disputes"];
const EXPERTISE_TO_TYPE = {
  "Individual Disputes": "individual",
  "Consumer Disputes":   "consumer",
  "Commercial Disputes": "commercial",
};
const DATE_OPTS = ["Today", "Last 7 Days", "Last 30 Days", "Custom Range"];

/* ════════════════════════════════════════════════════════
   MODAL
════════════════════════════════════════════════════════ */
const AdminAssignCaseModal = ({
  mediatorId,
  mediatorName,
  mediatorAvatar,
  expertiseAreas = [],
  onClose,
  onAssigned,
}) => {
  const [cases,       setCases]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [assigning,   setAssigning]   = useState(null);
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search,      setSearch]      = useState("");
  const [filterOpen,  setFilterOpen]  = useState(false);

  /* Pending (staging) filter state */
  const [pendingDate,      setPendingDate]      = useState("");
  const [pendingDateFrom,  setPendingDateFrom]  = useState("");
  const [pendingDateTo,    setPendingDateTo]    = useState("");
  const [pendingExpertise, setPendingExpertise] = useState([]);

  /* Applied filter state */
  const [dateRange,  setDateRange]  = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [expertise,  setExpertise]  = useState([]);

  const filterRef = useRef(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 5, search };
      if (dateRange === "Today") {
        const t = new Date().toISOString().slice(0, 10);
        params.dateFrom = t; params.dateTo = t;
      } else if (dateRange === "Last 7 Days") {
        params.dateFrom = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      } else if (dateRange === "Last 30 Days") {
        params.dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      } else if (dateRange === "Custom Range") {
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo)   params.dateTo   = dateTo;
      }
      if (expertise.length > 0) {
        params.caseType = expertise.map((e) => EXPERTISE_TO_TYPE[e]).filter(Boolean).join(",");
      }
      const res = await api.get(`/admin/mediators/${mediatorId}/assignable-cases`, { params });
      setCases(res.data.cases);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [mediatorId, page, search, dateRange, dateFrom, dateTo, expertise]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  useEffect(() => {
    const h = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ESC key closes modal */
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  const openFilter = () => {
    setPendingDate(dateRange); setPendingDateFrom(dateFrom);
    setPendingDateTo(dateTo); setPendingExpertise([...expertise]);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setDateRange(pendingDate); setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo); setExpertise([...pendingExpertise]);
    setPage(1); setFilterOpen(false);
  };

  const clearFilter = () => {
    setPendingDate(""); setPendingDateFrom(""); setPendingDateTo(""); setPendingExpertise([]);
  };

  const toggleExpertise = (val) =>
    setPendingExpertise((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]);

  const handleAssign = async (c) => {
    if (!window.confirm(`Assign ${mediatorName} as mediator for "${c.caseTitle}"?`)) return;
    setAssigning(c._id);
    try {
      const res = await api.patch(`/admin/cases/${c._id}/assign-neutral`, {
        neutralId:   mediatorId,
        neutralType: "mediator",
      });
      const assignedCase = res.data.case;
      onAssigned({
        mediatorName,
        caseName: c.caseTitle,
        caseId:   assignedCase?.caseId || c.caseId,
      });
    } catch (e) {
      alert(e.response?.data?.message || "Failed to assign case.");
      setAssigning(null);
    }
  };

  const from = total === 0 ? 0 : (page - 1) * 5 + 1;
  const to   = Math.min(page * 5, total);
  const hasFilters = dateRange || expertise.length > 0;
  const visiblePages = Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1);

  return (
    <div className="acm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="acm-modal">

        {/* Mediator identity header */}
        <div className="acm-header">
          <div className="acm-med-row">
            {mediatorAvatar
              ? <img src={mediatorAvatar} alt={mediatorName} className="acm-med-av" />
              : <div className="acm-med-av acm-med-av--init">{initials(mediatorName)}</div>
            }
            <div>
              <h3 className="acm-med-name">{mediatorName}</h3>
              <div className="acm-chips">
                {expertiseAreas.length > 0
                  ? expertiseAreas.map((e) => <span key={e} className="acm-chip">{e}</span>)
                  : <span className="acm-chip-empty">No expertise listed</span>
                }
              </div>
            </div>
          </div>
          <button className="acm-close-btn" onClick={onClose} title="Close"><FaTimes /></button>
        </div>

        {/* Toolbar: search + filters */}
        <div className="acm-toolbar">
          <form className="acm-search" onSubmit={handleSearch}>
            <FaSearch className="acm-search-icon" />
            <input
              className="acm-search-input"
              placeholder="Search case title or ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
          <div className="acm-filter-wrap" ref={filterRef}>
            <button
              className={`acm-filter-btn ${filterOpen ? "acm-filter-btn--open" : ""}`}
              onClick={openFilter}
            >
              <FaFilter /> Filters
              {hasFilters && <span className="acm-filter-dot" />}
            </button>

            {filterOpen && (
              <div className="acm-filter-panel">
                <div className="acm-fp-head">
                  <span className="acm-fp-title">ACTIVE FILTERS</span>
                  <button className="acm-fp-clear" onClick={clearFilter}>Clear All</button>
                </div>

                {/* Filing Date */}
                <div className="acm-fp-section">
                  <p className="acm-fp-label">Filing Date</p>
                  {DATE_OPTS.map((dr) => (
                    <label key={dr} className="acm-fp-check">
                      <input
                        type="checkbox"
                        checked={pendingDate === dr}
                        onChange={() => setPendingDate(pendingDate === dr ? "" : dr)}
                      />
                      <span>{dr}</span>
                    </label>
                  ))}
                  {pendingDate === "Custom Range" && (
                    <div className="acm-fp-dates">
                      <input type="date" className="acm-fp-date" value={pendingDateFrom}
                        onChange={(e) => setPendingDateFrom(e.target.value)} />
                      <span>—</span>
                      <input type="date" className="acm-fp-date" value={pendingDateTo}
                        onChange={(e) => setPendingDateTo(e.target.value)} />
                    </div>
                  )}
                </div>

                {/* Case Expertise */}
                <div className="acm-fp-section">
                  <p className="acm-fp-label">Case Expertise</p>
                  {EXPERTISE_OPTIONS.map((e) => (
                    <label key={e} className="acm-fp-check">
                      <input
                        type="checkbox"
                        checked={pendingExpertise.includes(e)}
                        onChange={() => toggleExpertise(e)}
                      />
                      <span>{e}</span>
                    </label>
                  ))}
                </div>

                <button className="acm-fp-apply" onClick={applyFilter}>Apply Filters</button>
              </div>
            )}
          </div>
        </div>

        {/* Table header */}
        <div className="acm-table-head">
          <h4 className="acm-table-title">Unassigned Cases</h4>
          {!loading && (
            <span className="acm-table-count">
              Showing {total} relevant {total === 1 ? "case" : "cases"}
            </span>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="acm-loading">Loading cases…</div>
        ) : (
          <table className="acm-table">
            <thead>
              <tr>
                <th>CASE ID</th>
                <th>CASE TITLE</th>
                <th>FILING DATE</th>
                <th>EXPERTISE</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr><td colSpan={5} className="acm-empty">No assignable cases found.</td></tr>
              ) : cases.map((c) => (
                <tr key={c._id} className="acm-table-row">
                  <td className="acm-td-id">#{c.caseId}</td>
                  <td className="acm-td-title">{c.caseTitle}</td>
                  <td className="acm-td-date">{fmtDate(c.createdAt)}</td>
                  <td className="acm-td-exp">{CASE_TYPE_LABEL[c.caseType] || c.caseType || "—"}</td>
                  <td>
                    <div className="acm-row-actions">
                      <button
                        className="acm-view-btn"
                        onClick={() => window.open(`/app/admin/view-details/${c._id}`, "_blank", "noopener")}
                        title="View case"
                      >
                        <FaEye />
                      </button>
                      <button
                        className={`acm-assign-btn ${assigning === c._id ? "acm-assign-btn--busy" : ""}`}
                        onClick={() => handleAssign(c)}
                        disabled={assigning !== null}
                      >
                        {assigning === c._id ? "Assigning…" : "Assign"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer pagination */}
        <div className="acm-footer">
          <span className="acm-pag-info">Showing {from}–{to} of {total} cases</span>
          <div className="acm-pag-controls">
            <button className="acm-pag-arrow" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <FaChevronLeft />
            </button>
            {visiblePages.map((p) => (
              <button
                key={p}
                className={`acm-pag-num ${p === page ? "acm-pag-num--active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button className="acm-pag-arrow" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              <FaChevronRight />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminAssignCaseModal;
