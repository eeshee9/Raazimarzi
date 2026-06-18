// src/pages/AdminDocumentViewer.js  — adv- namespace
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FaBell, FaSearch, FaDownload, FaExpand, FaSearchPlus, FaSearchMinus,
  FaTimes, FaCheckCircle, FaTimesCircle, FaClock, FaArrowLeft,
  FaFileAlt, FaFilePdf, FaFileImage, FaFileWord, FaFile,
  FaIdCard, FaUser, FaCalendarAlt,
} from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import "./AdminDocumentViewer.css";

/* ─── Helpers ─────────────────────────────────────────────────── */
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }) : "—";

const normStatus = (s = "") => {
  const l = (s || "").toLowerCase();
  if (l === "approved") return "approved";
  if (l === "rejected") return "rejected";
  return "pending";
};

const roleDisplay = (role = "") => {
  const map = { user:"Petitioner", mediator:"Mediator", arbitrator:"Arbitrator",
    "case-manager":"Case Manager", admin:"Admin" };
  return map[(role || "").toLowerCase()] || role || "";
};

const initials = (name = "") =>
  (name || "?").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0,2).toUpperCase();

const STATUS_CFG = {
  approved: {
    badgeClass: "adv-badge adv-badge--approved",
    pillClass:  "adv-pill adv-pill--approved",
    Icon: FaCheckCircle,
    label: "APPROVED",
    text: "Approved",
  },
  rejected: {
    badgeClass: "adv-badge adv-badge--rejected",
    pillClass:  "adv-pill adv-pill--rejected",
    Icon: FaTimesCircle,
    label: "REJECTED",
    text: "Rejected",
  },
  pending: {
    badgeClass: "adv-badge adv-badge--pending",
    pillClass:  "adv-pill adv-pill--pending",
    Icon: FaClock,
    label: "PENDING",
    text: "Pending",
  },
};

/* ─── Preview component ──────────────────────────────────────── */
const PreviewContent = ({ doc, zoom, url, loading }) => {
  const mime = (doc.mimeType || "").toLowerCase();
  const ext  = (doc.fileExtension || "").toLowerCase().replace(".", "");

  if (loading) {
    return (
      <div className="adv-no-preview">
        <p>Loading preview…</p>
      </div>
    );
  }

  const isImage = mime.startsWith("image/") || ["jpg","jpeg","png","gif","webp"].includes(ext);
  const isPdf   = mime === "application/pdf" || ext === "pdf";
  const isDocx  = ["doc","docx"].includes(ext);

  const style = { transform: `scale(${zoom / 100})`, transformOrigin: "top center" };

  if (!url) {
    return (
      <div className="adv-no-preview">
        <FaFileAlt className="adv-no-preview-icon" />
        <p>Preview not available</p>
        <span>Download to view this document</span>
      </div>
    );
  }

  if (isImage) {
    return (
      <div style={style}>
        <img src={url} alt={doc.documentTitle || "document"} className="adv-preview-img" />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div style={{ ...style, height: "100%" }}>
        <iframe
          src={url}
          title={doc.documentTitle || "document"}
          className="adv-preview-frame"
        />
      </div>
    );
  }

  if (isDocx) {
    return (
      <div className="adv-no-preview">
        <FaFileWord className="adv-no-preview-icon" style={{ color: "#2563eb" }} />
        <p>Word Document</p>
        <span>Download to view this document</span>
      </div>
    );
  }

  return (
    <div className="adv-no-preview">
      <FaFile className="adv-no-preview-icon" />
      <p>Preview not available for this file type</p>
      <span>Use the Download button to access this file</span>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const AdminDocumentViewer = () => {
  const { documentId } = useParams();
  const navigate        = useNavigate();
  const location        = useLocation();

  const backInfo = location.state || {};
  const folderId   = backInfo.folderId;
  const caseTitle  = backInfo.caseTitle;
  const caseNumber = backInfo.caseNumber;

  const [doc,           setDoc]           = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [previewUrl,        setPreviewUrl]        = useState(null);
  const [previewUrlLoading, setPreviewUrlLoading] = useState(true);
  const [zoom,          setZoom]          = useState(100);
  const [fullscreen,    setFullscreen]    = useState(false);
  const [approving,     setApproving]     = useState(false);
  const [rejectOpen,    setRejectOpen]    = useState(false);
  const [rejectReason,  setRejectReason]  = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const adminName   = localStorage.getItem("name") || "Admin";
  const adminAvatar = localStorage.getItem("avatar") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`;

  const fetchDoc = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/documents/${documentId}`);
      setDoc(res.data.document);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load document.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchDoc();
  }, [navigate, fetchDoc]);

  // Objects are private — fetch a short-lived presigned URL for preview.
  useEffect(() => {
    if (!documentId) return;
    let active = true;
    setPreviewUrlLoading(true);
    api.get(`/documents/${documentId}/download`)
      .then((res) => { if (active) setPreviewUrl(res.data?.downloadUrl || null); })
      .catch(() => { if (active) setPreviewUrl(null); })
      .finally(() => { if (active) setPreviewUrlLoading(false); });
    return () => { active = false; };
  }, [documentId]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleDownload = async () => {
    if (!doc) return;
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

  const handleApprove = async () => {
    if (!doc) return;
    setActionLoading(true);
    setApproving(true);
    try {
      await api.patch(`/documents/${doc._id}/approve`);
      await fetchDoc();
    } catch (e) {
      alert(e.response?.data?.message || "Approval failed.");
    } finally {
      setActionLoading(false);
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!doc || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await api.patch(`/documents/${doc._id}/reject`, { reason: rejectReason.trim() });
      setRejectOpen(false);
      setRejectReason("");
      await fetchDoc();
    } catch (e) {
      alert(e.response?.data?.message || "Rejection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    if (folderId) {
      navigate(`/admin/documents/folder/${folderId}`, {
        state: { caseTitle, caseNumber },
      });
    } else {
      navigate("/admin/documents");
    }
  };

  /* ── Loading / Error screens ── */
  if (loading) {
    return (
      <div className="adv-root">
        <AdminSidebar />
        <div className="adv-loading">
          <div className="adv-spinner" />
          <p>Loading document…</p>
        </div>
      </div>
    );
  }
  if (error || !doc) {
    return (
      <div className="adv-root">
        <AdminSidebar />
        <div className="adv-error-state">
          <p>{error || "Document not found."}</p>
          <button onClick={() => navigate("/admin/documents")}>Back to Documents</button>
        </div>
      </div>
    );
  }

  /* ── Derived values ── */
  const status  = normStatus(doc.status);
  const sc      = STATUS_CFG[status];
  const fileName   = doc.documentTitle || doc.originalFileName || "Document";
  const caseId     = doc.caseId?.caseId  || "—";
  const caseTitle_ = doc.caseId?.caseTitle || caseTitle || "—";
  const uploader   = doc.uploadedBy?.name || "—";
  const uploaderRole = roleDisplay(doc.uploadedBy?.role || "");
  const uploadDate = doc.createdAt;
  const reviewer   = doc.approvedBy?.name;
  const reviewedAt = doc.approvedAt;

  /* Audit trail from approvedBy + approvedAt */
  const auditTrail = reviewer && reviewedAt
    ? [{ action: status === "rejected" ? "Rejected" : "Approved", byName: reviewer, at: reviewedAt }]
    : [];

  const isPending  = status === "pending";
  const isRejected = status === "rejected";

  return (
    <div className="adv-root">
      <AdminSidebar />
      <div className="adv-main">

        {/* Topbar */}
        <header className="adv-topbar">
          <div className="adv-search">
            <FaSearch className="adv-search-icon" />
            <input className="adv-search-input" placeholder="Search cases, mediators or files…" readOnly />
          </div>
          <div className="adv-topbar-right">
            <button className="adv-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="adv-admin-avatar" />
          </div>
        </header>

        {/* Document header */}
        <div className="adv-doc-header">
          <div className="adv-doc-header-left">
            <button className="adv-back-btn" onClick={handleBack}>
              <FaArrowLeft />
            </button>
            <div>
              <div className="adv-doc-title-row">
                <h2 className="adv-doc-title">{fileName}</h2>
                <span className={sc.badgeClass}>{sc.label}</span>
              </div>
              <div className="adv-doc-meta">
                <FaIdCard className="adv-meta-icon" />
                <span>Case ID: #{caseId}</span>
                <span className="adv-dot">•</span>
                <FaUser className="adv-meta-icon" />
                <span>{uploader}{uploaderRole ? ` (${uploaderRole})` : ""}</span>
                <span className="adv-dot">•</span>
                <FaCalendarAlt className="adv-meta-icon" />
                <span>{fmt(uploadDate)}</span>
              </div>
            </div>
          </div>

          <div className="adv-doc-header-right">
            <div className="adv-zoom-group">
              <button
                className="adv-zoom-btn"
                onClick={() => setZoom((z) => Math.max(z - 25, 25))}
                title="Zoom out"
              >
                <FaSearchMinus />
              </button>
              <span className="adv-zoom-label">{zoom}%</span>
              <button
                className="adv-zoom-btn"
                onClick={() => setZoom((z) => Math.min(z + 25, 200))}
                title="Zoom in"
              >
                <FaSearchPlus />
              </button>
            </div>
            <button className="adv-fs-btn" onClick={() => setFullscreen(true)}>
              <FaExpand /> Fullscreen
            </button>
            <button className="adv-dl-btn" onClick={handleDownload}>
              <FaDownload /> Download
            </button>
          </div>
        </div>

        {/* Viewer body */}
        <div className="adv-viewer-body">

          {/* Preview pane */}
          <div className="adv-preview-pane">
            <div className="adv-preview-scroll">
              <PreviewContent doc={doc} zoom={zoom} url={previewUrl} loading={previewUrlLoading} />
            </div>
          </div>

          {/* Right panel */}
          <aside className="adv-right-panel">

            {/* Verification Status */}
            <div className="adv-panel-section">
              <p className="adv-panel-label">VERIFICATION STATUS</p>
              <div className={sc.pillClass}>
                <sc.Icon className="adv-pill-icon" />
                <span>{sc.text}</span>
              </div>
            </div>

            {/* Rejection reason */}
            {isRejected && doc.rejectionReason && (
              <div className="adv-panel-section">
                <p className="adv-rejection-label">REJECTION REASON</p>
                <p className="adv-rejection-text">{doc.rejectionReason}</p>
              </div>
            )}

            {/* Approve / Reject actions (pending only) */}
            {isPending && (
              <div className="adv-panel-section adv-actions-section">
                {!rejectOpen ? (
                  <>
                    <button
                      className="adv-approve-btn"
                      onClick={handleApprove}
                      disabled={actionLoading}
                    >
                      <FaCheckCircle /> {approving ? "Approving…" : "Approve"}
                    </button>
                    <button
                      className="adv-reject-btn"
                      onClick={() => setRejectOpen(true)}
                      disabled={actionLoading}
                    >
                      <FaTimesCircle /> Reject
                    </button>
                  </>
                ) : (
                  <div className="adv-reject-form">
                    <p className="adv-reject-form-label">Rejection Reason</p>
                    <textarea
                      className="adv-reject-ta"
                      placeholder="Enter reason for rejection…"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                    <div className="adv-reject-actions">
                      <button
                        className="adv-reject-cancel"
                        onClick={() => { setRejectOpen(false); setRejectReason(""); }}
                        disabled={actionLoading}
                      >
                        Cancel
                      </button>
                      <button
                        className="adv-reject-confirm"
                        onClick={handleReject}
                        disabled={!rejectReason.trim() || actionLoading}
                      >
                        {actionLoading ? "Rejecting…" : "Confirm Reject"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audit trail */}
            {auditTrail.length > 0 && (
              <div className="adv-panel-section">
                <p className="adv-audit-heading">Audit Trail</p>
                {auditTrail.map((entry, i) => (
                  <div key={i} className="adv-audit-row">
                    <div className="adv-audit-av">{initials(entry.byName)}</div>
                    <div className="adv-audit-info">
                      <p className="adv-audit-action">
                        {entry.action} by <strong>{entry.byName}</strong>
                      </p>
                      <p className="adv-audit-time">{fmtDateTime(entry.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </aside>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="adv-fs-overlay">
          <button
            className="adv-fs-close"
            onClick={() => setFullscreen(false)}
            title="Exit fullscreen (Esc)"
          >
            <FaTimes />
          </button>
          <div className="adv-fs-content">
            <PreviewContent doc={doc} zoom={100} url={previewUrl} loading={previewUrlLoading} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDocumentViewer;
