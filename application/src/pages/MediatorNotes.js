// src/pages/MediatorNotes.js — My Case Notes list (all assigned cases)
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  StickyNote, Search, ChevronDown, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, FileText, RefreshCw, Plus,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorNotes.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "/") : "—";

const STATUS_CFG = {
  "Pending":        { bg: "#FFF7ED", color: "#EA580C" },
  "pending-review": { bg: "#FFF7ED", color: "#EA580C" },
  "Assigned":       { bg: "#EDE9FE", color: "#7C3AED" },
  "mediation":      { bg: "#DBEAFE", color: "#1D4ED8" },
  "In Mediation":   { bg: "#DBEAFE", color: "#1D4ED8" },
  "Resolved":       { bg: "#D1FAE5", color: "#065F46" },
  "resolved":       { bg: "#D1FAE5", color: "#065F46" },
  "Closed":         { bg: "#F3F4F6", color: "#6B7280" },
  "closed":         { bg: "#F3F4F6", color: "#6B7280" },
  "Rejected":       { bg: "#FEE2E2", color: "#991B1B" },
  "rejected":       { bg: "#FEE2E2", color: "#991B1B" },
  "Hearing":        { bg: "#FFFBEB", color: "#D97706" },
  "in-progress":    { bg: "#EFF6FF", color: "#2563EB" },
};
const statusCfg = (s) => STATUS_CFG[s] || { bg: "#F3F4F6", color: "#6B7280" };

const STATUS_OPTS = [
  { value: "", label: "All Statuses" },
  { value: "Assigned",   label: "Assigned" },
  { value: "mediation",  label: "In Mediation" },
  { value: "Hearing",    label: "Hearing" },
  { value: "Resolved",   label: "Resolved" },
  { value: "Closed",     label: "Closed" },
  { value: "Rejected",   label: "Rejected" },
];

const TYPE_OPTS = [
  { value: "", label: "All Categories" },
  { value: "property",   label: "Property" },
  { value: "rental",     label: "Rental" },
  { value: "consumer",   label: "Consumer" },
  { value: "individual", label: "Individual" },
  { value: "commercial", label: "Commercial" },
];

const PAGE_SIZE = 10;

// ─── Component ────────────────────────────────────────────────────────────────

const MediatorNotes = () => {
  const navigate = useNavigate();

  const [cases,    setCases]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [page,     setPage]     = useState(1);

  // Filters
  const [search,     setSearch]     = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status,     setStatus]     = useState("");
  const [caseType,   setCaseType]   = useState("");

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: pg, limit: PAGE_SIZE });
      if (status)   params.set("status", status);
      if (caseType) params.set("caseType", caseType);
      if (search)   params.set("q", search);
      const { data } = await axiosInstance.get(`/mediator/case-notes?${params}`);
      setCases(data.cases || []);
      setTotal(data.total || 0);
      setPage(pg);
    } catch {
      setError("Failed to load case notes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [status, caseType, search]);

  useEffect(() => { load(1); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <MediatorLayout>
      <div className="mcn-page">

        {/* Page header */}
        <div className="mcn-page-header">
          <div>
            <h1 className="mcn-page-title">My Case Notes</h1>
            <p className="mcn-page-sub">Private notes — visible to mediator &amp; admin only</p>
          </div>
          <button className="mcn-refresh-btn" onClick={() => load(page)} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Filter bar */}
        <div className="mcn-filter-bar">
          {/* Search */}
          <div className="mcn-search-wrap">
            <Search size={14} className="mcn-search-icon" />
            <input
              className="mcn-search-input"
              placeholder="Search case ID, topic, participant…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="mcn-select-group">
            <span className="mcn-filter-label">STATUS</span>
            <div className="mcn-select-wrap">
              <select
                className="mcn-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="mcn-sel-icon" />
            </div>
          </div>

          {/* Category */}
          <div className="mcn-select-group">
            <span className="mcn-filter-label">CATEGORY</span>
            <div className="mcn-select-wrap">
              <select
                className="mcn-select"
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
              >
                {TYPE_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="mcn-sel-icon" />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="mcn-state">
            <Loader2 size={26} className="mcn-spin" />
            <span>Loading cases…</span>
          </div>
        ) : error ? (
          <div className="mcn-state mcn-state--error">
            <AlertCircle size={22} />
            <span>{error}</span>
            <button className="mcn-retry-btn" onClick={() => load(page)}>Retry</button>
          </div>
        ) : cases.length === 0 ? (
          <div className="mcn-state mcn-state--empty">
            <StickyNote size={38} />
            <span>
              {search || status || caseType
                ? "No cases match the current filters."
                : "No assigned cases found. Cases will appear once assigned to you."}
            </span>
          </div>
        ) : (
          <>
            <div className="mcn-table-wrap">
              <table className="mcn-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>CASE ID</th>
                    <th>TOPIC</th>
                    <th>PARTICIPANTS</th>
                    <th>STATUS</th>
                    <th>FILED DATE</th>
                    <th>REMARK</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c, idx) => {
                    const cfg = statusCfg(c.status);
                    const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
                    const hasNotes = c.noteCount > 0;
                    return (
                      <tr
                        key={c._id}
                        className="mcn-tr"
                        onClick={() => navigate(`/mediator/case-notes/${c._id}`)}
                        title="Open case notes"
                      >
                        <td>
                          <span className={`mcn-row-num ${hasNotes ? "mcn-row-num--active" : ""}`}>
                            {rowNum}
                          </span>
                        </td>
                        <td className="mcn-td-id">#{c.caseId}</td>
                        <td className="mcn-td-topic">
                          <span className="mcn-topic-title">{c.caseTitle || "Untitled"}</span>
                          <span className="mcn-topic-type">{c.caseType}</span>
                        </td>
                        <td className="mcn-td-parties">
                          <span className="mcn-party-row">
                            <span className="mcn-party-role">(Petitioner)</span>
                            <span className="mcn-party-name">{c.petitionerName}</span>
                          </span>
                          <span className="mcn-party-row">
                            <span className="mcn-party-role">(Respondent)</span>
                            <span className="mcn-party-name">{c.respondentName}</span>
                          </span>
                        </td>
                        <td>
                          <span
                            className="mcn-status-badge"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            <span className="mcn-status-dot" style={{ background: cfg.color }} />
                            {c.status}
                          </span>
                        </td>
                        <td className="mcn-td-date">{fmtDate(c.createdAt)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="mcn-add-note-btn"
                            onClick={() => navigate(`/mediator/case-notes/${c._id}`)}
                          >
                            {hasNotes ? (
                              <>
                                <FileText size={12} />
                                {c.noteCount} Note{c.noteCount !== 1 ? "s" : ""}
                              </>
                            ) : (
                              <>
                                <Plus size={12} />
                                Add Note
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mcn-pagination">
              <span className="mcn-pag-info">
                Rows per page: {PAGE_SIZE} &nbsp;|&nbsp;
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} cases
              </span>
              <div className="mcn-pag-btns">
                <button
                  className="mcn-pag-btn"
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="mcn-pag-btn"
                  disabled={page >= totalPages}
                  onClick={() => load(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </MediatorLayout>
  );
};

export default MediatorNotes;
