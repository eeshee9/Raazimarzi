// src/pages/AdminDocumentFolder.js  — adf- namespace
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FaBell, FaSearch, FaFolderOpen, FaFileAlt, FaCalendarAlt,
  FaChevronDown, FaEye, FaDownload, FaArrowLeft, FaSync,
  FaFilePdf, FaFileImage, FaFileWord, FaFile,
} from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminDocumentFolder.css";

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null;
const fmtDate2 = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

const normDocStatus = (s = "") => {
  const l = (s || "").toLowerCase();
  if (l === "approved")  return "approved";
  if (l === "rejected")  return "rejected";
  return "pending";
};

const DOC_STATUS_CFG = {
  approved: { cls: "adf-status adf-status--approved", label: "Approved" },
  pending:  { cls: "adf-status adf-status--pending",  label: "Pending"  },
  rejected: { cls: "adf-status adf-status--rejected", label: "Rejected" },
};

const CASE_STATUS_CFG = {
  pending:   { cls: "adf-case-status adf-case-status--pending",   label: "Pending" },
  mediation: { cls: "adf-case-status adf-case-status--mediation", label: "In Mediation" },
  resolved:  { cls: "adf-case-status adf-case-status--resolved",  label: "Resolved" },
  closed:    { cls: "adf-case-status adf-case-status--closed",    label: "Closed" },
  rejected:  { cls: "adf-case-status adf-case-status--rejected",  label: "Rejected" },
};

const getExt = (d) =>
  ((d.originalFileName || d.documentTitle || "").split(".").pop() || "").toUpperCase().slice(0, 5) || "FILE";

const FileTypeIcon = ({ doc }) => {
  const ext = getExt(doc).toLowerCase();
  if (ext === "pdf")  return <FaFilePdf   className="adf-file-icon adf-file-icon--pdf" />;
  if (["jpg","jpeg","png","gif","webp"].includes(ext))
    return <FaFileImage className="adf-file-icon adf-file-icon--img" />;
  if (["doc","docx"].includes(ext))
    return <FaFileWord  className="adf-file-icon adf-file-icon--doc" />;
  return <FaFile className="adf-file-icon" />;
};

const TypeBadge = ({ doc }) => {
  const ext = getExt(doc);
  const cls = { PDF:"adf-type--pdf", DOCX:"adf-type--docx", DOC:"adf-type--docx",
    JPG:"adf-type--jpg", JPEG:"adf-type--jpg", PNG:"adf-type--png" }[ext] || "adf-type--default";
  return <span className={`adf-type-badge ${cls}`}>{ext}</span>;
};

const initials = (name = "") => (name || "?").split(" ").map(w => w[0] || "").join("").slice(0,2).toUpperCase();

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const AdminDocumentFolder = () => {
  const { caseId }  = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();

  // Case meta passed from AdminDocuments via navigation state
  const caseInfo = location.state || {};
  const caseTitle  = caseInfo.caseTitle  || "Case Documents";
  const caseNumber = caseInfo.caseNumber || "—";
  const caseStatus = caseInfo.caseStatus || "pending";
  const caseCreatedAt = caseInfo.createdAt;

  const [docs,        setDocs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [filterType,  setFilterType]  = useState("All Types");
  const [filterStatus,setFilterStatus]= useState("All Status");
  const [filterAll,   setFilterAll]   = useState("All");
  const [sortBy,      setSortBy]      = useState("Newest First");

  const adminName   = localStorage.getItem("name") || "Admin";
  const adminAvatar = localStorage.getItem("avatar") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`;

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await api.get(`/documents/case/${caseId}`);
      setDocs(res.data.documents || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchDocs();
  }, [navigate, fetchDocs]);

  const filtered = docs
    .filter((d) => {
      const name   = (d.documentTitle || d.originalFileName || "").toLowerCase();
      const q      = search.toLowerCase();
      const ms     = !search || name.includes(q);
      const ext    = getExt(d);
      const mType  = filterType === "All Types" || ext === filterType.toUpperCase();
      const status = normDocStatus(d.status);
      const mSt    = filterStatus === "All Status" || status === filterStatus.toLowerCase();
      return ms && mType && mSt;
    })
    .sort((a, b) => {
      const ad = new Date(a.createdAt || 0);
      const bd = new Date(b.createdAt || 0);
      if (sortBy === "Newest First") return bd - ad;
      if (sortBy === "Oldest First") return ad - bd;
      const an = (a.documentTitle || a.originalFileName || "");
      const bn = (b.documentTitle || b.originalFileName || "");
      if (sortBy === "A - Z") return an.localeCompare(bn);
      if (sortBy === "Z - A") return bn.localeCompare(an);
      return 0;
    });

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc._id}/download`);
      if (res.data?.downloadUrl) {
        const a = document.createElement("a");
        a.href = res.data.downloadUrl;
        a.download = res.data.fileName || doc.originalFileName || "document";
        a.click();
      }
    } catch (e) {
      alert(e.response?.data?.message || "Download failed.");
    }
  };

  const caseCfg = CASE_STATUS_CFG[caseStatus] || CASE_STATUS_CFG.pending;

  return (
    <div className="adf-root">
      <AdminSidebar />
      <div className="adf-main">

        {/* Topbar */}
        <header className="adf-topbar">
          <div className="adf-search">
            <FaSearch className="adf-search-icon" />
            <input className="adf-search-input" placeholder="Search cases, mediators or files…" readOnly />
          </div>
          <div className="adf-topbar-right">
            <button className="adf-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="adf-admin-avatar" />
          </div>
        </header>

        <div className="adf-body">

          {/* Case header card */}
          <div className="adf-case-header">
            <button className="adf-back-btn" onClick={() => navigate("/admin/documents")}>
              <FaArrowLeft /> All Documents
            </button>
            <div className="adf-case-header-inner">
              <div className="adf-folder-thumb">
                <FaFolderOpen className="adf-folder-thumb-icon" />
              </div>
              <div className="adf-case-info">
                <h2 className="adf-case-title">{caseTitle}</h2>
                <div className="adf-case-meta">
                  <span className="adf-case-id">#{caseNumber}</span>
                  <span className="adf-dot">·</span>
                  <FaFileAlt className="adf-meta-icon" />
                  <span>{docs.length} files</span>
                  <span className="adf-dot">·</span>
                  <FaCalendarAlt className="adf-meta-icon" />
                  <span>Created on {fmtDate2(caseCreatedAt)}</span>
                  <span className="adf-dot">·</span>
                  <span className={caseCfg.cls}>{caseCfg.label}</span>
                </div>
                <p className="adf-case-desc">This folder contains all documents related to this case</p>
              </div>
              <button className="adf-refresh-btn" onClick={fetchDocs} title="Refresh">
                <FaSync />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="adf-error-row">
              <span>{error}</span>
              <button onClick={fetchDocs}>Retry</button>
            </div>
          )}

          {/* Filter toolbar */}
          <div className="adf-toolbar">
            <div className="adf-search-wrap">
              <FaSearch className="adf-toolbar-search-icon" />
              <input
                className="adf-toolbar-search"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="adf-toolbar-selects">
              <div className="adf-sel-wrap">
                <select
                  className="adf-sel"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  {["All Types","PDF","DOCX","DOC","JPG","PNG"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <FaChevronDown className="adf-sel-caret" />
              </div>

              <div className="adf-sel-wrap">
                <select
                  className="adf-sel"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  {["All Status","Approved","Pending","Rejected"].map((s) => <option key={s}>{s}</option>)}
                </select>
                <FaChevronDown className="adf-sel-caret" />
              </div>

              <div className="adf-sel-wrap">
                <select
                  className="adf-sel"
                  value={filterAll}
                  onChange={(e) => setFilterAll(e.target.value)}
                >
                  {["All","Petitioner","Respondent","Mediator"].map((s) => <option key={s}>{s}</option>)}
                </select>
                <FaChevronDown className="adf-sel-caret" />
              </div>

              <div className="adf-sort-group">
                <span className="adf-sort-lbl">Sort by:</span>
                <div className="adf-sel-wrap">
                  <select
                    className="adf-sel adf-sel--sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {["Newest First","Oldest First","A - Z","Z - A"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <FaChevronDown className="adf-sel-caret" />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="adf-table-wrap">
            {loading ? (
              <div className="adf-table-empty">Loading documents…</div>
            ) : (
              <table className="adf-table">
                <thead>
                  <tr>
                    <th>FILE NAME</th>
                    <th>TYPE</th>
                    <th>UPLOADED BY</th>
                    <th>DATE UPLOADED</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="adf-table-empty">
                        {docs.length === 0 ? "No documents in this folder." : "No documents match your filters."}
                      </td>
                    </tr>
                  ) : filtered.map((d) => {
                    const st  = normDocStatus(d.status);
                    const cfg = DOC_STATUS_CFG[st] || DOC_STATUS_CFG.pending;
                    const ts  = d.createdAt;
                    const uploaderName = d.uploadedBy?.name || "—";
                    const uploaderRole = (() => {
                      const r = (d.uploadedBy?.role || "").toLowerCase();
                      const roleMap = { user:"Petitioner", mediator:"Mediator", arbitrator:"Arbitrator", "case-manager":"Case Manager", admin:"Admin" };
                      return roleMap[r] || "";
                    })();
                    return (
                      <tr key={d._id} className="adf-table-row">
                        <td className="adf-col-name">
                          <FileTypeIcon doc={d} />
                          <span title={d.documentTitle || d.originalFileName}>
                            {d.documentTitle || d.originalFileName || "Document"}
                          </span>
                        </td>
                        <td><TypeBadge doc={d} /></td>
                        <td className="adf-col-uploader">
                          <div className="adf-avatar">{initials(uploaderName)}</div>
                          <div className="adf-uploader-info">
                            <span className="adf-uploader-name">{uploaderName}</span>
                            {uploaderRole && <span className="adf-uploader-role">{uploaderRole}</span>}
                          </div>
                        </td>
                        <td className="adf-col-date">
                          <span>{fmt(ts)}</span>
                          {ts && <span className="adf-time">{fmtTime(ts)}</span>}
                        </td>
                        <td><span className={cfg.cls}>{cfg.label}</span></td>
                        <td className="adf-col-actions">
                          <button
                            className="adf-action-btn"
                            title="View document"
                            onClick={() => navigate(`/admin/documents/view/${d._id}`, {
                              state: {
                                caseTitle,
                                caseNumber,
                                folderId: caseId,
                              },
                            })}
                          >
                            <FaEye />
                          </button>
                          <button
                            className="adf-action-btn"
                            title="Download"
                            onClick={() => handleDownload(d)}
                          >
                            <FaDownload />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDocumentFolder;
