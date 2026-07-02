// src/pages/MediatorDocViewer.js — Read-only document viewer for mediators
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Download, Maximize2, ZoomIn, ZoomOut,
  FileText, Loader2, AlertCircle, CheckCircle, XCircle,
  Clock, User, Flag,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import axiosInstance from "../api/axios";
import "./MediatorDocuments.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";

const isImage  = (mime) => mime?.startsWith("image/");
const isPdf    = (mime) => mime === "application/pdf";

const DOC_STATUS = {
  "Approved":       { icon: CheckCircle, bg: "#D1FAE5", color: "#065F46", label: "Approved" },
  "Pending Review": { icon: Clock,       bg: "#FEF3C7", color: "#92400E", label: "Pending Review" },
  "Rejected":       { icon: XCircle,     bg: "#FEE2E2", color: "#991B1B", label: "Rejected" },
  "Flagged":        { icon: Flag,        bg: "#FFF7ED", color: "#C2410C", label: "Flagged" },
};
const docStatus = (s) =>
  DOC_STATUS[s] || { icon: Clock, bg: "#F3F4F6", color: "#6B7280", label: s || "Unknown" };

// ─── Component ────────────────────────────────────────────────────────────────

const MediatorDocViewer = () => {
  const { documentId } = useParams();
  const navigate       = useNavigate();

  const [doc,          setDoc]          = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [downloading,  setDownloading]  = useState(false);
  const [zoom,         setZoom]         = useState(100);

  const previewRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metaRes, dlRes] = await Promise.all([
        axiosInstance.get(`/documents/${documentId}`),
        axiosInstance.get(`/documents/${documentId}/download`),
      ]);
      setDoc(metaRes.data.document);
      setPreviewUrl(dlRes.data.downloadUrl || null);
    } catch {
      setError("Failed to load document. You may not have access or the document may not exist.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { data } = await axiosInstance.get(`/documents/${documentId}/download`);
      if (data.downloadUrl) window.open(data.downloadUrl, "_blank", "noopener");
    } catch {
      // silent
    } finally {
      setDownloading(false);
    }
  };

  const handleFullscreen = () => {
    const el = previewRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  const adjustZoom = (delta) =>
    setZoom((z) => Math.max(50, Math.min(200, z + delta)));

  if (loading) {
    return (
      <MediatorLayout>
        <div className="mdd-page">
          <div className="mdd-state">
            <Loader2 size={28} className="mdd-spin" />
            <span>Loading document…</span>
          </div>
        </div>
      </MediatorLayout>
    );
  }

  if (error || !doc) {
    return (
      <MediatorLayout>
        <div className="mdd-page">
          <button className="mdd-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="mdd-state mdd-state--error">
            <AlertCircle size={24} />
            <span>{error || "Document not found."}</span>
          </div>
        </div>
      </MediatorLayout>
    );
  }

  const sCfg = docStatus(doc.status);
  const StatusIcon = sCfg.icon;

  return (
    <MediatorLayout>
      <div className="mdd-page mdd-viewer-page">

        {/* Back */}
        <button
          className="mdd-back-btn"
          onClick={() => navigate(
            doc.caseId?._id
              ? `/mediator/documents/case/${doc.caseId._id}`
              : "/mediator/documents"
          )}
        >
          <ArrowLeft size={16} />
          Back to{" "}
          {doc.caseId?.caseTitle ? doc.caseId.caseTitle : "Documents"}
        </button>

        {/* Document header */}
        <div className="mdd-viewer-header">
          <div className="mdd-viewer-header-left">
            <FileText size={22} className="mdd-viewer-file-icon" />
            <div>
              <h1 className="mdd-viewer-title">{doc.documentTitle || doc.originalFileName}</h1>
              <div className="mdd-viewer-meta">
                {doc.caseId?.caseId && (
                  <span className="mdd-folder-id">Case #{doc.caseId.caseId}</span>
                )}
                <span className="mdd-viewer-meta-item">
                  <User size={12} />
                  {doc.uploadedBy?.name || "Unknown"} · {doc.uploadedBy?.role || ""}
                </span>
                <span className="mdd-viewer-meta-item">
                  <Clock size={12} />
                  {fmtDate(doc.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <span
            className="mdd-folder-status"
            style={{ background: sCfg.bg, color: sCfg.color }}
          >
            <StatusIcon size={12} />
            {sCfg.label}
          </span>
        </div>

        {/* Main area */}
        <div className="mdd-viewer-body">

          {/* Preview pane */}
          <div className="mdd-viewer-main">
            {/* Toolbar */}
            <div className="mdd-viewer-toolbar">
              <button className="mdd-toolbar-btn" onClick={() => adjustZoom(-10)} title="Zoom out">
                <ZoomOut size={15} />
              </button>
              <span className="mdd-zoom-label">{zoom}%</span>
              <button className="mdd-toolbar-btn" onClick={() => adjustZoom(10)} title="Zoom in">
                <ZoomIn size={15} />
              </button>
              <button className="mdd-toolbar-btn" onClick={handleFullscreen} title="Fullscreen">
                <Maximize2 size={15} />
              </button>
              <button
                className="mdd-toolbar-btn mdd-toolbar-download"
                onClick={handleDownload}
                disabled={downloading}
                title="Download"
              >
                {downloading ? <Loader2 size={15} className="mdd-spin" /> : <Download size={15} />}
                {downloading ? "Downloading…" : "Download"}
              </button>
            </div>

            {/* Content */}
            <div className="mdd-preview-wrap" ref={previewRef}>
              {!previewUrl ? (
                <div className="mdd-preview-unavail">
                  <FileText size={48} />
                  <p>Preview not available</p>
                  <button className="mdd-retry-btn" onClick={handleDownload}>
                    Download to View
                  </button>
                </div>
              ) : isImage(doc.mimeType) ? (
                <img
                  src={previewUrl}
                  alt={doc.documentTitle}
                  className="mdd-preview-img"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                />
              ) : isPdf(doc.mimeType) ? (
                <iframe
                  src={previewUrl}
                  title={doc.documentTitle}
                  className="mdd-preview-iframe"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
                />
              ) : (
                <div className="mdd-preview-unavail">
                  <FileText size={48} />
                  <p>
                    Preview not available for{" "}
                    <strong>{(doc.fileExtension || "this file type").toUpperCase()}</strong> files.
                  </p>
                  <button className="mdd-retry-btn" onClick={handleDownload}>
                    Download to View
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="mdd-viewer-panel">

            {/* Status section */}
            <div className="mdd-panel-section">
              <h3 className="mdd-panel-heading">Document Status</h3>
              <div
                className="mdd-panel-status-badge"
                style={{ background: sCfg.bg, color: sCfg.color }}
              >
                <StatusIcon size={14} />
                {sCfg.label}
              </div>
              <p className="mdd-panel-note">
                Status is managed by the admin. Mediators have read-only access.
              </p>
            </div>

            {/* Audit trail */}
            {doc.approvedBy && (
              <div className="mdd-panel-section">
                <h3 className="mdd-panel-heading">Audit Trail</h3>
                <div className="mdd-audit-row">
                  <span className="mdd-audit-label">Reviewed by</span>
                  <span className="mdd-audit-val">{doc.approvedBy.name || "—"}</span>
                </div>
                {doc.approvedAt && (
                  <div className="mdd-audit-row">
                    <span className="mdd-audit-label">On</span>
                    <span className="mdd-audit-val">{fmtDate(doc.approvedAt)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Rejection reason */}
            {doc.status === "Rejected" && doc.rejectionReason && (
              <div className="mdd-panel-section mdd-panel-section--warn">
                <h3 className="mdd-panel-heading">Rejection Reason</h3>
                <p className="mdd-panel-rejection">{doc.rejectionReason}</p>
              </div>
            )}

            {/* File metadata */}
            <div className="mdd-panel-section">
              <h3 className="mdd-panel-heading">File Details</h3>
              <div className="mdd-audit-row">
                <span className="mdd-audit-label">File name</span>
                <span className="mdd-audit-val mdd-audit-val--sm">{doc.originalFileName || "—"}</span>
              </div>
              {doc.category && (
                <div className="mdd-audit-row">
                  <span className="mdd-audit-label">Category</span>
                  <span className="mdd-audit-val">{doc.category}</span>
                </div>
              )}
              {doc.fileSize && (
                <div className="mdd-audit-row">
                  <span className="mdd-audit-label">Size</span>
                  <span className="mdd-audit-val">
                    {(doc.fileSize / 1024).toFixed(0)} KB
                  </span>
                </div>
              )}
              <div className="mdd-audit-row">
                <span className="mdd-audit-label">Downloads</span>
                <span className="mdd-audit-val">{doc.downloadCount ?? 0}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorDocViewer;
