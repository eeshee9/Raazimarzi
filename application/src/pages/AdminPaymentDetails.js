import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import api from "../api/axios";
import "./AdminPaymentDetails.css";

/* ── Billing entity constants — must match PDF generator ── */
const BILLING_NAME  = "RaaziMarzi Legal Solutions";
const BILLING_ADDR1 = "12th Floor, Trade Tower";
const BILLING_ADDR2 = "Cyber City, Indore, MP";
const BILLING_GSTIN = "GSTIN: 07AAACR1234A1Z1";

/* ── Helpers ── */
const fmtINR = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  }) : "—";

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
const AdminPaymentDetails = () => {
  const navigate    = useNavigate();
  const { id }      = useParams();
  const [txn,        setTxn]        = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchTxn = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/payments/admin/transactions/${id}`);
        setTxn(res.data.transaction);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load transaction.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTxn();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!txn || downloading) return;
    setDownloading(true);
    try {
      const res = await api.get(`/payments/admin/transactions/${txn._id}/invoice-pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `${txn.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to download invoice PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  /* Status helpers */
  const statusClass = (s = "") => {
    const k = s.toLowerCase();
    if (k === "paid")   return "apd-status-badge apd-status-badge--paid";
    if (k === "failed") return "apd-status-badge apd-status-badge--failed";
    return "apd-status-badge apd-status-badge--pending";
  };

  const statusLabel = (s = "") => {
    const k = s.toLowerCase();
    if (k === "paid")   return "● PAID";
    if (k === "failed") return "● FAILED";
    return "● PENDING";
  };

  /* Notes fallback (same logic as PDF generator) */
  const notesText =
    txn?.notes ||
    `Thank you for choosing RaaziMarzi for your mediation services. This invoice covers professional fees${txn?.caseCaseId ? ` for case ${txn.caseCaseId}` : ""}. Payments are non-refundable once sessions have commenced. For any billing queries, please contact finance@raazimarzi.com.`;

  /* ── Render ── */
  if (loading) {
    return (
      <div className="apd-root">
        <AdminSidebar />
        <div className="apd-main"><div className="apd-loading">Loading invoice...</div></div>
      </div>
    );
  }

  if (error || !txn) {
    return (
      <div className="apd-root">
        <AdminSidebar />
        <div className="apd-main">
          <div className="apd-error">{error || "Transaction not found."}</div>
          <button className="apd-back-btn" onClick={() => navigate("/admin/payments")}>
            ← Back to Payments
          </button>
        </div>
      </div>
    );
  }

  const payer = txn.userId || {};

  return (
    <div className="apd-root">
      <AdminSidebar />
      <div className="apd-main">

        {/* Breadcrumb + actions */}
        <div className="apd-topbar">
          <div className="apd-breadcrumb">
            <button className="apd-breadcrumb-link" onClick={() => navigate("/admin/payments")}>
              Payments
            </button>
            <span className="apd-breadcrumb-sep">›</span>
            <span className="apd-breadcrumb-current">{txn.invoiceNumber}</span>
          </div>
          <button
            className="apd-download-btn"
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? "Generating..." : "⬇ Download PDF"}
          </button>
        </div>

        <h1 className="apd-page-title">Invoice Details</h1>

        {/* Invoice card */}
        <div className="apd-invoice-card">

          {/* Invoice header */}
          <div className="apd-invoice-header">
            <div className="apd-brand">
              <span className="apd-brand-logo">⚖️</span>
              <span className="apd-brand-name">RaaziMarzi</span>
            </div>
            <div className="apd-invoice-meta">
              <span className={statusClass(txn.status)}>{statusLabel(txn.status)}</span>
              <div className="apd-invoice-number">INVOICE: #{txn.invoiceNumber}</div>
            </div>
          </div>

          <div className="apd-divider" />

          {/* FROM / BILL TO */}
          <div className="apd-addresses">
            <div className="apd-address-block">
              <div className="apd-address-label">FROM</div>
              <div className="apd-address-name">{BILLING_NAME}</div>
              <div className="apd-address-line">{BILLING_ADDR1}</div>
              <div className="apd-address-line">{BILLING_ADDR2}</div>
              <div className="apd-address-line">{BILLING_GSTIN}</div>
            </div>
            <div className="apd-address-block">
              <div className="apd-address-label">BILL TO</div>
              <div className="apd-address-name">{payer.name || "—"}</div>
              {txn.caseCaseId && (
                <div className="apd-address-line">
                  Case ID: <span className="apd-case-id-link">{txn.caseCaseId}</span>
                </div>
              )}
              <div className="apd-address-line">{payer.email || "—"}</div>
            </div>
          </div>

          <div className="apd-divider" />

          {/* Date row */}
          <div className="apd-date-row">
            <div className="apd-date-block">
              <div className="apd-date-label">DATE ISSUED</div>
              <div className="apd-date-value">{fmtDate(txn.createdAt)}</div>
            </div>
            <div className="apd-date-block">
              <div className="apd-date-label">PAYMENT DATE</div>
              <div className="apd-date-value">{fmtDate(txn.paidAt)}</div>
            </div>
            <div className="apd-date-block">
              <div className="apd-date-label">PAYMENT METHOD</div>
              <div className="apd-date-value">{txn.paymentMethod || "—"}</div>
            </div>
          </div>

          <div className="apd-divider" />

          {/* Line items */}
          <div className="apd-items-table">
            <div className="apd-items-header">
              <span className="apd-col-desc">DESCRIPTION</span>
              <span className="apd-col-case">CASE ID</span>
              <span className="apd-col-amount">AMOUNT</span>
            </div>
            <div className="apd-divider" />
            <div className="apd-items-row">
              <span className="apd-col-desc apd-item-name">
                {txn.description || "Mediation Fee"}
              </span>
              <span className="apd-col-case apd-item-case">
                {txn.caseCaseId || "—"}
              </span>
              <span className="apd-col-amount apd-item-amount">
                {fmtINR(txn.amount)}
              </span>
            </div>
            <div className="apd-divider" />
          </div>

          {/* Totals */}
          <div className="apd-totals">
            <div className="apd-total-row">
              <span className="apd-total-label">Subtotal</span>
              <span className="apd-total-val">{fmtINR(txn.subtotal)}</span>
            </div>
            {txn.gstAmount > 0 && (
              <div className="apd-total-row">
                <span className="apd-total-label">GST ({txn.gstPercent || 18}%)</span>
                <span className="apd-total-val">{fmtINR(txn.gstAmount)}</span>
              </div>
            )}
            <div className="apd-total-row apd-total-row--grand">
              <span className="apd-total-label apd-total-label--grand">Total Amount</span>
              <span className="apd-total-val apd-total-val--grand">{fmtINR(txn.amount)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="apd-notes">
            <div className="apd-notes-title">Notes &amp; Payment Terms</div>
            <p className="apd-notes-text">{notesText}</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminPaymentDetails;
