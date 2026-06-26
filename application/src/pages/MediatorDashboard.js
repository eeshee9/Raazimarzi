import React from "react";
import "./MediatorDashboard.css";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/authContext";
import logo from "../assets/Rzmzlogo.png";

const MediatorDashboard = () => {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const name = storedUser?.name || "Mediator";
  const approvalStatus = storedUser?.approvalStatus || "approved";

  const handleLogout = () => {
    logoutUser();
    navigate("/mediator/login", { replace: true });
  };

  return (
    <div className="md-wrapper">
      <header className="md-topbar">
        <div className="md-topbar-logo">
          <img src={logo} alt="RaaziMarzi" />
        </div>
        <div className="md-topbar-right">
          <span className={`md-badge md-badge-${approvalStatus}`}>
            {approvalStatus === "approved" ? "Approved Mediator" : approvalStatus}
          </span>
          <button className="md-logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Logout
          </button>
        </div>
      </header>

      <main className="md-content">
        <div className="md-card">
          <div className="md-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="14" x2="14" y2="14" /></svg>
          </div>
          <h1>Mediator Dashboard</h1>
          <p className="md-welcome">Welcome, {name}</p>
          <p className="md-message">This module is currently in progress. You'll be able to manage your mediator workflows here soon.</p>
          <p className="md-message-sub">Your cases, meetings, chats, and profile settings will appear here once this module is ready.</p>

          <div className="md-actions">
            <Link to="/" className="md-home-btn">Back to Home</Link>
            <button className="md-logout-btn-secondary" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MediatorDashboard;
