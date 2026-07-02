// src/pages/MediatorCaseDocs.js — Document table for a single case (mediator view)
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FolderOpen, FileText, Search, ChevronDown,
  Eye, Download, Loader2, AlertCircle, Archive,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorDocuments.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const EXT_COLORS = {
  pdf:  { bg: "#FEE2E2", color: "#991B1B" },
  doc:  { bg: "#DBEAFE", color: "#1D4ED8" },
  docx: { bg: "#DBEAFE", color: "#1D4ED8" },
  xls:  { bg: "#D1FAE5", color: "#065F46" },
  xlsx: { bg: "#D1FAE5", color: "#065F46" },
  jpg:  { bg: "#FEF3C7", color: "#92400E" },
  jpeg: { bg: "#FEF3C7", color: "#92400E" },
  png:  { bg: "#FEF3C7", color: "#92400E" },
};
const extCfg = (ext) => {
  const k = (ext || "").replace(".", "").toLowerCase();
  return EXT_COLORS[k] || { bg: "#F3F4F6", color: "#6B7280" };
};

const DOC_STATUS_CFG = {
  "Approved":       { bg: "#D1FAE5", color: "#065F46" },
  "Pending Review": { bg: "#FEF3C7", color: "#92400E" },
  "Rejected":       { bg: "#FEE2E2", color: "#991B1B" },
  "Flagged":        { bg: "#FFF7ED", color: "#C2410C" },
};
const docStatusCfg = (s) =>
  DOC_STATUS_CFG[s] || { bg: "#F3F4F6", color: "#6B7280" };

const CASE_STATUS_CFG = {
  "Assigned":     { bg: "#EDE9FE", color: "#6D28D9" },
  "mediation":    { bg: "#DBEAFE", color: "#1D4ED8" },
  "In Mediation": { bg: "#DBEAFE", color: "#1D4ED8" },
  "Resolved":     { bg: "#D1FAE5", color: "#065F46" },
  "Closed":       { bg: "#F3F4F6", color: "#6B7280" },
  "Rejected":     { bg: "#FEE2E2", color: "#991B1B" },
};
const caseStatusCfg = (s) =>
  CASE_STATUS_CFG[s] || { bg: "#F3F4F6", color: "#6B7280" };

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name",   label: "File Name A-Z" },
];

// ─── Component ────────────────────────────────────────────────────────────────

const MediatorCaseDocs = () => {
  const { caseId } = useParams();
  const navigate   = useNavigate();

  const [caseInfo,   setCaseInfo]   = useState(null);
  const [documents,  setDocuments]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [downloading, setDownloading] = useState(null);

  // Filters
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy,     setSortBy]     = useState("newest");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseRes, docsRes] = await Promise.all([
        axiosInstance.get(`/mediator/cases/${caseId}`),
        axiosInstance.get(`/documents/case/${caseId}`),
      ]);
      setCaseInfo(caseRes.data);
      setDocuments(docsRes.data.documents || []);
    } catch {
      setError("Failed to load documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (doc) => {
    if (downloading) return;
    setDownloading(doc._id);
    try {
      const { data } = await axiosInstance.get(`/documents/${doc._id}/download`);
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank", "noopener");
      }
    } catch {
      // silent — presigned URL fetch failure
    } finally {
      setDownloading(null);
    }
  };

  // All unique extensions for the type filter
  const allExts = [...new Set(documents.map((d) => d.fileExtension).filter(Boolean))].sort();

  // Client-side filter + sort
  const filtered = documents
    .filter((d) => {
      const q = search.toLowerCase();
      if (search && !d.documentTitle?.toLowerCase().includes(q) && !d.originalFileName?.toLowerCase().includes(q)) return false;
      if (typeFilter && d.fileExtension !== typeFilter) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "name")   return (a.documentTitle || "").localeCompare(b.documentTitle || "");
      return 0;
    });

  const caseCfg = caseInfo ? caseStatusCfg(caseInfo.status) : null;

  return (
    <MediatorLayout>
      <div className="mdd-page">

        {/* Back button */}
        <button className="mdd-back-btn" onClick={() => navigate("/mediator/documents")}>
          <ArrowLeft size={16} /> Back to All Documents
        </button>

        {loading ? (
          <div className="mdd-state">
            <Loader2 size={28} className="mdd-spin" />
            <span>Loading case documents…</span>
          </div>
        ) : error ? (
          <div className="mdd-state mdd-state--error">
            <AlertCircle size={24} />
            <span>{error}</span>
            <button className="mdd-retry-btn" onClick={load}>Retry</button>
          </div>
        ) : (
          <>
            {/* Case header */}
            <div className="mdd-case-header">
              <div className="mdd-case-header-icon">
                <FolderOpen size={32} className="mdd-folder-icon" />
              </div>
              <div className="mdd-case-header-info">
                <h1 className="mdd-case-title">
                  {caseInfo?.caseTitle || "Case Documents"}
                </h1>
                <div className="mdd-case-header-meta">
                  <span className="mdd-folder-id">#{caseInfo?.caseId}</span>
                  {caseCfg && (
                    <span
                      className="mdd-folder-status"
                      style={{ background: caseCfg.bg, color: caseCfg.color }}
                    >
                      {caseInfo.status}
                    </span>
                  )}
                  <span className="mdd-case-meta-item">
                    <FileText size={13} />
                    {documents.length} {documents.length === 1 ? "document" : "documents"}
                  </span>
                  {caseInfo?.createdAt && (
                    <span className="mdd-case-meta-item">
                      Filed {fmtDate(caseInfo.createdAt)}
                    </span>
                  )}
                </div>
              </div>
              <button className="mdd-zip-btn" disabled title="ZIP export not available">
                <Archive size={14} /> Export ZIP
              </button>
            </div>

            {/* Filter bar */}
            <div className="mdd-doc-filter-bar">
              <div className="mdd-search-wrap">
                <Search size={14} className="mdd-search-icon" />
                <input
                  className="mdd-search-input"
                  placeholder="Search documents…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="mdd-select-wrap">
                <select
                  className="mdd-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  {allExts.map((ext) => (
                    <option key={ext} value={ext}>{ext.replace(".", "").toUpperCase()}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="mdd-select-icon" />
              </div>

              <div className="mdd-select-wrap">
                <select
                  className="mdd-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Flagged">Flagged</option>
                </select>
                <ChevronDown size={14} className="mdd-select-icon" />
              </div>

              <div className="mdd-select-wrap">
                <select
                  className="mdd-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="mdd-select-icon" />
              </div>
            </div>

            {/* Document table */}
            {filtered.length === 0 ? (
              <div className="mdd-state mdd-state--empty">
                <FileText size={36} />
                <span>
                  {documents.length === 0
                    ? "No documents have been submitted for this case yet."
                    : "No documents match the current filters."}
                </span>
              </div>
            ) : (
              <div className="mdd-table-wrap">
                <table className="mdd-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Type</th>
                      <th>Uploaded By</th>
                      <th>Date Uploaded</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((doc) => {
                      const ext  = (doc.fileExtension || "").replace(".", "").toUpperCase() || "FILE";
                      const eCfg = extCfg(doc.fileExtension);
                      const sCfg = docStatusCfg(doc.status);
                      return (
                        <tr key={doc._id} className="mdd-table-row">
                          <td className="mdd-td-name">
                            <FileText size={15} className="mdd-td-file-icon" />
                            <span className="mdd-td-title">{doc.documentTitle || doc.originalFileName}</span>
                            {doc.originalFileName && doc.documentTitle !== doc.originalFileName && (
                              <span className="mdd-td-orig">{doc.originalFileName}</span>
                            )}
                          </td>
                          <td>
                            <span className="mdd-type-badge" style={{ background: eCfg.bg, color: eCfg.color }}>
                              {ext}
                            </span>
                          </td>
                          <td className="mdd-td-uploader">
                            <span className="mdd-uploader-name">{doc.uploadedBy?.name || "—"}</span>
                            <span className="mdd-uploader-role">{doc.uploadedBy?.role || ""}</span>
                          </td>
                          <td className="mdd-td-date">{fmtDate(doc.createdAt)}</td>
                          <td>
                            <span
                              className="mdd-folder-status"
                              style={{ background: sCfg.bg, color: sCfg.color }}
                            >
                              {doc.status || "—"}
                            </span>
                          </td>
                          <td>
                            <div className="mdd-actions">
                              <button
                                className="mdd-action-btn"
                                title="View document"
                                onClick={() => navigate(`/mediator/documents/file/${doc._id}`)}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                className="mdd-action-btn"
                                title="Download document"
                                disabled={downloading === doc._id}
                                onClick={() => handleDownload(doc)}
                              >
                                {downloading === doc._id
                                  ? <Loader2 size={15} className="mdd-spin" />
                                  : <Download size={15} />
                                }
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </MediatorLayout>
  );
};

export default MediatorCaseDocs;
