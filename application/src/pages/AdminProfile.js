// src/pages/AdminProfile.js — adp- namespace
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell, FaSearch, FaShieldAlt, FaUserCircle, FaEnvelope, FaPhoneAlt,
  FaKey, FaClock, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaHistory,
} from "react-icons/fa";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import AdminSubAdminsPanel from "../components/AdminSubAdminsPanel";
import "./AdminProfile.css";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "—";

const displayId = (id = "") => `ADM-${id.slice(-6).toUpperCase()}`;

const ACTION_LABELS = {
  created:              "Sub-admin account created",
  permissions_updated:  "Permissions updated",
  disabled:             "Account disabled",
  enabled:              "Account enabled",
  login:                "System Login",
  profile_updated:      "Profile updated",
};

const TABS = [
  { key: "profile",  label: "Profile" },
  { key: "security", label: "Security" },
  { key: "sub-admins", label: "Sub Admins" },
  { key: "activity",  label: "Activity Logs" },
];

/* ════════════════════════════════════════════════════════
   PROFILE TAB
════════════════════════════════════════════════════════ */
const ProfileTab = ({ profile, stats, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName]   = useState(profile.name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => { setName(profile.name || ""); setPhone(profile.phone || ""); }, [profile]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");
    try {
      await api.patch("/admin/profile", { name, phone });
      await onSaved();
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl =
    profile.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || "Admin")}&background=5b21b6&color=fff&size=120`;

  return (
    <div className="adp-tab-grid">
      <div className="adp-left-col">
        <div className="adp-profile-card">
          <div className="adp-profile-banner" />
          <div className="adp-profile-body">
            <img src={avatarUrl} alt={profile.name} className="adp-avatar" />
            <h3 className="adp-profile-name">{profile.name}</h3>
            <div className="adp-chip-row">
              <span className="adp-chip adp-chip--id">ID: {displayId(profile._id)}</span>
              <span className={`adp-chip ${profile.isActive ? "adp-chip--active" : "adp-chip--inactive"}`}>
                {profile.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            {!editing ? (
              <>
                <div className="adp-info-row"><FaUserCircle /> <span>{profile.role === "admin" ? "Administrator" : profile.role}</span></div>
                <div className="adp-info-row"><FaEnvelope /> <span>{profile.email}</span></div>
                <div className="adp-info-row"><FaPhoneAlt /> <span>{profile.phone || "Not set"}</span></div>
                <button className="adp-edit-btn" onClick={() => setEditing(true)}>Edit Profile</button>
              </>
            ) : (
              <div className="adp-edit-form">
                <label className="adp-field-label">Full Name</label>
                <input className="adp-input" value={name} onChange={(e) => setName(e.target.value)} />
                <label className="adp-field-label">Phone Number</label>
                <input className="adp-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                {error && <p className="adp-error">{error}</p>}
                <div className="adp-edit-actions">
                  <button className="adp-btn-secondary" onClick={() => { setEditing(false); setError(""); }} disabled={saving}>Cancel</button>
                  <button className="adp-btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="adp-stats-card">
          <h4 className="adp-card-subtitle">System Statistics</h4>
          <div className="adp-stat-row">
            <span>Cases Resolved</span>
            <strong>{stats.resolvedCases}/{stats.totalCases}</strong>
          </div>
          <div className="adp-stat-bar">
            <div
              className="adp-stat-bar-fill"
              style={{ width: `${stats.totalCases ? Math.min(100, (stats.resolvedCases / stats.totalCases) * 100) : 0}%` }}
            />
          </div>
          <div className="adp-stat-row">
            <span>Avg. Resolution Time</span>
            <strong>{stats.avgResponseHours !== null ? `${stats.avgResponseHours}h` : "Not enough data yet"}</strong>
          </div>
        </div>
      </div>

      <div className="adp-right-card">
        <div className="adp-right-card-head">
          <div>
            <h4 className="adp-card-title">Account Information</h4>
            <p className="adp-card-sub">System authentication and logging details</p>
          </div>
          <FaShieldAlt className="adp-shield-icon" />
        </div>

        <div className="adp-info-grid">
          <div>
            <p className="adp-info-label">USERNAME</p>
            <p className="adp-info-value">{profile.username || displayId(profile._id)}</p>
          </div>
          <div>
            <p className="adp-info-label">PRIMARY EMAIL</p>
            <p className="adp-info-value">{profile.email}</p>
          </div>
          <div>
            <p className="adp-info-label">PHONE NUMBER</p>
            <p className="adp-info-value">{profile.phone || "Not set"}</p>
          </div>
          <div>
            <p className="adp-info-label">TWO-FACTOR AUTH</p>
            <p className={`adp-info-value adp-2fa ${profile.twoFactorEnabled ? "on" : "off"}`}>
              {profile.twoFactorEnabled ? <><FaCheckCircle /> Enabled</> : <><FaTimesCircle /> Disabled</>}
            </p>
          </div>
          <div>
            <p className="adp-info-label">CREATED DATE</p>
            <p className="adp-info-value">{fmtDate(profile.createdAt)}</p>
          </div>
          <div>
            <p className="adp-info-label">LAST LOGIN</p>
            <p className="adp-info-value">{fmtDateTime(profile.lastLoginAt)}</p>
          </div>
          <div>
            <p className="adp-info-label">CURRENT SESSION IP</p>
            <p className="adp-info-value">{profile.lastLoginIP || "—"}</p>
          </div>
          <div>
            <p className="adp-info-label">ACCOUNT ROLE</p>
            <p className="adp-info-value">{profile.role === "admin" ? "Global Administrator" : profile.role}</p>
          </div>
        </div>

        <div className="adp-note">
          This account has global administrative privileges. Actions performed here are logged and visible
          in the Activity Logs tab. Ensure security protocols are followed when updating account information.
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   SECURITY TAB
════════════════════════════════════════════════════════ */
const SecurityTab = ({ profile, onSaved }) => {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const toggle2FA = async () => {
    setUpdating(true); setError("");
    try {
      await api.patch("/admin/profile", { twoFactorEnabled: !profile.twoFactorEnabled });
      await onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update two-factor setting");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="adp-security-grid">
      <div className="adp-right-card">
        <h4 className="adp-card-title">Two-Factor Authentication</h4>
        <p className="adp-card-sub">
          Adds an extra verification step at login. {profile.twoFactorEnabled ? "Currently enabled for this account." : "Currently disabled."}
        </p>
        {error && <p className="adp-error">{error}</p>}
        <button className={profile.twoFactorEnabled ? "adp-btn-secondary" : "adp-btn-primary"} onClick={toggle2FA} disabled={updating}>
          {updating ? "Updating…" : profile.twoFactorEnabled ? "Disable Two-Factor Auth" : "Enable Two-Factor Auth"}
        </button>
      </div>

      <div className="adp-right-card">
        <h4 className="adp-card-title">Login &amp; Session</h4>
        <div className="adp-info-grid">
          <div>
            <p className="adp-info-label"><FaClock /> LAST LOGIN</p>
            <p className="adp-info-value">{fmtDateTime(profile.lastLoginAt)}</p>
          </div>
          <div>
            <p className="adp-info-label"><FaMapMarkerAlt /> SESSION IP</p>
            <p className="adp-info-value">{profile.lastLoginIP || "—"}</p>
          </div>
          <div>
            <p className="adp-info-label"><FaKey /> LOGIN METHOD</p>
            <p className="adp-info-value">{profile.twoFactorEnabled ? "Multi-Factor Authenticated" : "Password Only"}</p>
          </div>
        </div>
        <div className="adp-note">
          Password changes are handled through the Forgot Password flow on the login page for security reasons.
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   ACTIVITY LOGS TAB (platform-wide)
════════════════════════════════════════════════════════ */
const ActivityLogsTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get("/admin/activity-logs", { params: { page, limit: 20 } })
      .then((res) => { if (active) { setLogs(res.data.logs); setPages(res.data.pages); } })
      .catch((err) => { if (active) setError(err.response?.data?.message || "Failed to load activity logs"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  if (loading) return <div className="adp-loading">Loading activity logs…</div>;
  if (error) return <div className="adp-error-block">{error}</div>;

  return (
    <div className="adp-right-card">
      <div className="adp-right-card-head">
        <div>
          <h4 className="adp-card-title">Platform Activity Logs</h4>
          <p className="adp-card-sub">All recorded sub-admin account events across the platform.</p>
        </div>
        <FaHistory className="adp-shield-icon" />
      </div>

      {logs.length === 0 ? (
        <p className="adp-empty">No activity recorded yet.</p>
      ) : (
        <div className="adp-activity-list">
          {logs.map((l) => (
            <div key={l._id} className="adp-activity-item">
              <span className="adp-activity-dot" />
              <div>
                <p className="adp-activity-time">{fmtDateTime(l.createdAt)}</p>
                <p className="adp-activity-desc">
                  <strong>{ACTION_LABELS[l.action] || l.action}</strong> — {l.subAdminName}
                </p>
                <p className="adp-activity-meta">{l.description} · by {l.actorName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="adp-pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */
const AdminProfile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalCases: 0, resolvedCases: 0, avgResponseHours: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const adminName   = localStorage.getItem("name") || "Admin";
  const adminAvatar = localStorage.getItem("avatar") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=778aff&color=fff&size=80`;

  const fetchProfile = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/admin/profile");
      setProfile(res.data.profile);
      setStats(res.data.stats);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login"); return; }
    fetchProfile();
  }, [navigate, fetchProfile]);

  return (
    <div className="adp-root">
      <AdminSidebar />
      <div className="adp-main">
        <header className="adp-topbar">
          <form className="adp-search" onSubmit={(e) => e.preventDefault()}>
            <FaSearch className="adp-search-icon" />
            <input className="adp-search-input" placeholder="Search cases, mediators or meetings…" />
          </form>
          <div className="adp-topbar-right">
            <button className="adp-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="adp-admin-avatar" />
          </div>
        </header>

        <div className="adp-body">
          <div className="adp-page-head">
            <h2 className="adp-page-title">Admin Profile</h2>
            <p className="adp-page-sub">Manage account settings, security preferences, and sub-admin access.</p>
          </div>

          <div className="adp-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`adp-tab ${activeTab === tab.key ? "adp-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="adp-loading">Loading profile…</div>
          ) : error ? (
            <div className="adp-error-block">{error}</div>
          ) : (
            <>
              {activeTab === "profile"     && <ProfileTab profile={profile} stats={stats} onSaved={fetchProfile} />}
              {activeTab === "security"    && <SecurityTab profile={profile} onSaved={fetchProfile} />}
              {activeTab === "sub-admins"  && <AdminSubAdminsPanel />}
              {activeTab === "activity"    && <ActivityLogsTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
