// src/pages/UserDocuments.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
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
} from "react-icons/fa";

// ─── Decode JWT to get current user ID ────────────────────────────────────────
const getTokenUserId = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id || payload._id || payload.userId || null;
  } catch {
    return null;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtTime = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

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

// Map system user role to display label
const displayRole = (role = "") => {
  const map = {
    user: "Petitioner",
    mediator: "Mediator",
    arbitrator: "Arbitrator",
    "case-manager": "Case Manager",
    admin: "Admin",
  };
  return map[role.toLowerCase()] || role;
};

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
  const ext = (fileName.split(".").pop() || type || "file")
    .toUpperCase()
    .slice(0, 5);
  const cls =
    {
      PDF: "ud-type-badge ud-type-badge--pdf",
      DOCX: "ud-type-badge ud-type-badge--docx",
      DOC: "ud-type-badge ud-type-badge--docx",
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

// ─── Rename Modal ─────────────────────────────────────────────────────────────
const RenameModal = ({ doc, onConfirm, onCancel }) => {
  const [name, setName] = useState(doc?.fileName || doc?.documentTitle || "");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== (doc?.fileName || doc?.documentTitle || "")) {
      onConfirm(doc, trimmed);
    }
  };

  return (
    <div className="ud-modal-overlay" onClick={onCancel}>
      <div className="ud-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ud-modal-header">
          <h3 className="ud-modal-title">Rename Document</h3>
          <button className="ud-modal-close-btn" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>
        <p className="ud-modal-sub">Enter a new name for this document</p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="ud-modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Document name"
            maxLength={200}
          />
          <div className="ud-modal-actions">
            <button type="button" className="ud-modal-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="ud-modal-confirm"
              disabled={!name.trim() || name.trim() === (doc?.fileName || "")}
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Actions Menu ─────────────────────────────────────────────────────────────
const ActionsMenu = ({
  doc,
  currentUserId,
  onRename,
  onReplace,
  onDelete,
  onReupload,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const status = (doc.status || "pending").toLowerCase();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isOwnFile =
    doc.uploadedById && currentUserId && doc.uploadedById === currentUserId;

  if (!isOwnFile) {
    return (
      <button
        className="ud-three-dot-btn ud-three-dot-btn--disabled"
        disabled
        title="Actions not available for files uploaded by others"
      >
        <FaEllipsisV />
      </button>
    );
  }

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
        className="ud-three-dot-btn"
        onClick={() => setOpen((o) => !o)}
        title="Actions"
      >
        <FaEllipsisV />
      </button>

      {open && (
        <div className="ud-actions-dropdown">
          <button
            className="ud-actions-item"
            onClick={() => { setOpen(false); onRename && onRename(doc); }}
          >
            <FaEdit className="ud-actions-item-icon" />
            <span>Rename</span>
          </button>

          {status === "pending" && (
            <button
              className="ud-actions-item"
              onClick={() => { setOpen(false); onReplace && onReplace(doc); }}
            >
              <FaUpload className="ud-actions-item-icon" />
              <span>Re-place file</span>
            </button>
          )}

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
  const [url, setUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const fileRef = useRef(null);

  const sc = getStatusCfg(doc.status || "pending");
  const isRejected = (doc.status || "").toLowerCase() === "rejected";

  // Objects are private — fetch a short-lived presigned URL for preview.
  useEffect(() => {
    let active = true;
    setPreviewLoading(true);
    api.get(`/documents/${doc._id}/download`)
      .then((res) => { if (active) setUrl(res.data?.downloadUrl || null); })
      .catch(() => { if (active) setUrl(null); })
      .finally(() => { if (active) setPreviewLoading(false); });
    return () => { active = false; };
  }, [doc._id]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleDownload = async () => {
    try {
      const res = await api.get(`/documents/${doc._id}/download`);
      if (res.data?.downloadUrl) {
        const a = document.createElement("a");
        a.href = res.data.downloadUrl;
        a.download = res.data.fileName || doc.fileName || "document";
        a.click();
      }
    } catch {
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.fileName || "document";
        a.click();
      }
    }
  };

  const handleReupload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("documentId", doc._id);
      await api.patch(`/documents/${doc._id}/replace`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const PreviewContent = () => {
    if (previewLoading) {
      return (
        <div className="ud-no-preview">
          <p>Loading preview…</p>
        </div>
      );
    }
    if (!url) {
      return (
        <div className="ud-no-preview">
          <FaFileAlt className="ud-no-preview-icon" />
          <p>Preview not available</p>
          <span>Download to view this document</span>
        </div>
      );
    }
    // Presigned URLs carry a query string, so sniff the file type from
    // metadata rather than matching an extension at the end of the URL.
    const isImage =
      (doc.mimeType || "").startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.fileExtension || doc.fileName || "");
    if (isImage) {
      return (
        <img src={url} alt={doc.fileName || "document"} className="ud-preview-img" />
      );
    }
    return (
      <iframe src={url} title={doc.fileName || "document"} className="ud-preview-frame" />
    );
  };

  return (
    <div className={`ud-viewer-wrap${fullscreen ? " ud-viewer-wrap--fs" : ""}`}>
      {!fullscreen && (
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
                {doc.uploaderRole
                  ? ` (${displayRole(doc.uploaderRole)})`
                  : ""}
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
      )}

      <div className="ud-viewer-body">
        <div className="ud-preview-pane">
          {fullscreen && (
            <button
              className="ud-fs-close-inline"
              onClick={() => setFullscreen(false)}
              title="Exit fullscreen (Esc)"
            >
              <FaTimes />
            </button>
          )}
          <div
            className="ud-preview-scroll"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          >
            <PreviewContent />
          </div>
        </div>

        {!fullscreen && (
          <aside className="ud-side-panel">
            <div className="ud-side-block">
              <p className="ud-side-label">VERIFICATION STATUS</p>
              <div className={sc.pillClass}>
                <sc.Icon />
                <span>{sc.text}</span>
              </div>
            </div>

            {isRejected && doc.rejectionReason && (
              <div className="ud-side-block">
                <p className="ud-rejection-label">REJECTION REASON</p>
                <p className="ud-rejection-text">{doc.rejectionReason}</p>
              </div>
            )}

            {Array.isArray(doc.auditTrail) && doc.auditTrail.length > 0 && (
              <div className="ud-side-block">
                <p className="ud-audit-heading">Audit Trail</p>
                {doc.auditTrail.map((entry, i) => (
                  <div key={i} className="ud-audit-row">
                    <Avatar name={entry.byName || "?"} />
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

            {isRejected && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
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
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  CASE DOCUMENT LIST VIEW
// ══════════════════════════════════════════════════════════════════════════════
const CaseDocumentView = ({
  caseData,
  onBack,
  onViewDocument,
  currentUserId = "",
}) => {
  const [search, setSearch] = useState("");
  const [filterUserType, setFilterUserType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterFileType, setFilterFileType] = useState("All Types");
  const [sortBy, setSortBy] = useState("Newest First");
  const [uploading, setUploading] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [replacingDoc, setReplacingDoc] = useState(null);
  const fileRef = useRef(null);
  const replaceDocRef = useRef(null);

  const docs = caseData.documents || [];

  const filtered = docs
    .filter((d) => {
      const q = search.toLowerCase();
      const matchSearch = (d.fileName || "").toLowerCase().includes(q);
      const matchUserType =
        filterUserType === "all" ||
        (d.uploaderRole || "").toLowerCase() === filterUserType ||
        displayRole(d.uploaderRole || "").toLowerCase() === filterUserType;
      const matchStatus =
        filterStatus === "All Status" ||
        (d.status || "").toLowerCase() === filterStatus.toLowerCase();
      const ext = (d.fileName || "").split(".").pop().toUpperCase();
      const matchType =
        filterFileType === "All Types" || ext === filterFileType.toUpperCase();
      return matchSearch && matchUserType && matchStatus && matchType;
    })
    .sort((a, b) => {
      const aDate = new Date(a.createdAt || a.uploadedAt || 0);
      const bDate = new Date(b.createdAt || b.uploadedAt || 0);
      if (sortBy === "Newest First") return bDate - aDate;
      if (sortBy === "Oldest First") return aDate - bDate;
      if (sortBy === "A - Z") return (a.fileName || "").localeCompare(b.fileName || "");
      if (sortBy === "Z - A") return (b.fileName || "").localeCompare(a.fileName || "");
      return 0;
    });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("caseId", caseData._id);
      form.append("documentTitle", file.name.replace(/\.[^/.]+$/, "") || file.name);
      form.append("category", "Evidence");
      await api.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
      await api.post("/documents/replace", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Replace failed.");
    }
  };

  // Opens inline rename modal instead of window.prompt()
  const handleRename = (doc) => setRenamingDoc(doc);

  const handleRenameConfirm = async (doc, newName) => {
    setRenamingDoc(null);
    try {
      await api.patch(`/documents/${doc._id}/rename`, { documentTitle: newName });
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

  const caseStatusCfg = getStatusCfg(caseData.status || "pending");

  const capitalize = (s = "") =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  return (
    <div className="ud-case-view">
      {/* Rename modal */}
      {renamingDoc && (
        <RenameModal
          doc={renamingDoc}
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenamingDoc(null)}
        />
      )}

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
                <span className="ud-case-id">
                  #{caseData.caseNumber || caseData._id}
                </span>
                <span className="ud-dot">·</span>
                <span>
                  <FaFileAlt style={{ marginRight: 4 }} />
                  {docs.length} files
                </span>
                <span className="ud-dot">·</span>
                <span>
                  <FaCalendarAlt style={{ marginRight: 4 }} />
                  Created on {fmt(caseData.createdAt)}
                </span>
                {caseData.status && (
                  <>
                    <span className="ud-dot">·</span>
                    <span className={caseStatusCfg.chipClass}>
                      {capitalize(caseData.status)}
                    </span>
                  </>
                )}
              </div>
              <p className="ud-case-description">
                This folder contains all documents related to this case
              </p>
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
          {["All Types", "PDF", "DOCX", "DOC", "JPG", "PNG"].map((t) => (
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

        <div className="ud-sort-group">
          <span className="ud-sort-label">Sort by:</span>
          <select
            className="ud-filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {["Newest First", "Oldest First", "A - Z", "Z - A"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
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
                const ts = d.createdAt || d.uploadedAt;
                return (
                  <tr key={d._id} className="ud-table-row">
                    <td className="ud-table-filename">
                      <FileTypeIcon fileName={d.fileName} />
                      <span title={d.fileName}>{d.fileName || "Document"}</span>
                    </td>
                    <td>
                      <FileTypeBadge fileName={d.fileName} type={d.fileType} />
                    </td>
                    <td className="ud-table-uploader">
                      <Avatar name={d.uploadedBy} src={d.uploaderAvatar} />
                      <div className="ud-uploader-info">
                        <span className="ud-uploader-name">{d.uploadedBy || "—"}</span>
                        {d.uploaderRole && (
                          <span className="ud-uploader-role">
                            {displayRole(d.uploaderRole)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="ud-table-date">
                      <span>{fmt(ts)}</span>
                      {ts && (
                        <span className="ud-table-time">{fmtTime(ts)}</span>
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
                      <button
                        className="ud-action-icon-btn"
                        title="Download"
                        onClick={async () => {
                          try {
                            const res = await api.get(`/documents/${d._id}/download`);
                            if (res.data?.downloadUrl) {
                              const a = document.createElement("a");
                              a.href = res.data.downloadUrl;
                              a.download = res.data.fileName || d.fileName || "document";
                              a.click();
                            }
                          } catch (err) {
                            alert(err.response?.data?.message || "Download failed.");
                          }
                        }}
                      >
                        <FaDownload />
                      </button>
                      <ActionsMenu
                        doc={d}
                        currentUserId={currentUserId}
                        onRename={handleRename}
                        onReplace={(doc) => {
                          setReplacingDoc(doc);
                          setTimeout(
                            () => replaceDocRef.current && replaceDocRef.current.click(),
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
      <div
        className="ud-dropzone"
        onClick={() => fileRef.current && fileRef.current.click()}
      >
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
  pending: {
    cls: "ud-case-status-badge ud-case-status-badge--pending",
    label: "Pending",
  },
  "in mediation": {
    cls: "ud-case-status-badge ud-case-status-badge--mediation",
    label: "In Mediation",
  },
  closed: {
    cls: "ud-case-status-badge ud-case-status-badge--closed",
    label: "Closed",
  },
  resolved: {
    cls: "ud-case-status-badge ud-case-status-badge--resolved",
    label: "Resolved",
  },
};

const CaseFolderCard = ({ caseData, onClick }) => {
  const s = (caseData.status || "pending").toLowerCase();
  const cfg = CASE_STATUS_CFG[s] || CASE_STATUS_CFG.pending;

  return (
    <div className="ud-folder-card" onClick={onClick}>
      <div className="ud-folder-illus">
        <div className="ud-folder-illus-inner">
          <FaFolderOpen className="ud-folder-illus-icon" />
        </div>
      </div>
      <p className="ud-folder-name" title={caseData.title}>
        {caseData.title || "Case Documents"}
      </p>
      {caseData.caseNumber && (
        <span className="ud-folder-case-id">#{caseData.caseNumber}</span>
      )}
      <span className={cfg.cls}>{cfg.label}</span>
      <div className="ud-folder-meta">
        <span>
          <FaFileAlt style={{ marginRight: 4 }} />
          {caseData.fileCount ?? caseData.documents?.length ?? 0} files
        </span>
        <span>
          <FaClock style={{ marginRight: 4 }} />
          Updated {caseData.updatedAgo || fmt(caseData.updatedAt)}
        </span>
      </div>
    </div>
  );
};

// ── My Documents Dashboard ────────────────────────────────────────────────────
const MyDocumentsDashboard = ({
  cases = [],
  onOpenCase,
  fetching = false,
  fetchError = null,
  onRetry,
}) => {
  const [filterStatus, setFilterStatus] = useState("All Statuses");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterRole, setFilterRole] = useState("All Cases");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const filtered = cases.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = (c.title || "").toLowerCase().includes(q);

    const matchStatus =
      filterStatus === "All Statuses" ||
      (c.status || "").toLowerCase() === filterStatus.toLowerCase();

    // CATEGORY filters by caseType field
    const matchCategory =
      filterCategory === "All" ||
      (c.caseType || "").toLowerCase().includes(filterCategory.toLowerCase());

    // MY ROLE filters by myRole field returned from backend
    const matchRole =
      filterRole === "All Cases" ||
      (c.myRole || "petitioner").toLowerCase() === filterRole.toLowerCase();

    // DATE RANGE filters by createdAt
    const cDate = c.createdAt ? new Date(c.createdAt) : null;
    const matchDateFrom = !dateFrom || !cDate || cDate >= new Date(dateFrom);
    const matchDateTo =
      !dateTo || !cDate || cDate <= new Date(dateTo + "T23:59:59");

    return matchSearch && matchStatus && matchCategory && matchRole && matchDateFrom && matchDateTo;
  });

  const hasActiveFilters =
    filterStatus !== "All Statuses" ||
    filterCategory !== "All" ||
    filterRole !== "All Cases" ||
    dateFrom ||
    dateTo;

  const clearFilters = () => {
    setFilterStatus("All Statuses");
    setFilterCategory("All");
    setFilterRole("All Cases");
    setDateFrom("");
    setDateTo("");
  };

  if (!fetching && cases.length === 0) {
    return (
      <div className="ud-dashboard">
        <div className="ud-dashboard-header">
          <div>
            <h1 className="ud-dashboard-title">My Documents</h1>
            <p className="ud-dashboard-sub">All your case folders and documents in one place</p>
          </div>
        </div>

        {fetchError && (
          <div className="ud-inline-error">
            <span>⚠️ {fetchError}</span>
            <button className="ud-inline-retry-btn" onClick={onRetry}>Retry</button>
          </div>
        )}

        {!fetchError && (
          <div className="ud-no-cases-state">
            <FaFolderOpen className="ud-no-cases-icon" />
            <p className="ud-no-cases-title">No cases yet</p>
            <p className="ud-no-cases-sub">
              Your documents will appear here once you file a case.
            </p>
            <Link to="/user/file-new-case/step1" className="ud-file-case-btn">
              File a New Case
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ud-dashboard">
      <div className="ud-dashboard-header">
        <div>
          <h1 className="ud-dashboard-title">My Documents</h1>
          <p className="ud-dashboard-sub">All your case folders and documents in one place</p>
        </div>
      </div>

      {fetchError && (
        <div className="ud-inline-error">
          <span>⚠️ {fetchError}</span>
          <button className="ud-inline-retry-btn" onClick={onRetry}>Retry</button>
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
            {["All Statuses", "Pending", "In Mediation", "Closed", "Resolved"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="ud-filter-group">
          <label className="ud-filter-label">CATEGORY</label>
          <select
            className="ud-filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {["All", "Property", "Family", "Business", "Employment", "Civil", "Criminal"].map(
              (s) => <option key={s}>{s}</option>
            )}
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

        <div className="ud-filter-group">
          <label className="ud-filter-label">DATE RANGE</label>
          <div className="ud-date-range">
            <input
              type="date"
              className="ud-filter-select ud-date-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From date"
            />
            <span className="ud-date-sep">—</span>
            <input
              type="date"
              className="ud-filter-select ud-date-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="ud-active-filters">
          <span className="ud-active-filters-label">Active Filters:</span>
          {filterStatus !== "All Statuses" && (
            <span className="ud-filter-chip">
              {filterStatus}
              <button className="ud-filter-chip-x" onClick={() => setFilterStatus("All Statuses")}>×</button>
            </span>
          )}
          {filterCategory !== "All" && (
            <span className="ud-filter-chip">
              {filterCategory}
              <button className="ud-filter-chip-x" onClick={() => setFilterCategory("All")}>×</button>
            </span>
          )}
          {filterRole !== "All Cases" && (
            <span className="ud-filter-chip">
              {filterRole}
              <button className="ud-filter-chip-x" onClick={() => setFilterRole("All Cases")}>×</button>
            </span>
          )}
          {dateFrom && (
            <span className="ud-filter-chip">
              From {dateFrom}
              <button className="ud-filter-chip-x" onClick={() => setDateFrom("")}>×</button>
            </span>
          )}
          {dateTo && (
            <span className="ud-filter-chip">
              To {dateTo}
              <button className="ud-filter-chip-x" onClick={() => setDateTo("")}>×</button>
            </span>
          )}
          <button className="ud-clear-filters-btn" onClick={clearFilters}>
            Clear All
          </button>
        </div>
      )}

      {fetching && cases.length === 0 ? (
        <div className="ud-folder-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="ud-folder-card ud-folder-card--skeleton">
              <div className="ud-skeleton-illus" />
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
  const [view, setView] = useState("dashboard");
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const currentUserId = getTokenUserId() || localStorage.getItem("userId") || "";

  const fetchCases = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    setFetching(true);
    setFetchError(null);
    try {
      const res = await api.get("/documents/my-cases");
      const data = Array.isArray(res.data?.cases)
        ? res.data.cases
        : Array.isArray(res.data)
        ? res.data
        : [];
      setCases(data);
    } catch (err) {
      if (err.response?.status === 401) { navigate("/login"); return; }
      setFetchError(
        err.response?.data?.message || err.message || "Could not load case folders. Please retry."
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

        {view === "dashboard" && (
          <MyDocumentsDashboard
            cases={cases}
            onOpenCase={handleOpenCase}
            fetching={fetching}
            fetchError={fetchError}
            onRetry={fetchCases}
          />
        )}

        {view === "caseDocuments" && selectedCase && (
          <CaseDocumentView
            caseData={selectedCase}
            onBack={() => setView("dashboard")}
            onViewDocument={handleViewDocument}
            currentUserId={currentUserId}
          />
        )}

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
