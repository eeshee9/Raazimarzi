// src/pages/UserDocuments.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";
import api from "../api/axios";
import "./UserDocuments.css";
import {
  FaSearch,
  FaDownload,
  FaExpand,
  FaSearchPlus,
  FaSearchMinus,
  FaTimes,
  FaUpload,
  FaCheckCircle,
  FaTimesCircle,
  FaFileAlt,
  FaChevronRight,
  FaClock,
  FaIdCard,
  FaUser,
  FaCalendarAlt,
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaFile,
  FaFilePdf,
  FaFileImage,
  FaFileWord,
  FaEye,
  FaArrowLeft,
  FaFolderOpen,
  FaFileExport,
  FaFilter,
  FaSortAmountDown,
} from "react-icons/fa";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDateTime = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleString("en-IN", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

// ─── Status config ─────────────────────────────────────────────────────────────
const getStatusCfg = (rawStatus = "pending") => {
  const s = rawStatus.toLowerCase();
  if (s === "approved")
    return {
      badgeClass: "ud-badge ud-badge--approved",
      pillClass: "ud-pill ud-pill--approved",
      Icon: FaCheckCircle,
      text: "Approved",
      label: "APPROVED",
      chipClass: "ud-chip ud-chip--approved",
    };
  if (s === "rejected")
    return {
      badgeClass: "ud-badge ud-badge--rejected",
      pillClass: "ud-pill ud-pill--rejected",
      Icon: FaTimesCircle,
      text: "Rejected",
      label: "REJECTED",
      chipClass: "ud-chip ud-chip--rejected",
    };
  return {
    badgeClass: "ud-badge ud-badge--pending",
    pillClass: "ud-pill ud-pill--pending",
    Icon: FaClock,
    text: "Pending",
    label: "PENDING",
    chipClass: "ud-chip ud-chip--pending",
  };
};

// ─── File type icon ───────────────────────────────────────────────────────────
const FileTypeIcon = ({ fileName = "", type = "" }) => {
  const ext = (fileName.split(".").pop() || type || "").toLowerCase();
  if (ext === "pdf") return <FaFilePdf className="ud-ftype-icon ud-ftype-pdf" />;
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return <FaFileImage className="ud-ftype-icon ud-ftype-img" />;
  if (["doc", "docx"].includes(ext))
    return <FaFileWord className="ud-ftype-icon ud-ftype-doc" />;
  return <FaFile className="ud-ftype-icon ud-ftype-default" />;
};

// ─── File type badge ──────────────────────────────────────────────────────────
const FileTypeBadge = ({ fileName = "", type = "" }) => {
  const ext = (
    fileName.split(".").pop() ||
    type ||
    "file"
  )
    .toUpperCase()
    .slice(0, 5);
  const cls = {
    PDF: "ud-type-badge ud-type-badge--pdf",
    DOCX: "ud-type-badge ud-type-badge--docx",
    JPG: "ud-type-badge ud-type-badge--jpg",
    JPEG: "ud-type-badge ud-type-badge--jpg",
    PNG: "ud-type-badge ud-type-badge--png",
  }[ext] || "ud-type-badge ud-type-badge--default";
  return <span className={cls}>{ext}</span>;
};

// ─── Avatar initials ───────────────────────────────────────────────────────────
const Avatar = ({ name = "", src = null }) => (
  <div className="ud-avatar">
    {src ? (
      <img src={src} alt={name} className="ud-avatar-img" />
    ) : (
      (name || "?")
        .split(" ")
        .map((w) => w[0] || "")
        .join("")
        .slice(0, 2)
        .toUpperCase()
    )}
  </div>
);

// ─── Case role badge colors ────────────────────────────────────────────────────
const RoleBadge = ({ role = "" }) => {
  const r = role.toLowerCase();
  const cls =
    r === "petitioner"
      ? "ud-role-badge ud-role-badge--petitioner"
      : r === "respondent"
      ? "ud-role-badge ud-role-badge--respondent"
      : "ud-role-badge ud-role-badge--mediator";
  return <span className={cls}>{role}</span>;
};

// ─── Actions Menu ─────────────────────────────────────────────────────────────
/**
 * Per dev comment:
 *  - Pending  → Rename, Replace file, Delete
 *  - Approved → Rename, Delete
 *  - Rejected → 3-dot replaced by re-upload icon
 *  - File uploaded by Respondent or Mediator → 3-dot disabled (from petitioner view)
 */
const ActionsMenu = ({ doc, currentUserRole = "petitioner", onRename, onReplace, onDelete, onReupload }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const status = (doc.status || "pending").toLowerCase();
  const uploaderRole = (doc.uploaderRole || doc.uploadedByRole || "").toLowerCase();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Petitioner sees disabled 3-dot for respondent/mediator files
  const isOtherUploaded =
    currentUserRole === "petitioner" &&
    (uploaderRole === "respondent" || uploaderRole === "mediator");

  // Rejected → show re-upload icon instead of 3-dot
  if (status === "rejected") {
    return (
      <button
        className="ud-reupload-icon-btn"
        title="Re-upload document"
        onClick={onReupload}
      >
        <FaUpload />
      </button>
    );
  }

  return (
    <div className="ud-actions-wrap" ref={menuRef}>
      <button
        className={`ud-three-dot-btn ${isOtherUploaded ? "ud-three-dot-btn--disabled" : ""}`}
        onClick={() => !isOtherUploaded && setOpen((o) => !o)}
        title={isOtherUploaded ? "Actions not available for files uploaded by others" : "Actions"}
        disabled={isOtherUploaded}
      >
        <FaEllipsisV />
      </button>

      {open && (
        <div className="ud-actions-dropdown">
          {/* Rename — available for both pending and approved */}
          <button
            className="ud-actions-item"
            onClick={() => { setOpen(false); onRename && onRename(doc); }}
          >
            <FaEdit className="ud-actions-item-icon" />
            <span>Rename</span>
          </button>

          {/* Replace file — only for pending */}
          {status === "pending" && (
            <button
              className="ud-actions-item"
              onClick={() => { setOpen(false); onReplace && onReplace(doc); }}
            >
              <FaUpload className="ud-actions-item-icon" />
              <span>Re-place file</span>
            </button>
          )}

          {/* Delete — available for both pending and approved */}
          <button
            className="ud-actions-item ud-actions-item--danger"
            onClick={() => { setOpen(false); onDelete && onDelete(doc); }}
          >
            <FaTrash className="ud-actions-item-icon" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  DOCUMENT VIEWER
// ══════════════════════════════════════════════════════════════════════════════
const DocumentViewer = ({ doc, onBack }) => {
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const sc = getStatusCfg(doc.status || "pending");
  const url = doc.fileUrl || doc.previewUrl || null;
  const isRejected = (doc.status || "").toLowerCase() === "rejected";

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.fileName || "document";
    a.click();
  };

  const handleReupload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("documentId", doc._id);
      await api.post("/documents/reupload", form);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const PreviewContent = () => {
    if (!url) {
      return (
        <div className="ud-no-preview">
          <FaFileAlt className="ud-no-preview-icon" />
          <p>Preview not available</p>
          <span>Download to view this document</span>
        </div>
      );
    }
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return (
        <img src={url} alt={doc.fileName || "document"} className="ud-preview-img" />
      );
    }
    return (
      <iframe
        src={url}
        title={doc.fileName || "document"}
        className="ud-preview-frame"
      />
    );
  };

  return (
    <>
      {/* ── Viewer Header ── */}
      <div className="ud-viewer-header">
        <div className="ud-viewer-title-col">
          {onBack && (
            <button className="ud-back-btn" onClick={onBack}>
              <FaArrowLeft /> <span>Back</span>
            </button>
          )}
          <div className="ud-viewer-name-row">
            <h2 className="ud-viewer-name">{doc.fileName || "Document"}</h2>
            <span className={sc.badgeClass}>{sc.label}</span>
          </div>
          <div className="ud-viewer-meta">
            <FaIdCard className="ud-meta-icon" />
            <span>Case ID: #{doc.caseId || "—"}</span>
            <span className="ud-dot">•</span>
            <FaUser className="ud-meta-icon" />
            <span>
              {doc.uploadedBy || "—"}
              {doc.uploaderRole ? ` (${doc.uploaderRole})` : ""}
            </span>
            <span className="ud-dot">•</span>
            <FaCalendarAlt className="ud-meta-icon" />
            <span>{fmt(doc.createdAt || doc.uploadedAt)}</span>
          </div>
        </div>

        <div className="ud-viewer-actions">
          <div className="ud-zoom-group">
            <button
              className="ud-zoom-btn"
              onClick={() => setZoom((z) => Math.max(z - 25, 50))}
              title="Zoom out"
            >
              <FaSearchMinus />
            </button>
            <span className="ud-zoom-label">{zoom}%</span>
            <button
              className="ud-zoom-btn"
              onClick={() => setZoom((z) => Math.min(z + 25, 200))}
              title="Zoom in"
            >
              <FaSearchPlus />
            </button>
          </div>

          <button className="ud-fs-btn" onClick={() => setFullscreen(true)}>
            <FaExpand />
            <span>Fullscreen</span>
          </button>

          <button className="ud-dl-btn" onClick={handleDownload}>
            <FaDownload />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* ── Body: preview + side panel ── */}
      <div className="ud-viewer-body">
        {/* Preview pane */}
        <div className="ud-preview-pane">
          <div
            className="ud-preview-scroll"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
            }}
          >
            <PreviewContent />
          </div>
        </div>

        {/* Side panel */}
        <aside className="ud-side-panel">
          {/* Verification status */}
          <div className="ud-side-block">
            <p className="ud-side-label">VERIFICATION STATUS</p>
            <div className={sc.pillClass}>
              <sc.Icon />
              <span>{sc.text}</span>
            </div>
          </div>

          {/* Rejection reason */}
          {isRejected && doc.rejectionReason && (
            <div className="ud-side-block">
              <p className="ud-rejection-label">REJECTION REASON</p>
              <p className="ud-rejection-text">{doc.rejectionReason}</p>
            </div>
          )}

          {/* Audit trail */}
          {Array.isArray(doc.auditTrail) && doc.auditTrail.length > 0 && (
            <div className="ud-side-block">
              <p className="ud-audit-heading">Audit Trail</p>
              {doc.auditTrail.map((entry, i) => (
                <div key={i} className="ud-audit-row">
                  <Avatar name={entry.byName || "MK"} />
                  <div className="ud-audit-info">
                    <p className="ud-audit-action">
                      {entry.action} by <strong>{entry.byName}</strong>
                    </p>
                    <p className="ud-audit-time">{fmtDateTime(entry.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Re-upload button (rejected only) */}
          {isRejected && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={handleReupload}
              />
              <button
                className="ud-reupload-btn"
                onClick={() => fileRef.current && fileRef.current.click()}
                disabled={uploading}
              >
                <FaUpload />
                <span>{uploading ? "Uploading…" : "Re-upload Document"}</span>
              </button>
            </>
          )}
        </aside>
      </div>

      {/* ── Fullscreen overlay ── */}
      {fullscreen && (
        <div className="ud-fullscreen-overlay">
          <button className="ud-fs-close-btn" onClick={() => setFullscreen(false)}>
            <FaTimes />
          </button>
          <div className="ud-fs-content">
            <PreviewContent />
          </div>
        </div>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  CASE DOCUMENT LIST VIEW (inside a case folder)
// ══════════════════════════════════════════════════════════════════════════════
const CaseDocumentView = ({
  caseData,
  onBack,
  onViewDocument,
  currentUserRole = "petitioner",
}) => {
  const [search, setSearch] = useState("");
  const [filterUserType, setFilterUserType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterFileType, setFilterFileType] = useState("All Types");
  const [sortBy, setSortBy] = useState("Newest First");
  const [uploading, setUploading] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const fileRef = useRef(null);
  const replaceDocRef = useRef(null);
  const [replacingDoc, setReplacingDoc] = useState(null);

  const docs = caseData.documents || [];

  // Filter + sort
  const filtered = docs
    .filter((d) => {
      const q = search.toLowerCase();
      const matchSearch = (d.fileName || "").toLowerCase().includes(q);
      const matchUserType =
        filterUserType === "all" ||
        (d.uploaderRole || "").toLowerCase() === filterUserType;
      const matchStatus =
        filterStatus === "All Status" ||
        (d.status || "").toLowerCase() === filterStatus.toLowerCase();
      const ext = (d.fileName || "").split(".").pop().toUpperCase();
      const matchType =
        filterFileType === "All Types" ||
        ext === filterFileType.toUpperCase();
      return matchSearch && matchUserType && matchStatus && matchType;
    })
    .sort((a, b) => {
      const aDate = new Date(a.createdAt || a.uploadedAt || 0);
      const bDate = new Date(b.createdAt || b.uploadedAt || 0);
      if (sortBy === "Newest First") return bDate - aDate;
      if (sortBy === "Oldest First") return aDate - bDate;
      if (sortBy === "A - Z")
        return (a.fileName || "").localeCompare(b.fileName || "");
      if (sortBy === "Z - A")
        return (b.fileName || "").localeCompare(a.fileName || "");
      return 0;
    });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("caseId", caseData._id || caseData.caseId);
      await api.post("/documents/upload", form);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleReplace = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !replacingDoc) return;
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("documentId", replacingDoc._id);
      await api.post("/documents/replace", form);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Replace failed.");
    }
  };

  const handleRename = async (doc) => {
    const newName = window.prompt("Enter new file name:", doc.fileName);
    if (!newName || newName === doc.fileName) return;
    try {
      await api.patch(`/documents/${doc._id}/rename`, { fileName: newName });
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Rename failed.");
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/documents/${doc._id}`);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed.");
    }
  };

  const handleReupload = (doc) => {
    setReplacingDoc(doc);
    setTimeout(() => replaceDocRef.current && replaceDocRef.current.click(), 0);
  };

  return (
    <div className="ud-case-view">
      {/* ── Case Header ── */}
      <div className="ud-case-header">
        <div className="ud-case-header-left">
          <button className="ud-back-btn" onClick={onBack}>
            <FaArrowLeft /> <span>My Documents</span>
          </button>
          <div className="ud-case-title-row">
            <div className="ud-case-folder-icon">
              <FaFolderOpen />
            </div>
            <div>
              <h1 className="ud-case-title">{caseData.title || "Case Documents"}</h1>
              <div className="ud-case-meta">
                <span className="ud-case-id">#{caseData.caseNumber || caseData._id}</span>
                <span className="ud-dot">·</span>
                <span>{docs.length} files</span>
                <span className="ud-dot">·</span>
                <span>
                  <FaCalendarAlt style={{ marginRight: 4 }} />
                  Created on {fmt(caseData.createdAt)}
                </span>
                {caseData.status && (
                  <>
                    <span className="ud-dot">·</span>
                    <span className={`ud-chip ${getStatusCfg(caseData.status).chipClass}`}>
                      {caseData.status}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="ud-case-header-actions">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          <input
            ref={replaceDocRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            onChange={handleReplace}
          />
          <button
            className="ud-upload-doc-btn"
            onClick={() => fileRef.current && fileRef.current.click()}
            disabled={uploading}
          >
            <FaUpload />
            <span>{uploading ? "Uploading…" : "Upload Document"}</span>
          </button>
        </div>
      </div>

      {/* ── Filters row ── */}
      <div className="ud-filters-row">
        <div className="ud-search-wrap ud-search-wrap--inline">
          <FaSearch className="ud-search-icon" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ud-search-input"
          />
        </div>

        <select
          className="ud-filter-select"
          value={filterFileType}
          onChange={(e) => setFilterFileType(e.target.value)}
        >
          {["All Types", "PDF", "DOCX", "JPG", "PNG"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <select
          className="ud-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          {["All Status", "Approved", "Pending", "Rejected"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          className="ud-filter-select"
          value={filterUserType}
          onChange={(e) => setFilterUserType(e.target.value)}
        >
          {[
            { value: "all", label: "All" },
            { value: "petitioner", label: "Petitioner" },
            { value: "respondent", label: "Respondent" },
            { value: "mediator", label: "Mediator" },
          ].map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className="ud-filter-select ud-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {["Newest First", "Oldest First", "A - Z", "Z - A"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="ud-table-wrap">
        <table className="ud-table">
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
                <td colSpan={6} className="ud-table-empty">
                  <FaFileAlt />
                  <span>No documents found</span>
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const sc = getStatusCfg(d.status || "pending");
                return (
                  <tr key={d._id} className="ud-table-row">
                    <td className="ud-table-filename">
                      <FileTypeIcon fileName={d.fileName} />
                      <span>{d.fileName || "Document"}</span>
                    </td>
                    <td>
                      <FileTypeBadge fileName={d.fileName} type={d.fileType} />
                    </td>
                    <td className="ud-table-uploader">
                      <Avatar name={d.uploadedBy} src={d.uploaderAvatar} />
                      <div className="ud-uploader-info">
                        <span className="ud-uploader-name">{d.uploadedBy || "—"}</span>
                        {d.uploaderRole && (
                          <span className="ud-uploader-role">{d.uploaderRole}</span>
                        )}
                      </div>
                    </td>
                    <td className="ud-table-date">
                      <span>{fmt(d.createdAt || d.uploadedAt)}</span>
                      {d.uploadTime && (
                        <span className="ud-table-time">{d.uploadTime}</span>
                      )}
                    </td>
                    <td>
                      <span className={sc.badgeClass}>{sc.text}</span>
                    </td>
                    <td className="ud-table-actions">
                      <button
                        className="ud-action-icon-btn"
                        title="View"
                        onClick={() => onViewDocument(d)}
                      >
                        <FaEye />
                      </button>
                      <button className="ud-action-icon-btn" title="Download">
                        <FaDownload />
                      </button>
                      <ActionsMenu
                        doc={d}
                        currentUserRole={currentUserRole}
                        onRename={handleRename}
                        onReplace={(doc) => {
                          setReplacingDoc(doc);
                          setTimeout(
                            () =>
                              replaceDocRef.current &&
                              replaceDocRef.current.click(),
                            0
                          );
                        }}
                        onDelete={handleDelete}
                        onReupload={() => handleReupload(d)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Drag & drop upload zone ── */}
      <div className="ud-dropzone">
        <FaUpload className="ud-dropzone-icon" />
        <p className="ud-dropzone-title">Drag &amp; drop files here or click to upload</p>
        <p className="ud-dropzone-sub">
          Supported formats: PDF, DOC, DOCX, JPG, PNG (Max. 20MB). Your files are
          encrypted and securely stored in our legal vault.
        </p>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MY DOCUMENTS — CASE FOLDERS GRID
// ══════════════════════════════════════════════════════════════════════════════
const CASE_STATUS_CFG = {
  pending: { cls: "ud-case-status-badge ud-case-status-badge--pending", label: "Pending" },
  "in mediation": { cls: "ud-case-status-badge ud-case-status-badge--mediation", label: "In Mediation" },
  closed: { cls: "ud-case-status-badge ud-case-status-badge--closed", label: "Closed" },
  resolved: { cls: "ud-case-status-badge ud-case-status-badge--resolved", label: "Resolved" },
};

const CaseFolderCard = ({ caseData, onClick }) => {
  const s = (caseData.status || "pending").toLowerCase();
  const cfg = CASE_STATUS_CFG[s] || CASE_STATUS_CFG.pending;

  return (
    <div className="ud-folder-card" onClick={onClick}>
      <div className="ud-folder-icon-wrap">
        <div className="ud-folder-icon">
          <FaFolderOpen />
        </div>
      </div>
      <p className="ud-folder-name">{caseData.title || "Case Documents"}</p>
      <span className={cfg.cls}>{cfg.label}</span>
      <div className="ud-folder-meta">
        <span>
          <FaFileAlt style={{ marginRight: 4 }} />
          {caseData.fileCount || caseData.documents?.length || 0} files
        </span>
        <span>
          <FaClock style={{ marginRight: 4 }} />
          Updated {caseData.updatedAgo || fmt(caseData.updatedAt)}
        </span>
      </div>
    </div>
  );
};

const MyDocumentsDashboard = ({ cases = [], onOpenCase, fetching = false, fetchError = null, onRetry }) => {
  const [filterStatus, setFilterStatus] = useState("All Statuses");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterRole, setFilterRole] = useState("All Cases");
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef(null);

  const filtered = cases.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = (c.title || "").toLowerCase().includes(q);
    const matchStatus =
      filterStatus === "All Statuses" ||
      (c.status || "").toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const hasData = !fetching && cases.length > 0;

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) handleUploadFiles(files);
  };

  const handleUploadFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        await api.post("/documents/upload", form);
      }
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // ── EMPTY / FIRST-TIME STATE ──────────────────────────────────────
  // Show when not fetching AND no cases loaded (error or genuinely empty)
  if (!fetching && cases.length === 0) {
    return (
      <div className="ud-dashboard">
        <div className="ud-dashboard-header">
          <div>
            <h1 className="ud-dashboard-title">My Documents</h1>
            <p className="ud-dashboard-sub">
              All your case folders and documents in one place
            </p>
          </div>
        </div>

        {fetchError && (
          <div className="ud-inline-error">
            <span>⚠️ {fetchError}</span>
            <button className="ud-inline-retry-btn" onClick={onRetry}>Retry</button>
          </div>
        )}

        {/* Big upload prompt — matches Image 2 style */}
        <div
          className={`ud-empty-upload-zone ${dragging ? "ud-empty-upload-zone--drag" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => uploadRef.current && uploadRef.current.click()}
        >
          <input
            ref={uploadRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleUploadFiles(Array.from(e.target.files || []))}
          />
          <div className="ud-empty-upload-icon">
            <FaUpload />
          </div>
          <p className="ud-empty-upload-title">
            {uploading ? "Uploading…" : "Drag & drop files here or click to upload"}
          </p>
          <p className="ud-empty-upload-sub">
            Supported formats: PDF, DOC, DOCX, JPG, PNG (Max. 20MB).<br />
            Your files are encrypted and securely stored in our legal vault.
          </p>
          {!fetchError && (
            <p className="ud-empty-upload-hint">
              Documents filed with a case also appear here automatically.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ud-dashboard">
      {/* Header — only shown when there IS data */}
      <div className="ud-dashboard-header">
        <div>
          <h1 className="ud-dashboard-title">My Documents</h1>
          <p className="ud-dashboard-sub">
            All your case folders and documents in one place
          </p>
        </div>
        <button className="ud-export-btn">
          <FaFileExport />
          <span>Export as ZIP</span>
        </button>
      </div>

      {/* Inline fetch error banner — does NOT replace the page */}
      {fetchError && (
        <div className="ud-inline-error">
          <span>⚠️ {fetchError}</span>
          <button className="ud-inline-retry-btn" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="ud-dashboard-filters">
        <div className="ud-filter-group">
          <label className="ud-filter-label">STATUS</label>
          <select
            className="ud-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {["All Statuses", "Pending", "In Mediation", "Closed", "Resolved"].map(
              (s) => <option key={s}>{s}</option>
            )}
          </select>
        </div>

        <div className="ud-filter-group">
          <label className="ud-filter-label">CATEGORY</label>
          <select
            className="ud-filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {["All", "Property", "Family", "Business", "Employment"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="ud-filter-group">
          <label className="ud-filter-label">MY ROLE</label>
          <select
            className="ud-filter-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            {["All Cases", "Petitioner", "Respondent"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading shimmer */}
      {fetching && cases.length === 0 ? (
        <div className="ud-folder-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="ud-folder-card ud-folder-card--skeleton">
              <div className="ud-skeleton-icon" />
              <div className="ud-skeleton-line ud-skeleton-line--name" />
              <div className="ud-skeleton-line ud-skeleton-line--badge" />
              <div className="ud-skeleton-line ud-skeleton-line--meta" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ud-dashboard-empty">
          <FaFolderOpen className="ud-dashboard-empty-icon" />
          <p>No case folders match your filters</p>
        </div>
      ) : (
        <div className="ud-folder-grid">
          {filtered.map((c) => (
            <CaseFolderCard key={c._id} caseData={c} onClick={() => onOpenCase(c)} />
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const UserDocuments = () => {
  const navigate = useNavigate();

  // View states: "dashboard" | "caseDocuments" | "docViewer"
  const [view, setView] = useState("dashboard");
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  // loading is inline — never blocks the whole page
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Current logged-in user's role
  const currentUserRole = localStorage.getItem("userRole") || "petitioner";

  const fetchCases = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    setFetching(true);
    setFetchError(null);
    try {
      // Try the new endpoint first; fall back to the old one if 404
      let res;
      try {
        res = await api.get("/documents/my-cases");
      } catch (firstErr) {
        if (firstErr.response?.status === 404) {
          // Backend not yet updated — try old endpoint and reshape data
          const oldRes = await api.get("/documents/my-documents");
          const docs = Array.isArray(oldRes.data)
            ? oldRes.data
            : Array.isArray(oldRes.data?.documents)
            ? oldRes.data.documents
            : [];
          // Group flat documents into pseudo case-folders by caseId
          const byCase = {};
          docs.forEach((d) => {
            const key = d.caseId || "uncategorized";
            if (!byCase[key]) {
              byCase[key] = {
                _id: key,
                caseNumber: key,
                title: d.caseTitle || `Case #${key}`,
                status: d.caseStatus || "pending",
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
                documents: [],
              };
            }
            byCase[key].documents.push(d);
          });
          setCases(Object.values(byCase));
          return;
        }
        throw firstErr;
      }

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.cases)
        ? res.data.cases
        : [];
      setCases(data);
    } catch (err) {
      if (err.response?.status === 401) { navigate("/login"); return; }
      // Show inline error — dashboard still renders
      setFetchError(
        err.response?.data?.message ||
          err.message ||
          "Could not load case folders. Please retry."
      );
    } finally {
      setFetching(false);
    }
  }, [navigate]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleOpenCase = (caseData) => {
    setSelectedCase(caseData);
    setView("caseDocuments");
  };

  const handleViewDocument = (doc) => {
    setSelectedDoc(doc);
    setView("docViewer");
  };

  return (
    <div className="dashboard-container">
      <UserSidebar activePage="documents" />
      <main className="main-content ud-page">
        <UserNavbar />

        {/* ── Dashboard: case folders grid ── */}
        {view === "dashboard" && (
          <MyDocumentsDashboard
            cases={cases}
            onOpenCase={handleOpenCase}
            fetching={fetching}
            fetchError={fetchError}
            onRetry={fetchCases}
          />
        )}

        {/* ── Case document list ── */}
        {view === "caseDocuments" && selectedCase && (
          <CaseDocumentView
            caseData={selectedCase}
            onBack={() => setView("dashboard")}
            onViewDocument={handleViewDocument}
            currentUserRole={currentUserRole}
          />
        )}

        {/* ── Document viewer ── */}
        {view === "docViewer" && selectedDoc && (
          <div className="ud-viewer-page">
            <DocumentViewer
              doc={selectedDoc}
              onBack={() => setView("caseDocuments")}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default UserDocuments;