// src/components/RequestDocumentModal.jsx
import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaChevronDown, FaSpinner, FaCheckCircle } from "react-icons/fa";
import api from "../api/axios";

const RequestDocumentModal = ({ isOpen, onClose, caseId, petitionerName, respondentName }) => {
  const [recipient, setRecipient]   = useState("");
  const [dropOpen, setDropOpen]     = useState(false);
  const [docName, setDocName]       = useState("");
  const [dueDate, setDueDate]       = useState("");
  const [urgent, setUrgent]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");
  const dropRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setRecipient(""); setDropOpen(false); setDocName("");
    setDueDate(""); setUrgent(false); setDone(false); setError("");
  }, [isOpen]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const recipients = [
    petitionerName && { label: petitionerName, value: "petitioner" },
    respondentName && { label: respondentName, value: "respondent" },
  ].filter(Boolean);

  const handleSubmit = async () => {
    if (!recipient || !docName) {
      setError("Please select a recipient and enter the document name.");
      return;
    }
    setError("");
    setSubmitting(true);
    /* Bug 7 fix: use the person's real name (label), not the role value */
    const selectedRecipient = recipients.find(r => r.value === recipient);
    const recipientName = selectedRecipient?.label || recipient;
    const urgencyTag = urgent ? "[URGENT] " : "";
    const dateTag = dueDate ? ` | Due: ${dueDate}` : "";
    const note = `${urgencyTag}Document Request — "${docName}" requested from ${recipientName}${dateTag}`;
    try {
      await api.post(`/admin/cases/${caseId}/note`, { note });
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rdm-overlay" onClick={onClose}>
      <div className="rdm-modal" onClick={e => e.stopPropagation()}>

        <div className="rdm-header">
          <h2 className="rdm-title">Request New Document</h2>
          <button className="rdm-close" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="rdm-body">

          {/* Recipient Dropdown */}
          <div className="rdm-field">
            <label className="rdm-label">RECIPIENT</label>
            <div className="rdm-drop-wrap" ref={dropRef}>
              <button
                className={`rdm-drop-trigger ${dropOpen ? "rdm-drop-trigger--open" : ""}`}
                type="button"
                onClick={() => setDropOpen(v => !v)}
              >
                <span className={recipient ? "rdm-drop-value" : "rdm-drop-placeholder"}>
                  {recipient
                    ? recipients.find(r => r.value === recipient)?.label
                    : "Select recipient…"}
                </span>
                <FaChevronDown className={`rdm-drop-chevron ${dropOpen ? "rdm-drop-chevron--open" : ""}`} />
              </button>
              {dropOpen && (
                <div className="rdm-drop-menu">
                  {recipients.map(r => (
                    <button
                      key={r.value}
                      className={`rdm-drop-item ${recipient === r.value ? "rdm-drop-item--active" : ""}`}
                      onClick={() => { setRecipient(r.value); setDropOpen(false); }}
                    >
                      {r.label}
                    </button>
                  ))}
                  {recipients.length === 0 && (
                    <p className="rdm-drop-empty">No participants available</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Document Name */}
          <div className="rdm-field">
            <label className="rdm-label">DOCUMENT NAME</label>
            <input
              className="rdm-input"
              placeholder="e.g. Bank Statement, Lease Agreement…"
              value={docName}
              onChange={e => setDocName(e.target.value)}
            />
          </div>

          {/* Due Date */}
          <div className="rdm-field">
            <label className="rdm-label">DUE DATE <span className="rdm-optional">(optional)</span></label>
            <input
              className="rdm-input rdm-input--date"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Urgency Toggle */}
          <div className="rdm-field rdm-field--row">
            <div>
              <label className="rdm-label">URGENCY</label>
              <p className="rdm-hint">Mark as urgent to prioritise this request</p>
            </div>
            <button
              type="button"
              className={`rdm-toggle ${urgent ? "rdm-toggle--urgent" : ""}`}
              onClick={() => setUrgent(v => !v)}
              aria-pressed={urgent}
            >
              <span className="rdm-toggle__track">
                <span className="rdm-toggle__thumb" />
              </span>
              <span className="rdm-toggle__label">
                {urgent ? "Urgent" : "Normal"}
              </span>
            </button>
          </div>

          {error && <p className="rdm-error">{error}</p>}

          {done && (
            <div className="rdm-success">
              <FaCheckCircle /> Document request sent successfully!
            </div>
          )}
        </div>

        <div className="rdm-footer">
          <button className="rdm-btn rdm-btn--cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="rdm-btn rdm-btn--send"
            onClick={handleSubmit}
            disabled={submitting || done}
          >
            {submitting
              ? <><FaSpinner className="rdm-spinner" /> Sending…</>
              : "Send Request"
            }
          </button>
        </div>
      </div>

      <style>{`
        .rdm-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px; box-sizing: border-box;
        }
        .rdm-modal {
          background: #fff; border-radius: 18px;
          width: 100%; max-width: 480px;
          display: flex; flex-direction: column;
          box-shadow: 0 24px 64px rgba(0,0,0,0.18);
          overflow: hidden;
        }
        .rdm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 26px 16px; border-bottom: 1px solid #ebebf5;
        }
        .rdm-title { font-size: 18px; font-weight: 800; color: #111; margin: 0; }
        .rdm-close {
          background: none; border: none; color: #aaa; font-size: 17px;
          cursor: pointer; padding: 4px; border-radius: 6px;
          display: flex; align-items: center;
          transition: color 0.2s;
        }
        .rdm-close:hover { color: #333; }
        .rdm-body { padding: 20px 26px; display: flex; flex-direction: column; gap: 18px; }
        .rdm-field { display: flex; flex-direction: column; gap: 6px; position: relative; }
        .rdm-field--row {
          flex-direction: row; align-items: center;
          justify-content: space-between; gap: 14px;
          background: #f9f9fc; border-radius: 12px;
          padding: 14px 16px;
        }
        .rdm-label {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.08em; color: #aaa; text-transform: uppercase;
        }
        .rdm-optional { font-weight: 400; text-transform: none; letter-spacing: 0; }
        .rdm-hint { font-size: 12px; color: #999; margin-top: 2px; }
        .rdm-input {
          height: 44px; padding: 0 14px;
          border: 1px solid #e8e8f0; border-radius: 10px;
          font-size: 13px; color: #333; background: #f7f7fc;
          font-family: 'Inter', sans-serif; outline: none;
          box-sizing: border-box; transition: border-color 0.2s;
        }
        .rdm-input:focus { border-color: rgba(119,138,255,0.6); background: #fff; }
        .rdm-input--date { color: #555; }

        /* Dropdown */
        .rdm-drop-wrap { position: relative; }
        .rdm-drop-trigger {
          width: 100%; height: 44px;
          padding: 0 14px; display: flex; align-items: center; justify-content: space-between;
          border: 1px solid #e8e8f0; border-radius: 10px;
          background: #f7f7fc; cursor: pointer;
          font-family: 'Inter', sans-serif; font-size: 13px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .rdm-drop-trigger--open { border-color: rgba(119,138,255,0.6); background: #fff; }
        .rdm-drop-placeholder { color: #bbb; }
        .rdm-drop-value { color: #333; font-weight: 600; }
        .rdm-drop-chevron {
          font-size: 11px; color: #aaa;
          transition: transform 0.2s;
        }
        .rdm-drop-chevron--open { transform: rotate(180deg); }
        .rdm-drop-menu {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          background: #fff; border: 1px solid #e8e8f0;
          border-radius: 10px; z-index: 10;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .rdm-drop-item {
          width: 100%; padding: 12px 16px; text-align: left;
          background: none; border: none;
          font-size: 13px; color: #333; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .rdm-drop-item:hover { background: #f4f5fb; }
        .rdm-drop-item--active { background: rgba(119,138,255,0.08); color: rgba(119,138,255,1); font-weight: 600; }
        .rdm-drop-empty { padding: 12px 16px; font-size: 13px; color: #aaa; }

        /* Urgency toggle */
        .rdm-toggle {
          display: inline-flex; align-items: center; gap: 10px;
          background: none; border: none; cursor: pointer;
          padding: 0; font-family: 'Inter', sans-serif;
          flex-shrink: 0;
        }
        .rdm-toggle__track {
          width: 46px; height: 26px; border-radius: 99px;
          background: #e0e0ea; position: relative;
          transition: background 0.25s;
          display: flex; align-items: center;
        }
        .rdm-toggle--urgent .rdm-toggle__track { background: #ef4444; }
        .rdm-toggle__thumb {
          position: absolute; left: 3px;
          width: 20px; height: 20px; border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.18);
          transition: transform 0.25s;
        }
        .rdm-toggle--urgent .rdm-toggle__thumb { transform: translateX(20px); }
        .rdm-toggle__label {
          font-size: 13px; font-weight: 700;
          color: #666; transition: color 0.2s; min-width: 46px;
        }
        .rdm-toggle--urgent .rdm-toggle__label { color: #ef4444; }

        .rdm-error { font-size: 12px; color: #dc2626; margin: 0; }
        .rdm-success {
          display: flex; align-items: center; gap: 8px;
          background: #dcfce7; color: #15803d;
          font-size: 13px; font-weight: 700;
          padding: 10px 14px; border-radius: 10px;
        }
        .rdm-footer {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 16px 26px; border-top: 1px solid #ebebf5;
        }
        .rdm-btn {
          height: 40px; padding: 0 22px; border-radius: 10px;
          font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: all 0.2s; border: none;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .rdm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .rdm-btn--cancel {
          background: #f4f4f8; color: #555;
          border: 1px solid #e0e0ea;
        }
        .rdm-btn--cancel:hover:not(:disabled) { background: #ebebf5; }
        .rdm-btn--send {
          background: rgba(119,138,255,1); color: #fff;
          box-shadow: 0 4px 12px rgba(119,138,255,0.3);
        }
        .rdm-btn--send:hover:not(:disabled) {
          background: #6070e8; transform: translateY(-1px);
        }
        .rdm-spinner { animation: rdm-spin 0.8s linear infinite; }
        @keyframes rdm-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RequestDocumentModal;
