// src/pages/UserPayments.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";
import api from "../api/axios";
import "./UserPayments.css";
import {
  FaUniversity,
  FaCreditCard,
  FaMobileAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaPlus,
  FaDownload,
  FaCheck,
  FaChevronDown,
  FaShieldAlt,
  FaInfoCircle,
  FaFileInvoiceDollar,
  FaExclamationTriangle,
  FaWallet,
  FaBriefcase,
  FaArrowLeft,
  FaEye,
  FaTrash,
} from "react-icons/fa";

// ─── Billing constants (configurable via environment) ─────────────────────────
const BILLING_NAME  = process.env.REACT_APP_BILLING_NAME  || "RaaziMarzi Legal Solutions";
const BILLING_ADDR1 = process.env.REACT_APP_BILLING_ADDR1 || "";
const BILLING_ADDR2 = process.env.REACT_APP_BILLING_ADDR2 || "";
const BILLING_GSTIN = process.env.REACT_APP_BILLING_GSTIN || "";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtINR = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const statusCfg = (s = "pending") => {
  const k = s.toLowerCase();
  if (k === "paid")
    return { cls: "up-chip up-chip--paid", label: "PAID", Icon: FaCheckCircle };
  if (k === "failed")
    return { cls: "up-chip up-chip--failed", label: "FAILED", Icon: FaTimesCircle };
  return { cls: "up-chip up-chip--pending", label: "PENDING", Icon: FaClock };
};

const methodIcon = (type) => {
  if (type === "card") return <FaCreditCard className="up-method-type-icon" />;
  if (type === "upi") return <FaMobileAlt className="up-method-type-icon" />;
  return <FaUniversity className="up-method-type-icon" />;
};

const methodLabel = (m) => {
  if (m.type === "card") {
    const brand = m.cardBrand
      ? m.cardBrand.charAt(0).toUpperCase() + m.cardBrand.slice(1)
      : "Card";
    return { title: `${brand} Card`, sub: `**** ${m.lastFour || "****"}` };
  }
  if (m.type === "upi") {
    return { title: "UPI", sub: m.upiIdMasked || "****@****" };
  }
  return {
    title: "Bank Account",
    sub: m.accountNumberMasked || "****",
  };
};

// ─── DateRangeFilter helper ────────────────────────────────────────────────────
const applyDateFilter = (txns, filterDate) => {
  if (filterDate === "all") return txns;
  const cutoff = new Date();
  if (filterDate === "last7days") cutoff.setDate(cutoff.getDate() - 7);
  else if (filterDate === "last30days") cutoff.setDate(cutoff.getDate() - 30);
  else if (filterDate === "last90days") cutoff.setDate(cutoff.getDate() - 90);
  else return txns;
  return txns.filter((t) => new Date(t.createdAt) >= cutoff);
};

// ══════════════════════════════════════════════════════════════════════════════
//  PAYMENTS DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const PaymentsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalPaid: 0,
    pendingCount: 0,
    failedCount: 0,
    activeCasesCount: 0,
  });
  const [pendingPayments, setPendingPayments] = useState([]);
  const [savedMethods, setSavedMethods] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("last30days");

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/payments/dashboard");
      const { stats, pendingPayments, savedMethods, recentTransactions } = res.data;
      setStats(stats);
      setPendingPayments(pendingPayments || []);
      setSavedMethods(savedMethods || []);
      setAllTransactions(recentTransactions || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const filteredTxns = applyDateFilter(
    filterStatus === "all"
      ? allTransactions
      : allTransactions.filter((t) => t.status === filterStatus),
    filterDate
  );

  if (loading)
    return (
      <div className="up-loading">
        <div className="up-spinner" />
        <p>Loading payments…</p>
      </div>
    );

  if (error)
    return (
      <div className="up-error">
        <FaExclamationTriangle />
        <p>{error}</p>
        <button onClick={fetch}>Retry</button>
      </div>
    );

  return (
    <div className="up-dashboard">
      {/* Header */}
      <div className="up-dash-header">
        <div>
          <h1 className="up-dash-title">Payments</h1>
          <p className="up-dash-sub">
            Manage your mediation payments, invoices, and transaction history.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="up-stat-grid">
        <div className="up-stat-card">
          <div className="up-stat-body">
            <FaWallet className="up-stat-icon up-stat-icon--purple" />
            <p className="up-stat-label">Total Paid</p>
            <p className="up-stat-value">{fmtINR(stats.totalPaid)}</p>
          </div>
          <FaFileInvoiceDollar className="up-stat-deco" />
        </div>
        <div className="up-stat-card">
          <div className="up-stat-body">
            <FaClock className="up-stat-icon up-stat-icon--orange" />
            <p className="up-stat-label">Pending Payments</p>
            <p className="up-stat-value">{stats.pendingCount}</p>
          </div>
          <FaClock className="up-stat-deco" />
        </div>
        <div className="up-stat-card">
          <div className="up-stat-body">
            <FaExclamationTriangle className="up-stat-icon up-stat-icon--red" />
            <p className="up-stat-label">Failed Payments</p>
            <p className="up-stat-value">{stats.failedCount}</p>
          </div>
          <FaExclamationTriangle className="up-stat-deco" />
        </div>
        <div className="up-stat-card">
          <div className="up-stat-body">
            <FaBriefcase className="up-stat-icon up-stat-icon--blue" />
            <p className="up-stat-label">Active Cases</p>
            <p className="up-stat-value">{stats.activeCasesCount}</p>
          </div>
          <FaBriefcase className="up-stat-deco" />
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className="up-main-cols">
        {/* Left column */}
        <div className="up-left-col">
          {/* Pending Payments */}
          <section className="up-section">
            <h2 className="up-section-title">Pending Payments</h2>
            {pendingPayments.length === 0 ? (
              <div className="up-empty">
                <FaCheckCircle className="up-empty-icon" />
                <p>No pending payments</p>
              </div>
            ) : (
              <div className="up-pending-list">
                {pendingPayments.map((p) => (
                  <div key={p._id} className="up-pending-card">
                    <div className="up-pending-icon-wrap">
                      <FaFileInvoiceDollar className="up-pending-icon" />
                    </div>
                    <div className="up-pending-info">
                      <p className="up-pending-title">{p.caseTitle || p.description || "Payment Due"}</p>
                      <p className="up-pending-meta">
                        {p.caseCaseId && (
                          <span>Case ID: {p.caseCaseId} • </span>
                        )}
                        Initiated: {fmt(p.createdAt)}
                      </p>
                    </div>
                    <div className="up-pending-right">
                      <span className="up-pending-amount">{fmtINR(p.amount)}</span>
                      <span className="up-chip up-chip--pending">PENDING</span>
                      <p className="up-pay-offline-note">
                        Online payment not available yet — contact support to arrange payment.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Transaction History */}
          <section className="up-section">
            <div className="up-section-head">
              <h2 className="up-section-title">Transaction History</h2>
              <div className="up-txn-filters">
                <div className="up-filter-sel-wrap">
                  <select
                    className="up-filter-sel"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">Status: All</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                  <FaChevronDown className="up-sel-arrow" />
                </div>
                <div className="up-filter-sel-wrap">
                  <select
                    className="up-filter-sel"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                  >
                    <option value="last7days">Last 7 Days</option>
                    <option value="last30days">Last 30 Days</option>
                    <option value="last90days">Last 90 Days</option>
                    <option value="all">All Time</option>
                  </select>
                  <FaChevronDown className="up-sel-arrow" />
                </div>
              </div>
            </div>

            {filteredTxns.length === 0 ? (
              <div className="up-empty">
                <FaFileInvoiceDollar className="up-empty-icon" />
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="up-txn-table-wrap">
                <table className="up-txn-table">
                  <thead>
                    <tr>
                      <th>TRANSACTION ID</th>
                      <th>CASE TITLE</th>
                      <th>AMOUNT</th>
                      <th>DATE</th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxns.map((t) => {
                      const cfg = statusCfg(t.status);
                      return (
                        <tr key={t._id}>
                          <td className="up-txn-id">{t.txnId || t._id.toString().slice(-6).toUpperCase()}</td>
                          <td>{t.caseTitle || t.description || "—"}</td>
                          <td className="up-txn-amt">{fmtINR(t.amount)}</td>
                          <td>{fmt(t.createdAt)}</td>
                          <td>
                            <span className={cfg.cls}>{cfg.label}</span>
                          </td>
                          <td>
                            <button
                              className="up-view-link"
                              onClick={() =>
                                navigate(`/user/payments/invoice/${t._id}`)
                              }
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  ADD PAYMENT METHOD
// ══════════════════════════════════════════════════════════════════════════════
const AddPaymentMethod = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("card");
  const [saving, setSaving] = useState(false);

  // Card state
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  // UPI state
  const [upiId, setUpiId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState(null);
  const [upiError, setUpiError] = useState("");
  const [saveUpi, setSaveUpi] = useState(false);

  // Bank state
  const [acctHolder, setAcctHolder] = useState("");
  const [acctNumber, setAcctNumber] = useState("");
  const [acctConfirm, setAcctConfirm] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [acctType, setAcctType] = useState("savings");
  const [saveBank, setSaveBank] = useState(false);

  // Errors
  const [errors, setErrors] = useState({});

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleVerifyUpi = async () => {
    setUpiError("");
    setVerifiedName(null);
    if (!upiId.trim()) {
      setUpiError("Enter a UPI ID first");
      return;
    }
    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim())) {
      setUpiError("Invalid UPI ID format (e.g. name@oksbi)");
      return;
    }
    setVerifying(true);
    try {
      const res = await api.post("/payments/verify-upi", { upiId: upiId.trim() });
      setVerifiedName(res.data.name);
    } catch (err) {
      setUpiError(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const validate = () => {
    const e = {};
    if (activeTab === "card") {
      if (!cardNumber.replace(/\s/g, "").match(/^\d{12,19}$/))
        e.cardNumber = "Enter a valid card number";
      if (!cardholderName.trim()) e.cardholderName = "Cardholder name is required";
      if (!expiry.match(/^\d{2}\/\d{2}$/)) e.expiry = "Enter expiry as MM/YY";
      if (!cvv.match(/^\d{3,4}$/)) e.cvv = "CVV must be 3 or 4 digits";
    } else if (activeTab === "upi") {
      if (!upiId.trim()) e.upiId = "UPI ID is required";
      else if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim()))
        e.upiId = "Invalid UPI ID format";
      if (!verifiedName) e.upiId = "Please verify your UPI ID first";
    } else {
      if (!acctHolder.trim()) e.acctHolder = "Account holder name is required";
      if (!acctNumber.match(/^\d{9,18}$/))
        e.acctNumber = "Enter a valid account number (9-18 digits)";
      if (acctNumber !== acctConfirm) e.acctConfirm = "Account numbers do not match";
      if (!ifsc.match(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/))
        e.ifsc = "Invalid IFSC code (e.g. SBIN0001234)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let body = { type: activeTab };
      if (activeTab === "card") {
        const [expiryMonth, expiryYear] = expiry.split("/");
        body = { ...body, cardNumber, cardholderName, expiryMonth, expiryYear };
      } else if (activeTab === "upi") {
        body = { ...body, upiId: upiId.trim(), verifiedName };
      } else {
        body = { ...body, accountHolderName: acctHolder, accountNumber: acctNumber, ifscCode: ifsc, accountType: acctType };
      }
      await api.post("/payments/methods", body);
      navigate("/user/payments");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="up-add-page">
      {/* Breadcrumb */}
      <p className="up-breadcrumb">
        <button className="up-breadcrumb-link" onClick={() => navigate("/user/payments")}>
          Payments
        </button>{" "}
        &rsaquo; <span>Add Payment Method</span>
      </p>
      <h1 className="up-page-title">Add Payment Method</h1>
      <p className="up-page-sub">Choose a secure payment method for your mediation fees.</p>

      <div className="up-add-layout">
        {/* Form panel */}
        <div className="up-add-panel">
          {/* Tabs */}
          <div className="up-tabs">
            {[
              { key: "card", label: "Credit/Debit Card", Icon: FaCreditCard },
              { key: "upi", label: "UPI", Icon: FaMobileAlt },
              { key: "bank", label: "Bank Account", Icon: FaUniversity },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                className={`up-tab${activeTab === key ? " up-tab--active" : ""}`}
                onClick={() => { setActiveTab(key); setErrors({}); setVerifiedName(null); setUpiError(""); }}
              >
                <Icon className="up-tab-icon" />
                {label}
              </button>
            ))}
          </div>

          <div className="up-tab-body">
            {/* ── Card Tab ── */}
            {activeTab === "card" && (
              <>
                <div className="up-field">
                  <label className="up-label">Card Number</label>
                  <div className="up-card-num-wrap">
                    <input
                      className={`up-input${errors.cardNumber ? " up-input--err" : ""}`}
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      maxLength={19}
                    />
                    <span className="up-card-brands">
                      <span className="up-brand-visa">VISA</span>
                      <span className="up-brand-mc">MC</span>
                    </span>
                  </div>
                  {errors.cardNumber && <p className="up-err">{errors.cardNumber}</p>}
                </div>

                <div className="up-field">
                  <label className="up-label">Cardholder Name</label>
                  <input
                    className={`up-input${errors.cardholderName ? " up-input--err" : ""}`}
                    placeholder="e.g. Vikram Singh"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                  />
                  {errors.cardholderName && <p className="up-err">{errors.cardholderName}</p>}
                </div>

                <div className="up-field-row">
                  <div className="up-field">
                    <label className="up-label">Expiry Date</label>
                    <input
                      className={`up-input${errors.expiry ? " up-input--err" : ""}`}
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                    />
                    {errors.expiry && <p className="up-err">{errors.expiry}</p>}
                  </div>
                  <div className="up-field">
                    <label className="up-label">
                      CVV <FaInfoCircle className="up-cvv-info" title="3-digit security code on back of card" />
                    </label>
                    <input
                      className={`up-input${errors.cvv ? " up-input--err" : ""}`}
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      type="password"
                    />
                    {errors.cvv && <p className="up-err">{errors.cvv}</p>}
                  </div>
                </div>

                <label className="up-checkbox-label">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                  />
                  <span>Save this card for future payments</span>
                </label>
              </>
            )}

            {/* ── UPI Tab ── */}
            {activeTab === "upi" && (
              <>
                <div className="up-field">
                  <label className="up-label">Enter UPI ID</label>
                  <div className="up-upi-row">
                    <input
                      className={`up-input${errors.upiId ? " up-input--err" : ""}`}
                      placeholder="e.g. raazi@oksbi"
                      value={upiId}
                      onChange={(e) => {
                        setUpiId(e.target.value);
                        setVerifiedName(null);
                        setUpiError("");
                      }}
                    />
                    <button
                      className="up-verify-btn"
                      onClick={handleVerifyUpi}
                      disabled={verifying}
                    >
                      {verifying ? "…" : "Verify"}
                    </button>
                  </div>
                  {errors.upiId && <p className="up-err">{errors.upiId}</p>}
                  {upiError && <p className="up-err">{upiError}</p>}
                  {verifiedName && (
                    <p className="up-verified-name">
                      <FaCheckCircle /> Format check passed — VPA not verified with bank
                    </p>
                  )}
                </div>

                <p className="up-upi-hint">
                  We support all major UPI apps including GPay, PhonePe, and Paytm.
                </p>

                <label className="up-checkbox-label">
                  <input
                    type="checkbox"
                    checked={saveUpi}
                    onChange={(e) => setSaveUpi(e.target.checked)}
                  />
                  <span>Save this UPI ID for future payments</span>
                </label>
              </>
            )}

            {/* ── Bank Account Tab ── */}
            {activeTab === "bank" && (
              <>
                <div className="up-field">
                  <label className="up-label">Account Holder Name</label>
                  <input
                    className={`up-input${errors.acctHolder ? " up-input--err" : ""}`}
                    placeholder="As it appears on your passbook"
                    value={acctHolder}
                    onChange={(e) => setAcctHolder(e.target.value)}
                  />
                  {errors.acctHolder && <p className="up-err">{errors.acctHolder}</p>}
                </div>

                <div className="up-field-row">
                  <div className="up-field">
                    <label className="up-label">Account Number</label>
                    <input
                      className={`up-input${errors.acctNumber ? " up-input--err" : ""}`}
                      placeholder="Enter account number"
                      value={acctNumber}
                      onChange={(e) => setAcctNumber(e.target.value.replace(/\D/g, ""))}
                      maxLength={18}
                    />
                    {errors.acctNumber && <p className="up-err">{errors.acctNumber}</p>}
                  </div>
                  <div className="up-field">
                    <label className="up-label">Re-enter Account Number</label>
                    <input
                      className={`up-input${errors.acctConfirm ? " up-input--err" : ""}`}
                      placeholder="Verify account number"
                      value={acctConfirm}
                      onChange={(e) => setAcctConfirm(e.target.value.replace(/\D/g, ""))}
                      maxLength={18}
                    />
                    {errors.acctConfirm && <p className="up-err">{errors.acctConfirm}</p>}
                  </div>
                </div>

                <div className="up-field-row">
                  <div className="up-field">
                    <label className="up-label">IFSC Code</label>
                    <input
                      className={`up-input${errors.ifsc ? " up-input--err" : ""}`}
                      placeholder="E.G. SBIN0001234"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      maxLength={11}
                    />
                    {errors.ifsc && <p className="up-err">{errors.ifsc}</p>}
                  </div>
                  <div className="up-field">
                    <label className="up-label">Account Type</label>
                    <div className="up-radio-group">
                      <label className="up-radio-label">
                        <input
                          type="radio"
                          name="acctType"
                          value="savings"
                          checked={acctType === "savings"}
                          onChange={() => setAcctType("savings")}
                        />
                        <span>Savings</span>
                      </label>
                      <label className="up-radio-label">
                        <input
                          type="radio"
                          name="acctType"
                          value="current"
                          checked={acctType === "current"}
                          onChange={() => setAcctType("current")}
                        />
                        <span>Current</span>
                      </label>
                    </div>
                  </div>
                </div>

                <label className="up-checkbox-label">
                  <input
                    type="checkbox"
                    checked={saveBank}
                    onChange={(e) => setSaveBank(e.target.checked)}
                  />
                  <span>Save this account for future payments</span>
                </label>
              </>
            )}
          </div>

          {/* Footer buttons */}
          <div className="up-add-footer">
            <button className="up-cancel-btn" onClick={() => navigate("/user/payments")}>
              Cancel
            </button>
            <button
              className="up-submit-btn"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Saving…" : "Add Payment Method"}
            </button>
          </div>
        </div>

        {/* Right info panels */}
        <div className="up-info-col">
          <div className="up-info-card">
            <p className="up-info-title">
              <FaShieldAlt className="up-info-icon" /> Secure Payment
            </p>
            <p className="up-info-body">
              Your payment information is encrypted and stored securely. We
              follow international standards to ensure your data remains private.
            </p>
          </div>

          <div className="up-info-card">
            <p className="up-info-tips-label">QUICK TIPS</p>
            <ul className="up-tips-list">
              <li>
                <FaInfoCircle className="up-tip-icon" />
                Mediation fees are typically processed within 24 hours of
                successful resolution.
              </li>
              <li>
                <FaInfoCircle className="up-tip-icon" />
                Multiple payment methods can be added for redundancy.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  INVOICE DETAILS
// ══════════════════════════════════════════════════════════════════════════════
const getLocalUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const InvoiceDetails = ({ id }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [txn, setTxn] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const localUser = getLocalUser();

  useEffect(() => {
    const fetchTxn = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/payments/transactions/${id}`);
        setTxn(res.data.transaction);
      } catch (err) {
        setError(err.response?.data?.message || "Invoice not found");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTxn();
  }, [id]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/payments/transactions/${id}/invoice-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${txn?.invoiceNumber || "invoice"}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download invoice PDF");
    } finally {
      setDownloading(false);
    }
  };

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          month: "long",
          day: "2-digit",
          year: "numeric",
        })
      : "—";

  if (loading)
    return (
      <div className="up-loading">
        <div className="up-spinner" />
        <p>Loading invoice…</p>
      </div>
    );

  if (error)
    return (
      <div className="up-error">
        <FaExclamationTriangle />
        <p>{error}</p>
        <button onClick={() => navigate("/user/payments")}>Back to Payments</button>
      </div>
    );

  const cfg = statusCfg(txn?.status);

  return (
    <div className="up-invoice-page">
      {/* Header row */}
      <div className="up-inv-header-row">
        <div>
          <p className="up-breadcrumb">
            <button className="up-breadcrumb-link" onClick={() => navigate("/user/payments")}>
              Payments
            </button>{" "}
            &rsaquo; <span className="up-breadcrumb-inv">{txn?.invoiceNumber}</span>
          </p>
          <h1 className="up-page-title">Invoice Details</h1>
        </div>
        <button
          className="up-dl-btn"
          onClick={handleDownloadPDF}
          disabled={downloading}
        >
          <FaDownload /> {downloading ? "Generating…" : "Download PDF"}
        </button>
      </div>

      {/* Invoice card */}
      <div className="up-invoice-card">
        {/* Card header */}
        <div className="up-inv-card-head">
          <div className="up-inv-logo">
            <span className="up-inv-logo-icon">⚖</span>
            <span className="up-inv-logo-text">RaaziMarzi</span>
          </div>
          <div className="up-inv-top-right">
            <span className={cfg.cls}>{cfg.label}</span>
            <p className="up-inv-number">INVOICE: #{txn?.invoiceNumber}</p>
          </div>
        </div>

        <div className="up-inv-divider" />

        {/* FROM / BILL TO */}
        <div className="up-inv-parties">
          <div>
            <p className="up-inv-section-label">FROM</p>
            <p className="up-inv-party-name">{BILLING_NAME}</p>
            {BILLING_ADDR1 && <p className="up-inv-party-detail">{BILLING_ADDR1}</p>}
            {BILLING_ADDR2 && <p className="up-inv-party-detail">{BILLING_ADDR2}</p>}
            {BILLING_GSTIN && <p className="up-inv-party-detail">GSTIN: {BILLING_GSTIN}</p>}
          </div>
          <div>
            <p className="up-inv-section-label">BILL TO</p>
            <p className="up-inv-party-name">{localUser?.name || "Client"}</p>
            {txn?.caseCaseId && (
              <p className="up-inv-case-id">Case ID: {txn.caseCaseId}</p>
            )}
            <p className="up-inv-party-detail">{localUser?.email || ""}</p>
          </div>
        </div>

        <div className="up-inv-divider" />

        {/* Meta row */}
        <div className="up-inv-meta">
          <div>
            <p className="up-inv-section-label">DATE ISSUED</p>
            <p className="up-inv-meta-val">{fmt(txn?.createdAt)}</p>
          </div>
          <div>
            <p className="up-inv-section-label">PAYMENT DATE</p>
            <p className="up-inv-meta-val">{fmt(txn?.paidAt)}</p>
          </div>
          <div>
            <p className="up-inv-section-label">PAYMENT METHOD</p>
            <p className="up-inv-meta-val">{txn?.paymentMethod || "—"}</p>
          </div>
        </div>

        <div className="up-inv-divider" />

        {/* Line items */}
        <table className="up-inv-table">
          <thead>
            <tr>
              <th>DESCRIPTION</th>
              <th>CASE ID</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="up-inv-item-desc">{txn?.description || "Mediation Fee"}</td>
              <td>{txn?.caseCaseId || "—"}</td>
              <td className="up-inv-item-amt">{fmtINR(txn?.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="up-inv-divider" />

        {/* Totals */}
        <div className="up-inv-totals">
          <div className="up-inv-total-row">
            <span>Subtotal</span>
            <span>{fmtINR(txn?.subtotal)}</span>
          </div>
          <div className="up-inv-total-row">
            <span>GST ({txn?.gstPercent || 18}%)</span>
            <span>{fmtINR(txn?.gstAmount)}</span>
          </div>
          <div className="up-inv-total-row up-inv-total-row--final">
            <span>Total Amount</span>
            <span className="up-inv-total-amt">{fmtINR(txn?.amount)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="up-inv-notes">
          <p className="up-inv-notes-title">Notes &amp; Payment Terms</p>
          <p className="up-inv-notes-body">
            {txn?.notes ||
              `Thank you for choosing RaaziMarzi for your mediation services. This invoice covers professional fees${txn?.caseCaseId ? ` for case ${txn.caseCaseId}` : ""}. Payments are non-refundable once sessions have commenced. For any billing queries, please contact finance@raazimarzi.com.`}
          </p>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  ROOT — route dispatcher
// ══════════════════════════════════════════════════════════════════════════════
const UserPayments = () => {
  const location = useLocation();
  const params = useParams();

  const isInvoice = location.pathname.includes("/invoice/");

  let view;
  if (isInvoice) {
    view = <InvoiceDetails id={params.id} />;
  } else {
    view = <PaymentsDashboard />;
  }

  return (
    <div className="up-shell">
      <UserSidebar activePage="payments" />
      <div className="up-main">
        <UserNavbar />
        <div className="up-content">{view}</div>
      </div>
    </div>
  );
};

export default UserPayments;
