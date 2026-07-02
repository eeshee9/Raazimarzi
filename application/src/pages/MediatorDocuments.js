// src/pages/MediatorDocuments.js — Mediator document folder grid
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderOpen, FileText, ChevronDown, X, Loader2, AlertCircle,
  RefreshCw, Clock,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorDocuments.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtRelative = (d) => {
  if (!d) return "—";
  const diffMs   = Date.now() - new Date(d).getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const STATUS_CFG = {
  "Pending":          { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  "pending":          { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  "pending-review":   { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  "In Mediation":     { bg: "#DBEAFE", color: "#1D4ED8", label: "In Mediation" },
  "mediation":        { bg: "#DBEAFE", color: "#1D4ED8", label: "In Mediation" },
  "Assigned":         { bg: "#EDE9FE", color: "#6D28D9", label: "Assigned" },
  "Closed":           { bg: "#F3F4F6", color: "#6B7280", label: "Closed" },
  "closed":           { bg: "#F3F4F6", color: "#6B7280", label: "Closed" },
  "Resolved":         { bg: "#D1FAE5", color: "#065F46", label: "Resolved" },
  "resolved":         { bg: "#D1FAE5", color: "#065F46", label: "Resolved" },
  "Rejected":         { bg: "#FEE2E2", color: "#991B1B", label: "Rejected" },
  "rejected":         { bg: "#FEE2E2", color: "#991B1B", label: "Rejected" },
  "in-progress":      { bg: "#FFF7ED", color: "#C2410C", label: "In Progress" },
};

const statusCfg = (s) => STATUS_CFG[s] || { bg: "#F3F4F6", color: "#6B7280", label: s || "Unknown" };

const CASE_TYPES = [
  { value: "", label: "All Categories" },
  { value: "property",   label: "Property" },
  { value: "rental",     label: "Rental" },
  { value: "consumer",   label: "Consumer" },
  { value: "individual", label: "Individual" },
  { value: "commercial", label: "Commercial" },
];

const CASE_STATUSES = [
  { value: "",            label: "All Statuses" },
  { value: "Assigned",    label: "Assigned" },
  { value: "mediation",   label: "In Mediation" },
  { value: "Resolved",    label: "Resolved" },
  { value: "Closed",      label: "Closed" },
  { value: "Rejected",    label: "Rejected" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="mdd-filter-wrap">
    <span className="mdd-filter-label">{label}</span>
    <div className="mdd-select-wrap">
      <select
        className="mdd-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="mdd-select-icon" />
    </div>
  </div>
);

const FolderCard = ({ folder, onClick }) => {
  const cfg = statusCfg(folder.status);
  return (
    <button className="mdd-folder-card" onClick={onClick}>
      <div className="mdd-folder-illus">
        <div className="mdd-folder-icon-wrap">
          <FolderOpen size={40} className="mdd-folder-icon" />
        </div>
      </div>
      <div className="mdd-folder-info">
        <p className="mdd-folder-title">
          {folder.caseTitle || "Untitled Case"}
        </p>
        <div className="mdd-folder-meta-row">
          <span className="mdd-folder-id">#{folder.caseId}</span>
          <span
            className="mdd-folder-status"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
        <div className="mdd-folder-bottom">
          <span className="mdd-folder-files">
            <FileText size={12} />
            {folder.documentCount} {folder.documentCount === 1 ? "file" : "files"}
          </span>
          <span className="mdd-folder-updated">
            <Clock size={11} />
            Updated {fmtRelative(folder.lastDocumentAt)}
          </span>
        </div>
      </div>
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const MediatorDocuments = () => {
  const navigate = useNavigate();

  const [folders, setFolders]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter]   = useState("");

  const activeFilters = [
    statusFilter && { key: "status", label: CASE_STATUSES.find(s => s.value === statusFilter)?.label || statusFilter },
    typeFilter   && { key: "type",   label: CASE_TYPES.find(t => t.value === typeFilter)?.label || typeFilter },
  ].filter(Boolean);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter)   params.set("caseType", typeFilter);
      const { data } = await axiosInstance.get(`/mediator/documents?${params}`);
      setFolders(data.folders || []);
    } catch {
      setError("Failed to load document folders. Tap to retry.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const clearFilter = (key) => {
    if (key === "status") setStatusFilter("");
    if (key === "type")   setTypeFilter("");
  };

  return (
    <MediatorLayout>
      <div className="mdd-page">
        {/* Page header */}
        <div className="mdd-page-header">
          <div>
            <h1 className="mdd-page-title">All Documents</h1>
            <p className="mdd-page-sub">All your case folders and documents in one place</p>
          </div>
          <button className="mdd-refresh-btn" onClick={load} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Filter bar */}
        <div className="mdd-filter-bar">
          <FilterSelect
            label="STATUS"
            value={statusFilter}
            onChange={setStatusFilter}
            options={CASE_STATUSES}
          />
          <FilterSelect
            label="CATEGORY"
            value={typeFilter}
            onChange={setTypeFilter}
            options={CASE_TYPES}
          />
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="mdd-active-filters">
            <span className="mdd-af-label">Active Filters:</span>
            {activeFilters.map((f) => (
              <button
                key={f.key}
                className="mdd-af-chip"
                onClick={() => clearFilter(f.key)}
              >
                {f.label} <X size={11} />
              </button>
            ))}
            <button
              className="mdd-af-clear"
              onClick={() => { setStatusFilter(""); setTypeFilter(""); }}
            >
              Clear All
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="mdd-state">
            <Loader2 size={28} className="mdd-spin" />
            <span>Loading case folders…</span>
          </div>
        ) : error ? (
          <div className="mdd-state mdd-state--error">
            <AlertCircle size={24} />
            <span>{error}</span>
            <button className="mdd-retry-btn" onClick={load}>Retry</button>
          </div>
        ) : folders.length === 0 ? (
          <div className="mdd-state mdd-state--empty">
            <FolderOpen size={40} />
            <span>
              {activeFilters.length > 0
                ? "No folders match the selected filters"
                : "No document folders yet. Documents will appear once parties submit them on your assigned cases."}
            </span>
          </div>
        ) : (
          <div className="mdd-grid">
            {folders.map((f) => (
              <FolderCard
                key={f._id}
                folder={f}
                onClick={() => navigate(`/mediator/documents/case/${f._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </MediatorLayout>
  );
};

export default MediatorDocuments;
