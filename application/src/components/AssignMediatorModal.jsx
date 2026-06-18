// src/components/AssignMediatorModal.jsx
import React, { useState, useEffect } from "react";
import { FaTimes, FaSearch, FaSpinner, FaCheckCircle } from "react-icons/fa";
import api from "../api/axios";

const AssignMediatorModal = ({ isOpen, onClose, caseId, onAssigned }) => {
  const [mediators, setMediators]   = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSearch(""); setSelected(null); setDone(false); setError("");
    setLoading(true);
    api.get("/admin/staff/mediators")
      .then(res => {
        const list = res.data.mediators || [];
        setMediators(list);
        setFiltered(list);
      })
      .catch(() => setError("Could not load mediators."))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? mediators.filter(m =>
            m.name?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q) ||
            (m.expertise || "").toLowerCase().includes(q)
          )
        : mediators
    );
  }, [search, mediators]);

  const handleAssign = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      await api.patch(`/admin/cases/${caseId}/assign-neutral`, {
        neutralId:   selected._id,
        neutralType: "mediator",
      });
      setDone(true);
      if (onAssigned) onAssigned(selected);
      setTimeout(onClose, 1400);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign mediator.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="amm-overlay" onClick={onClose}>
      <div className="amm-modal" onClick={e => e.stopPropagation()}>

        <div className="amm-header">
          <h2 className="amm-title">Assign Mediator</h2>
          <button className="amm-close" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="amm-search-wrap">
          <FaSearch className="amm-search-icon" />
          <input
            className="amm-search"
            placeholder="Search by name, email or expertise…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="amm-list-wrap">
          {loading && (
            <div className="amm-center"><FaSpinner className="amm-spinner" /> Loading…</div>
          )}

          {!loading && error && <p className="amm-error">{error}</p>}

          {!loading && !error && filtered.length === 0 && (
            <p className="amm-empty">No mediators found.</p>
          )}

          {!loading && !error && filtered.length > 0 && (
            <table className="amm-table">
              <thead>
                <tr>
                  <th></th>
                  <th>MEDIATOR</th>
                  <th>EXPERTISE</th>
                  <th>CASES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr
                    key={m._id}
                    className={`amm-row ${selected?._id === m._id ? "amm-row--active" : ""}`}
                    onClick={() => setSelected(m)}
                  >
                    <td>
                      <div className="amm-radio">
                        {selected?._id === m._id && <div className="amm-radio__dot" />}
                      </div>
                    </td>
                    <td>
                      <div className="amm-mediator">
                        {m.avatar
                          ? <img src={m.avatar} alt={m.name} className="amm-avatar" />
                          : <div className="amm-avatar amm-avatar--ph">{m.name?.[0]?.toUpperCase()}</div>
                        }
                        <div>
                          <p className="amm-name">{m.name}</p>
                          <p className="amm-email">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="amm-expertise">{m.expertise || "General"}</td>
                    <td className="amm-cases">{m.casesHandled ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {done && (
          <div className="amm-success">
            <FaCheckCircle /> Mediator assigned successfully!
          </div>
        )}

        <div className="amm-footer">
          <button className="amm-btn amm-btn--cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="amm-btn amm-btn--assign"
            onClick={handleAssign}
            disabled={!selected || submitting || done}
          >
            {submitting ? <><FaSpinner className="amm-spinner" /> Assigning…</> : "Assign Mediator"}
          </button>
        </div>
      </div>

      <style>{`
        .amm-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px; box-sizing: border-box;
        }
        .amm-modal {
          background: #fff; border-radius: 18px;
          width: 100%; max-width: 700px; max-height: 88vh;
          display: flex; flex-direction: column;
          box-shadow: 0 24px 64px rgba(0,0,0,0.18);
          overflow: hidden;
        }
        .amm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 26px 16px;
          border-bottom: 1px solid #ebebf5;
        }
        .amm-title { font-size: 18px; font-weight: 800; color: #111; margin: 0; }
        .amm-close {
          background: none; border: none; color: #aaa; font-size: 17px;
          cursor: pointer; padding: 4px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.2s;
        }
        .amm-close:hover { color: #333; }
        .amm-search-wrap {
          position: relative; padding: 14px 26px;
          border-bottom: 1px solid #f4f4f8;
        }
        .amm-search-icon {
          position: absolute; left: 40px; top: 50%;
          transform: translateY(-50%); color: #bbb; font-size: 13px;
          pointer-events: none;
        }
        .amm-search {
          width: 100%; height: 40px;
          padding: 0 14px 0 36px;
          border: 1px solid #e8e8f0; border-radius: 99px;
          font-size: 13px; color: #333; background: #f7f7fc;
          font-family: 'Inter', sans-serif; outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .amm-search:focus { border-color: rgba(119,138,255,0.6); background: #fff; }
        .amm-list-wrap { flex: 1; overflow-y: auto; padding: 0 26px; }
        .amm-center {
          display: flex; align-items: center; gap: 10px;
          padding: 40px 0; justify-content: center;
          color: #999; font-size: 14px;
        }
        .amm-error { color: #dc2626; font-size: 13px; padding: 20px 0; }
        .amm-empty { color: #aaa; font-size: 13px; padding: 30px 0; text-align: center; }
        .amm-table { width: 100%; border-collapse: collapse; }
        .amm-table thead th {
          font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
          color: #bbb; text-transform: uppercase;
          padding: 10px 10px 8px; text-align: left;
          border-bottom: 1px solid #f4f4f8;
        }
        .amm-row { cursor: pointer; transition: background 0.15s; }
        .amm-row:hover { background: #f8f8ff; }
        .amm-row--active { background: rgba(119,138,255,0.06) !important; }
        .amm-row td { padding: 12px 10px; border-bottom: 1px solid #f8f8fc; vertical-align: middle; }
        .amm-radio {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid #d0d0e0;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .amm-row--active .amm-radio { border-color: rgba(119,138,255,1); }
        .amm-radio__dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: rgba(119,138,255,1);
        }
        .amm-mediator { display: flex; align-items: center; gap: 10px; }
        .amm-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          object-fit: cover; flex-shrink: 0;
          border: 2px solid rgba(119,138,255,0.18);
        }
        .amm-avatar--ph {
          background: #f0f0f8; display: flex;
          align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: #778aff;
        }
        .amm-name { font-size: 13px; font-weight: 700; color: #222; }
        .amm-email { font-size: 11px; color: #aaa; margin-top: 1px; }
        .amm-expertise { font-size: 12px; color: #666; }
        .amm-rating { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #333; }
        .amm-star { color: #f59e0b; font-size: 11px; }
        .amm-cases { font-size: 13px; color: #555; }
        .amm-success {
          display: flex; align-items: center; gap: 8px;
          background: #dcfce7; color: #15803d;
          font-size: 13px; font-weight: 700;
          padding: 10px 26px; border-top: 1px solid #f4f4f8;
        }
        .amm-footer {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 16px 26px; border-top: 1px solid #ebebf5;
        }
        .amm-btn {
          height: 40px; padding: 0 22px; border-radius: 10px;
          font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: all 0.2s; border: none;
        }
        .amm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .amm-btn--cancel {
          background: #f4f4f8; color: #555;
          border: 1px solid #e0e0ea;
        }
        .amm-btn--cancel:hover:not(:disabled) { background: #ebebf5; }
        .amm-btn--assign {
          background: rgba(119,138,255,1); color: #fff;
          box-shadow: 0 4px 12px rgba(119,138,255,0.3);
        }
        .amm-btn--assign:hover:not(:disabled) {
          background: #6070e8;
          transform: translateY(-1px);
        }
        .amm-spinner { animation: amm-spin 0.8s linear infinite; }
        @keyframes amm-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AssignMediatorModal;
