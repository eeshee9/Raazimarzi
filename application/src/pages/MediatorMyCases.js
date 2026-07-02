// src/pages/MediatorMyCases.js — Full end-to-end My Cases screen
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Download, ChevronLeft, ChevronRight,
  ChevronDown, X, RefreshCw, Briefcase,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorMyCases.css";

/* ── Filter option sets ── */
const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Assigned",    label: "Assigned" },
  { value: "Hearing",     label: "Hearing" },
  { value: "mediation",   label: "Mediation" },
  { value: "in-progress", label: "In Progress" },
  { value: "Pending",     label: "Pending" },
  { value: "Resolved",    label: "Resolved" },
  { value: "Closed",      label: "Closed" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "property",   label: "Property" },
  { value: "rental",     label: "Rental" },
  { value: "consumer",   label: "Consumer" },
  { value: "individual", label: "Individual" },
  { value: "commercial", label: "Commercial" },
];

const AMOUNT_OPTIONS = [
  { value: "",      label: "All Ranges",      min: "",      max: "" },
  { value: "u10k",  label: "Under ₹10,000",  min: "",      max: "10000" },
  { value: "10k50k",label: "₹10K – ₹50K",    min: "10000", max: "50000" },
  { value: "50k1l", label: "₹50K – ₹1L",     min: "50000", max: "100000" },
  { value: "o1l",   label: "Over ₹1L",        min: "100000",max: "" },
];

const ROWS_OPTIONS = [10, 25, 50];

/* ── Status badge config ── */
const STATUS_CFG = {
  "Pending":        { bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
  "pending-review": { bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
  "In Review":      { bg: "#EFF6FF", text: "#1D4ED8", dot: "#60A5FA" },
  "notice-sent":    { bg: "#EFF6FF", text: "#1D4ED8", dot: "#60A5FA" },
  "in-progress":    { bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6" },
  "Assigned":       { bg: "#FFF7ED", text: "#C2410C", dot: "#F97316" },
  "Hearing":        { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  "hearing":        { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  "mediation":      { bg: "#EEF2FF", text: "#4338CA", dot: "#6366F1" },
  "arbitration":    { bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6" },
  "Resolved":       { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  "resolved":       { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  "awarded":        { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  "Closed":         { bg: "#F9FAFB", text: "#6B7280", dot: "#9CA3AF" },
  "closed":         { bg: "#F9FAFB", text: "#6B7280", dot: "#9CA3AF" },
  "withdrawn":      { bg: "#F9FAFB", text: "#6B7280", dot: "#9CA3AF" },
  "Rejected":       { bg: "#FEF2F2", text: "#B91C1C", dot: "#EF4444" },
  "rejected":       { bg: "#FEF2F2", text: "#B91C1C", dot: "#EF4444" },
};
const getStatusCfg = (s) =>
  STATUS_CFG[s] || { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" };

/* ── Helpers ── */
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB") : "—";

const formatINR = (amount) =>
  amount && amount > 0
    ? `₹${Number(amount).toLocaleString("en-IN")} /-`
    : null;

const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const Sk = ({ w = "100%", h = 14, r = 6 }) => (
  <div className="mmyc-sk" style={{ width: w, height: h, borderRadius: r }} />
);

/* ════════════════════════════════════════
   COMPONENT
════════════════════════════════════════ */
const MediatorMyCases = () => {
  const navigate = useNavigate();

  /* ── Data ── */
  const [cases,     setCases]     = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [exporting, setExporting] = useState(false);

  /* ── Pagination / selection ── */
  const [page,         setPage]         = useState(1);
  const [rowsPerPage,  setRowsPerPage]  = useState(10);
  const [selectedRows, setSelectedRows] = useState(new Set());

  /* ── Filters ── */
  const [rawSearch, setRawSearch] = useState("");
  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState("");
  const [caseType,  setCaseType]  = useState("");
  const [amountKey, setAmountKey] = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => { setSearch(rawSearch); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [rawSearch]);

  /* ── Reset row selection on any filter/page change ── */
  useEffect(() => {
    setSelectedRows(new Set());
  }, [page, rowsPerPage, status, caseType, amountKey, dateFrom, dateTo, search]);

  /* ── Build query params ── */
  const buildParams = useCallback(
    (extra = {}) => {
      const amtOpt = AMOUNT_OPTIONS.find((o) => o.value === amountKey) || AMOUNT_OPTIONS[0];
      return {
        page, limit: rowsPerPage,
        ...(search      && { search }),
        ...(status      && { status }),
        ...(caseType    && { caseType }),
        ...(amtOpt.min  && { amountMin: amtOpt.min }),
        ...(amtOpt.max  && { amountMax: amtOpt.max }),
        ...(dateFrom    && { dateFrom }),
        ...(dateTo      && { dateTo }),
        ...extra,
      };
    },
    [page, rowsPerPage, search, status, caseType, amountKey, dateFrom, dateTo]
  );

  /* ── Fetch ── */
  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get("/mediator/cases", { params: buildParams() });
      setCases(res.data.cases  || []);
      setTotal(res.data.total  || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load cases. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  /* ── Export CSV ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axiosInstance.get("/mediator/cases", {
        params: buildParams({ exportAll: "true" }),
      });
      const rows = res.data.cases || [];
      if (!rows.length) { alert("No cases to export."); return; }

      const hdrs = ["Case ID", "Topic", "Category", "Petitioner", "Respondent",
                    "Mediator", "Status", "Fee (₹)", "Filed Date"];
      const csv = [
        hdrs.map(csvEscape).join(","),
        ...rows.map((c) => [
          csvEscape(c.caseId),
          csvEscape(c.caseTitle),
          csvEscape(c.caseType || ""),
          csvEscape(c.petitionerDetails?.fullName || c.claimant?.name || ""),
          csvEscape(c.respondent?.userId?.name || c.respondent?.name || ""),
          csvEscape(c.assignedNeutral?.name || c.assignedMediator?.name || ""),
          csvEscape(c.status),
          csvEscape(c.filingFee > 0 ? c.filingFee : (c.caseValue || "")),
          csvEscape(formatDate(c.createdAt)),
        ].join(",")),
      ].join("\n");

      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `mediator-cases-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  /* ── Filter helpers ── */
  const clearAll = () => {
    setStatus(""); setCaseType(""); setAmountKey("");
    setDateFrom(""); setDateTo(""); setRawSearch(""); setSearch(""); setPage(1);
  };

  const removeChip = (key) => {
    const resetPage = () => setPage(1);
    if (key === "status")    { setStatus("");    resetPage(); }
    if (key === "caseType")  { setCaseType("");  resetPage(); }
    if (key === "amount")    { setAmountKey(""); resetPage(); }
    if (key === "dateRange") { setDateFrom(""); setDateTo(""); resetPage(); }
  };

  const chips = [
    ...(status    ? [{ key: "status",    label: STATUS_OPTIONS.find((o) => o.value === status)?.label    || status }] : []),
    ...(caseType  ? [{ key: "caseType",  label: CATEGORY_OPTIONS.find((o) => o.value === caseType)?.label || caseType }] : []),
    ...(amountKey ? [{ key: "amount",    label: AMOUNT_OPTIONS.find((o) => o.value === amountKey)?.label  || amountKey }] : []),
    ...((dateFrom || dateTo) ? [{ key: "dateRange", label: `${formatDate(dateFrom) || "…"} – ${formatDate(dateTo) || "…"}` }] : []),
  ];

  /* ── Row selection ── */
  const toggleRow = (rowNum) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(rowNum) ? next.delete(rowNum) : next.add(rowNum);
      return next;
    });
  };

  /* ── Pagination math ── */
  const totalPages = Math.ceil(total / rowsPerPage) || 1;
  const startRow   = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const endRow     = Math.min(page * rowsPerPage, total);

  /* ── Topbar search slot ── */
  const topbarSearch = (
    <div className="mmyc-search-wrap">
      <Search size={15} className="mmyc-search-icon" />
      <input
        type="text"
        className="mmyc-search-input"
        placeholder="Search cases, participants or case ID…"
        value={rawSearch}
        onChange={(e) => setRawSearch(e.target.value)}
      />
      {rawSearch && (
        <button className="mmyc-search-clear" onClick={() => setRawSearch("")} aria-label="Clear search">
          <X size={13} />
        </button>
      )}
    </div>
  );

  /* ── Error state ── */
  if (error && !loading) {
    return (
      <MediatorLayout topbarLeft={topbarSearch}>
        <div className="mmyc-page">
          <div className="mmyc-error">
            <RefreshCw size={34} />
            <p>{error}</p>
            <button onClick={fetchCases}>Retry</button>
          </div>
        </div>
      </MediatorLayout>
    );
  }

  return (
    <MediatorLayout topbarLeft={topbarSearch}>
      <div className="mmyc-page">

        {/* ── Page header ── */}
        <div className="mmyc-header-row">
          <div>
            <h1 className="mmyc-title">All Cases</h1>
            <p className="mmyc-subtitle">Manage and track all disputes across the platform</p>
          </div>
          <button
            className="mmyc-export-btn"
            onClick={handleExport}
            disabled={exporting || loading || total === 0}
          >
            <Download size={15} />
            {exporting ? "Exporting…" : "Export as CSV"}
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="mmyc-filters-section">
          <div className="mmyc-filters-row">

            {/* Status */}
            <div className="mmyc-filter-group">
              <label className="mmyc-filter-label">STATUS</label>
              <div className="mmyc-select-wrap">
                <select
                  className="mmyc-select"
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="mmyc-select-icon" />
              </div>
            </div>

            {/* Category */}
            <div className="mmyc-filter-group">
              <label className="mmyc-filter-label">CATEGORY</label>
              <div className="mmyc-select-wrap">
                <select
                  className="mmyc-select"
                  value={caseType}
                  onChange={(e) => { setCaseType(e.target.value); setPage(1); }}
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="mmyc-select-icon" />
              </div>
            </div>

            {/* Amount */}
            <div className="mmyc-filter-group">
              <label className="mmyc-filter-label">AMOUNT</label>
              <div className="mmyc-select-wrap">
                <select
                  className="mmyc-select"
                  value={amountKey}
                  onChange={(e) => { setAmountKey(e.target.value); setPage(1); }}
                >
                  {AMOUNT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="mmyc-select-icon" />
              </div>
            </div>

            {/* Date Range */}
            <div className="mmyc-filter-group mmyc-date-group">
              <label className="mmyc-filter-label">DATE RANGE</label>
              <div className="mmyc-date-inputs">
                <input
                  type="date"
                  className="mmyc-date-input"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  title="From date"
                />
                <span className="mmyc-date-sep">–</span>
                <input
                  type="date"
                  className="mmyc-date-input"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  title="To date"
                />
              </div>
            </div>

            {/* Mediator — self-scoped view, not filterable */}
            <div className="mmyc-filter-group">
              <label className="mmyc-filter-label">MEDIATOR</label>
              <div className="mmyc-select-wrap">
                <select
                  className="mmyc-select"
                  disabled
                  title="Showing only your assigned cases"
                >
                  <option>Me (Yourself)</option>
                </select>
                <ChevronDown size={14} className="mmyc-select-icon" />
              </div>
            </div>

          </div>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="mmyc-chips-row">
              <span className="mmyc-chips-label">Active Filters:</span>
              {chips.map((chip) => (
                <span key={chip.key} className="mmyc-chip">
                  {chip.label}
                  <button
                    className="mmyc-chip-remove"
                    onClick={() => removeChip(chip.key)}
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <button className="mmyc-clear-all" onClick={clearAll}>Clear All</button>
            </div>
          )}
        </div>

        {/* ── Table card ── */}
        <div className="mmyc-table-card">
          {loading ? (
            <div className="mmyc-table-skeleton">
              {[...Array(rowsPerPage > 10 ? 10 : rowsPerPage)].map((_, i) => (
                <div key={i} className="mmyc-sk-row">
                  <Sk w={32} h={32} r={8} />
                  <Sk w="70px" />
                  <Sk w="130px" />
                  <Sk w="130px" />
                  <Sk w="100px" />
                  <Sk w="75px" h={24} r={20} />
                  <Sk w="80px" />
                  <Sk w="80px" />
                  <Sk w={80} h={30} r={8} />
                </div>
              ))}
            </div>
          ) : cases.length === 0 ? (
            <div className="mmyc-empty">
              <Briefcase size={40} />
              <p>
                {chips.length > 0 || search
                  ? "No cases match your current filters."
                  : "No cases assigned to you yet."}
              </p>
              {(chips.length > 0 || search) && (
                <button onClick={clearAll}>Clear Filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="mmyc-table-wrap">
                <table className="mmyc-table">
                  <thead>
                    <tr>
                      <th style={{ width: 46 }}></th>
                      <th>CASE ID</th>
                      <th>TOPIC</th>
                      <th>PARTICIPANTS</th>
                      <th>MEDIATOR</th>
                      <th>STATUS</th>
                      <th>FEE (₹)</th>
                      <th>FILED DATE</th>
                      <th style={{ width: 110 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c, idx) => {
                      const rowNum     = (page - 1) * rowsPerPage + idx + 1;
                      const isSelected = selectedRows.has(rowNum);
                      const stCfg      = getStatusCfg(c.status);
                      const petitioner = c.petitionerDetails?.fullName || c.claimant?.name || "—";
                      const respondent = c.respondent?.userId?.name || c.respondent?.name || "—";
                      const mediator   = c.assignedNeutral?.name || c.assignedMediator?.name || "—";
                      const fee        = formatINR(c.filingFee) || c.caseValue || "—";

                      return (
                        <tr
                          key={c._id}
                          className={isSelected ? "mmyc-row-selected" : ""}
                        >
                          <td>
                            <div
                              className={`mmyc-row-num${isSelected ? " mmyc-row-num-active" : ""}`}
                              onClick={() => toggleRow(rowNum)}
                              title="Click to select row"
                            >
                              {rowNum}
                            </div>
                          </td>
                          <td>
                            <span className="mmyc-case-id">{c.caseId}</span>
                          </td>
                          <td>
                            <span className="mmyc-topic">{c.caseTitle}</span>
                          </td>
                          <td>
                            <div className="mmyc-participants">
                              <p>
                                <span className="mmyc-part-role">(Petitioner)</span>
                                <br />{petitioner}
                              </p>
                              <p>
                                <span className="mmyc-part-role">(Respondent)</span>
                                <br />{respondent}
                              </p>
                            </div>
                          </td>
                          <td>
                            <span className="mmyc-mediator-name">{mediator}</span>
                          </td>
                          <td>
                            <span
                              className="mmyc-status-badge"
                              style={{ background: stCfg.bg, color: stCfg.text }}
                            >
                              <span className="mmyc-status-dot" style={{ background: stCfg.dot }} />
                              {c.status}
                            </span>
                          </td>
                          <td>
                            <span className="mmyc-fee">{fee}</span>
                          </td>
                          <td>
                            <span className="mmyc-date">{formatDate(c.createdAt)}</span>
                          </td>
                          <td>
                            <button
                              className="mmyc-view-btn"
                              onClick={() => navigate(`/mediator/cases/${c._id}`)}
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

              {/* ── Footer ── */}
              <div className="mmyc-footer">
                <div className="mmyc-footer-left">
                  <span>Rows per page:</span>
                  <div className="mmyc-select-wrap">
                    <select
                      className="mmyc-select mmyc-rpp-select"
                      value={rowsPerPage}
                      onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                    >
                      {ROWS_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="mmyc-select-icon" />
                  </div>
                </div>

                <div className="mmyc-footer-mid">
                  {selectedRows.size > 0 && (
                    <span>
                      Selected row(s) –{" "}
                      {[...selectedRows].sort((a, b) => a - b).join(", ")}
                    </span>
                  )}
                </div>

                <div className="mmyc-footer-right">
                  <span className="mmyc-range">
                    {startRow}–{endRow} of {total.toLocaleString()} case{total !== 1 ? "s" : ""}
                  </span>
                  <button
                    className="mmyc-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="mmyc-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </MediatorLayout>
  );
};

export default MediatorMyCases;
