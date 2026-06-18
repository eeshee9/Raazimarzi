// src/pages/AdminDocuments.js  — adoc- namespace
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell, FaSearch, FaDownload, FaFolderOpen,
  FaFileAlt, FaClock, FaSync,
} from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminDocuments.css";

/* ─── Helpers ─────────────────────────────────────────────────── */
const timeAgo = (d) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
};

const normCaseStatus = (s = "") => {
  const l = (s || "").toLowerCase().replace(/-/g, " ").trim();
  if (["mediation","arbitration","hearing","in progress","assigned","in-progress"].some(k => l.includes(k))) return "mediation";
  if (l === "resolved" || l === "awarded") return "resolved";
  if (l === "closed"   || l === "withdrawn") return "closed";
  if (l === "rejected") return "rejected";
  return "pending";
};

const CASE_STATUS_CFG = {
  pending:   { cls: "adoc-status adoc-status--pending",   label: "Pending" },
  mediation: { cls: "adoc-status adoc-status--mediation", label: "In Mediation" },
  resolved:  { cls: "adoc-status adoc-status--resolved",  label: "Resolved" },
  closed:    { cls: "adoc-status adoc-status--closed",    label: "Closed" },
  rejected:  { cls: "adoc-status adoc-status--rejected",  label: "Rejected" },
};

const FILTER_STATUS_MAP = {
  "All Statuses": null,
  "Pending":      "pending",
  "In Mediation": "mediation",
  "Resolved":     "resolved",
  "Closed":       "closed",
};

const groupByCase = (docs) => {
  const map = {};
  docs.forEach((doc) => {
    const c = doc.caseId;
    if (!c || !c._id) return;
    const key = c._id.toString();
    if (!map[key]) {
      map[key] = {
        _id:        c._id,
        caseNumber: c.caseId    || "—",
        title:      c.caseTitle || "Case",
        status:     normCaseStatus(c.status),
        caseType:   c.caseType  || "",
        createdAt:  c.createdAt,
        updatedAt:  c.updatedAt || doc.createdAt,
        fileCount:  0,
      };
    }
    map[key].fileCount++;
    if (doc.createdAt > map[key].updatedAt) map[key].updatedAt = doc.createdAt;
  });
  return Object.values(map).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

/* ─── Folder Card ────────────────────────────────────────────── */
const FolderCard = ({ folder, onClick }) => {
  const cfg = CASE_STATUS_CFG[folder.status] || CASE_STATUS_CFG.pending;
  return (
    <div className="adoc-folder-card" onClick={onClick}>
      <div className="adoc-folder-illus">
        <div className="adoc-folder-illus-inner">
          <FaFolderOpen className="adoc-folder-illus-icon" />
          <div className="adoc-folder-page adoc-folder-page--1" />
          <div className="adoc-folder-page adoc-folder-page--2" />
        </div>
      </div>
      <div className="adoc-folder-info">
        <p className="adoc-folder-name" title={folder.title}>
          {folder.title}
        </p>
        <span className="adoc-folder-caseid">#{folder.caseNumber}</span>
        <span className={cfg.cls}>{cfg.label}</span>
        <div className="adoc-folder-meta">
          <span className="adoc-meta-item">
            <FaFileAlt className="adoc-meta-icon" /> {folder.fileCount} files
          </span>
          <span className="adoc-meta-item">
            <FaClock className="adoc-meta-icon" /> Updated {timeAgo(folder.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const AdminDocuments = () => {
  const navigate = useNavigate();

  const [folders,      setFolders]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [filterStatus, setFilterStatus] = useState("All Statuses");
  const [filterCat,    setFilterCat]    = useState("All");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  const adminName   = localStorage.getItem("name") || "Admin";
  const adminAvatar = localStorage.getItem("avatar") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await api.get("/documents/all");
      const docs = res.data.documents || [];
      setFolders(groupByCase(docs));
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchAll();
  }, [navigate, fetchAll]);

  const filtered = folders.filter((f) => {
    const statusKey = FILTER_STATUS_MAP[filterStatus];
    const mSt  = !statusKey || f.status === statusKey;
    const mCat = filterCat === "All" ||
      (f.caseType || "").toLowerCase().includes(filterCat.toLowerCase()) ||
      (f.title    || "").toLowerCase().includes(filterCat.toLowerCase());
    const fDate  = f.updatedAt ? new Date(f.updatedAt) : null;
    const mFrom  = !dateFrom || !fDate || fDate >= new Date(dateFrom);
    const mTo    = !dateTo   || !fDate || fDate <= new Date(dateTo + "T23:59:59");
    return mSt && mCat && mFrom && mTo;
  });

  const activeChips = [
    filterStatus !== "All Statuses" && { label: filterStatus, clear: () => setFilterStatus("All Statuses") },
    filterCat    !== "All"          && { label: filterCat,    clear: () => setFilterCat("All") },
    dateFrom && { label: `From ${dateFrom}`, clear: () => setDateFrom("") },
    dateTo   && { label: `To ${dateTo}`,     clear: () => setDateTo("") },
  ].filter(Boolean);

  const clearAll = () => {
    setFilterStatus("All Statuses");
    setFilterCat("All");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="adoc-root">
      <AdminSidebar />
      <div className="adoc-main">

        {/* Topbar */}
        <header className="adoc-topbar">
          <div className="adoc-search">
            <FaSearch className="adoc-search-icon" />
            <input className="adoc-search-input" placeholder="Search cases, mediators or files…" readOnly />
          </div>
          <div className="adoc-topbar-right">
            <button className="adoc-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="adoc-admin-avatar" />
          </div>
        </header>

        <div className="adoc-body">

          {/* Page header */}
          <div className="adoc-page-header">
            <div>
              <h2 className="adoc-page-title">All Documents</h2>
              <p className="adoc-page-sub">All your case folders and documents in one place</p>
            </div>
            <div className="adoc-header-actions">
              <button className="adoc-refresh-btn" onClick={fetchAll} title="Refresh">
                <FaSync />
              </button>
              <button
                className="adoc-export-btn"
                disabled
                title="Export as ZIP is not available in this version"
              >
                <FaDownload /> Export as ZIP
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="adoc-filters">
            <div className="adoc-filter-group">
              <label className="adoc-filter-lbl">STATUS</label>
              <select
                className="adoc-filter-sel"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                {Object.keys(FILTER_STATUS_MAP).map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="adoc-filter-group">
              <label className="adoc-filter-lbl">CATEGORY</label>
              <select
                className="adoc-filter-sel"
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
              >
                {["All","Property","Family","Business","Employment","Civil","Consumer"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="adoc-filter-group">
              <label className="adoc-filter-lbl">DATE RANGE</label>
              <div className="adoc-date-range">
                <input
                  type="date"
                  className="adoc-date-input"
                  value={dateFrom}
                  placeholder="dd/mm/yyyy"
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <span className="adoc-date-sep">—</span>
                <input
                  type="date"
                  className="adoc-date-input"
                  value={dateTo}
                  placeholder="dd/mm/yyyy"
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="adoc-filter-group">
              <label className="adoc-filter-lbl">MEDIATOR</label>
              <select className="adoc-filter-sel" disabled title="Mediator filter not available">
                <option>All Status</option>
              </select>
            </div>
          </div>

          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="adoc-chips-row">
              <span className="adoc-chips-lbl">Active Filters:</span>
              {activeChips.map((c, i) => (
                <span key={i} className="adoc-chip">
                  {c.label}
                  <button className="adoc-chip-x" onClick={c.clear}>×</button>
                </span>
              ))}
              <button className="adoc-clear-all" onClick={clearAll}>Clear All</button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="adoc-error-row">
              <span>{error}</span>
              <button onClick={fetchAll}>Retry</button>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="adoc-folder-grid">
              {[1,2,3,4,5,6,7,8,9,10].map((i) => (
                <div key={i} className="adoc-folder-card adoc-folder-card--skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="adoc-empty">
              <FaFolderOpen className="adoc-empty-icon" />
              <p>{folders.length === 0
                ? "No documents found. Upload documents via case files."
                : "No folders match your current filters."
              }</p>
            </div>
          ) : (
            <div className="adoc-folder-grid">
              {filtered.map((f) => (
                <FolderCard
                  key={f._id?.toString()}
                  folder={f}
                  onClick={() =>
                    navigate(`/admin/documents/folder/${f._id}`, {
                      state: {
                        caseTitle:  f.title,
                        caseNumber: f.caseNumber,
                        caseStatus: f.status,
                        fileCount:  f.fileCount,
                        createdAt:  f.createdAt,
                      },
                    })
                  }
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDocuments;
