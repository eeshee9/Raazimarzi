import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  User, Mail, Phone, MapPin, Briefcase, Award, Edit2,
  FileText, Upload, CheckCircle, Clock, XCircle, Eye,
} from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import "./MediatorProfile.css";

const API = process.env.REACT_APP_API_URL || "/api";
const token = () => localStorage.getItem("token");

const EXPERTISE_OPTIONS = [
  "Family", "Property", "Banking", "Consumer", "Employment",
  "Commercial", "Financial", "Contractual",
];

const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Marathi", "Bengali", "Tamil",
  "Telugu", "Kannada", "Gujarati", "Punjabi", "Urdu",
];

// 6 docTypes stored in verificationDocs
const DOC_TYPES = [
  { key: "qualification_degree",    label: "Highest Qualification Degree", hint: "PDF, PNG (Max 5MB)" },
  { key: "mediation_certification", label: "Mediation / Arbitration Cert",  hint: "PDF only (Max 10MB)" },
  { key: "legal_license",           label: "Legal Practice License",         hint: "PDF, PNG (Max 5MB)" },
  { key: "govt_id",                 label: "ID Proof",                       hint: "PDF only (Max 10MB)" },
  { key: "bar_council_registration",label: "Bar Council Registration",       hint: "PDF, PNG (Max 5MB)" },
  { key: "police_verification",     label: "Police Verification Certificate",hint: "PDF only (Max 10MB)" },
];

const fmt = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const StatusDot = ({ status }) => {
  const map = {
    approved: "Approved",
    pending:  "Pending Review",
    rejected: "Rejected",
  };
  return (
    <span className={`mpf-status-badge ${status || "pending"}`}>
      <span className="mpf-status-dot" />
      {map[status] || "Pending Review"}
    </span>
  );
};

const DocStatus = ({ status }) => {
  if (!status) return <span className="mpf-doc-status none">Not Uploaded</span>;
  if (status === "verified") return <span className="mpf-doc-status verified">Verified</span>;
  if (status === "pending")  return <span className="mpf-doc-status pending">Pending Review</span>;
  if (status === "rejected") return <span className="mpf-doc-status rejected">Rejected</span>;
  return null;
};

/* ─────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────── */
const MediatorProfile = () => {
  const [profile,    setProfile]    = useState(null);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [editMode,   setEditMode]   = useState(false);
  const [toast,      setToast]      = useState("");

  // ── Fetch profile ─────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/mediator/profile`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!r.ok) throw new Error((await r.json()).message || "Failed to load profile");
      const data = await r.json();
      setProfile(data.profile);
      setStats(data.stats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // ── Switch to edit mode ───────────────────────────────────────────────────
  const handleEditSaved = (updatedProfile) => {
    setProfile((p) => ({ ...p, ...updatedProfile }));
    setEditMode(false);
    showToast("Profile updated successfully");
  };

  // ── Verification doc view ─────────────────────────────────────────────────
  const handleViewDoc = async (docType) => {
    try {
      const r = await fetch(`${API}/mediator/profile/documents/${docType}/url`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Failed to get URL");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e.message);
    }
  };

  // ── Inline doc upload (view mode) ─────────────────────────────────────────
  const [docUploading, setDocUploading] = useState({});
  const handleInlineDocUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploading((p) => ({ ...p, [docType]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API}/mediator/profile/documents/${docType}`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body:    fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Upload failed");
      // Refresh profile to show updated doc status
      await fetchProfile();
      showToast("Document uploaded. Pending admin verification.");
    } catch (e) {
      alert(e.message);
    } finally {
      setDocUploading((p) => ({ ...p, [docType]: false }));
      e.target.value = "";
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <MediatorLayout>
        <div className="mpf-page">
          <div className="mpf-center"><div className="mpf-spinner" /></div>
        </div>
      </MediatorLayout>
    );
  }

  if (error) {
    return (
      <MediatorLayout>
        <div className="mpf-page">
          <div className="mpf-center mpf-error-msg">{error}</div>
        </div>
      </MediatorLayout>
    );
  }

  return (
    <MediatorLayout>
      <div className="mpf-page">

        {editMode ? (
          <ProfileEditForm
            profile={profile}
            onSaved={handleEditSaved}
            onCancel={() => setEditMode(false)}
          />
        ) : (
          <ProfileView
            profile={profile}
            stats={stats}
            onEdit={() => setEditMode(true)}
            onViewDoc={handleViewDoc}
            docUploading={docUploading}
            onInlineDocUpload={handleInlineDocUpload}
          />
        )}

        {toast && <div className="mpf-toast">{toast}</div>}
      </div>
    </MediatorLayout>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   PROFILE VIEW
───────────────────────────────────────────────────────────────────────── */
const ProfileView = ({ profile, stats, onEdit, onViewDoc, docUploading, onInlineDocUpload }) => {
  const location = [profile.city, profile.state].filter(Boolean).join(", ");

  const getDocEntry = (docType) =>
    profile.verificationDocs?.find((d) => d.docType === docType) || null;

  const allVerified = DOC_TYPES.every((dt) => {
    const d = getDocEntry(dt.key);
    return d?.status === "verified";
  });

  return (
    <>
      {/* ── HEADER CARD ── */}
      <div className="mpf-header-card">
        <div className="mpf-avatar-wrap">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="mpf-avatar" />
          ) : (
            <div className="mpf-avatar-placeholder"><User size={40} /></div>
          )}
          <StatusDot status={profile.approvalStatus} />
        </div>

        <div className="mpf-header-info">
          <h1 className="mpf-name">{profile.name}</h1>
          <div className="mpf-meta-row">
            <span className="mpf-med-chip">{profile.mediatorId}</span>
            {location && (
              <span className="mpf-location">
                <MapPin size={13} style={{ display: "inline", verticalAlign: "middle" }} /> {location}
              </span>
            )}
          </div>

          <div className="mpf-stats-row">
            <div className="mpf-stat-card">
              <div className="mpf-stat-label">Total Cases</div>
              <div className="mpf-stat-value">{stats?.total ?? "—"}</div>
            </div>
            <div className="mpf-stat-card">
              <div className="mpf-stat-label">Active Cases</div>
              <div className="mpf-stat-value">{stats?.active ?? "—"}</div>
            </div>
            {stats?.successRate !== null && stats?.successRate !== undefined && (
              <div className="mpf-stat-card">
                <div className="mpf-stat-label">Success Rate</div>
                <div className="mpf-stat-value highlight">{stats.successRate}%</div>
              </div>
            )}
            <div className="mpf-stat-card">
              <div className="mpf-stat-label">Member Since</div>
              <div className="mpf-stat-value" style={{ fontSize: 14 }}>{fmt(profile.createdAt)}</div>
            </div>
          </div>
        </div>

        <button className="mpf-edit-btn" onClick={onEdit}>
          <Edit2 size={14} /> Edit
        </button>
      </div>

      {/* ── BODY ── */}
      <div className="mpf-body">

        {/* ── LEFT PANEL ── */}
        <div className="mpf-main">

          {/* About */}
          {profile.bio && (
            <div className="mpf-section">
              <h3 className="mpf-section-title">About {profile.name?.split(" ")[0]}</h3>
              <p className="mpf-bio-text">{profile.bio}</p>

              <div className="mpf-details-grid">
                {profile.qualifications && (
                  <div>
                    <div className="mpf-detail-label">Qualifications</div>
                    <div className="mpf-detail-value"><Award size={14} />{profile.qualifications}</div>
                  </div>
                )}
                {profile.experience && (
                  <div>
                    <div className="mpf-detail-label">Experience</div>
                    <div className="mpf-detail-value"><Briefcase size={14} />{profile.experience} Yrs Professional Practice</div>
                  </div>
                )}
                {profile.currentDesignation && (
                  <div>
                    <div className="mpf-detail-label">Current Designation</div>
                    <div className="mpf-detail-value">{profile.currentDesignation}</div>
                  </div>
                )}
                {profile.organization && (
                  <div>
                    <div className="mpf-detail-label">Organization</div>
                    <div className="mpf-detail-value">{profile.organization}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Languages */}
          {profile.languages?.length > 0 && (
            <div className="mpf-section">
              <h3 className="mpf-section-title">Languages</h3>
              <div className="mpf-tags">
                {profile.languages.map((l) => (
                  <span key={l} className="mpf-tag lang">{l}</span>
                ))}
              </div>
            </div>
          )}

          {/* Expertise */}
          {profile.expertiseAreas?.length > 0 && (
            <div className="mpf-section">
              <h3 className="mpf-section-title">Expertise Areas</h3>
              <div className="mpf-tags">
                {profile.expertiseAreas.map((e) => (
                  <span key={e} className="mpf-tag expertise">{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* Empty state if no bio yet */}
          {!profile.bio && !profile.qualifications && !profile.experience && (
            <div className="mpf-section">
              <div className="mpf-center" style={{ minHeight: 120, color: "#9ca3af", fontSize: 13 }}>
                No profile details yet. Click Edit to fill in your profile.
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="mpf-side">

          {/* Contact Info */}
          <div className="mpf-section">
            <h3 className="mpf-section-title">Contact Info</h3>
            <div className="mpf-contact-row">
              <div className="mpf-contact-icon"><Mail size={16} /></div>
              <div>
                <div className="mpf-contact-label">Email</div>
                <div className="mpf-contact-value">{profile.email}</div>
              </div>
            </div>
            {profile.phone && (
              <div className="mpf-contact-row">
                <div className="mpf-contact-icon"><Phone size={16} /></div>
                <div>
                  <div className="mpf-contact-label">Phone</div>
                  <div className="mpf-contact-value">{profile.phone}</div>
                </div>
              </div>
            )}
          </div>

          {/* Verification */}
          <div className="mpf-section">
            <div className="mpf-verif-header">
              <h3 className="mpf-section-title" style={{ margin: 0 }}>Verification</h3>
              {allVerified && (
                <div className="mpf-verif-status">
                  <CheckCircle size={14} /> Full Verified
                </div>
              )}
            </div>

            {DOC_TYPES.map((dt) => {
              const entry      = getDocEntry(dt.key);
              const isUploading = docUploading[dt.key];

              return (
                <div key={dt.key} className="mpf-doc-row">
                  <div className="mpf-doc-icon">
                    {entry?.status === "verified"
                      ? <CheckCircle size={16} color="#059669" />
                      : entry?.status === "pending"
                      ? <Clock size={16} color="#d97706" />
                      : entry?.status === "rejected"
                      ? <XCircle size={16} color="#dc2626" />
                      : <FileText size={16} />
                    }
                  </div>
                  <div className="mpf-doc-info">
                    <div className="mpf-doc-name">{dt.label}</div>
                    <DocStatus status={entry?.status} />
                    {isUploading && <div className="mpf-uploading">Uploading…</div>}
                  </div>
                  <div className="mpf-doc-actions">
                    {entry?.fileUrl !== undefined || entry ? (
                      <button
                        className="mpf-doc-btn"
                        onClick={() => onViewDoc(dt.key)}
                        disabled={isUploading}
                      >
                        <Eye size={12} style={{ display: "inline", marginRight: 3 }} />
                        View
                      </button>
                    ) : null}
                    <label className="mpf-doc-btn primary" style={{ cursor: "pointer" }}>
                      {entry ? "Replace" : "Upload"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        disabled={isUploading}
                        onChange={(e) => onInlineDocUpload(e, dt.key)}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   PROFILE EDIT FORM
───────────────────────────────────────────────────────────────────────── */
const ProfileEditForm = ({ profile, onSaved, onCancel }) => {
  const [form, setForm] = useState({
    name:               profile.name               || "",
    phone:              profile.phone              || "",
    dob:                profile.dob                || "",
    city:               profile.city               || "",
    state:              profile.state              || "",
    country:            profile.country            || "India",
    pincode:            profile.pincode            || "",
    qualifications:     profile.qualifications     || "",
    currentDesignation: profile.currentDesignation || "",
    organization:       profile.organization       || "",
    experience:         profile.experience         || "",
    bio:                profile.bio                || "",
    languages:          [...(profile.languages     || [])],
    expertiseAreas:     [...(profile.expertiseAreas || [])],
  });

  const [avatarPreview, setAvatarPreview] = useState(profile.avatar || "");
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState("");
  const [docUploading,  setDocUploading]  = useState({});
  const [docStatuses,   setDocStatuses]   = useState(
    Object.fromEntries((profile.verificationDocs || []).map((d) => [d.docType, d.status]))
  );
  const avatarInputRef = useRef(null);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const toggleExpertise = (area) => {
    setForm((p) => ({
      ...p,
      expertiseAreas: p.expertiseAreas.includes(area)
        ? p.expertiseAreas.filter((x) => x !== area)
        : [...p.expertiseAreas, area],
    }));
  };

  const toggleLanguage = (lang) => {
    setForm((p) => ({
      ...p,
      languages: p.languages.includes(lang)
        ? p.languages.filter((x) => x !== lang)
        : [...p.languages, lang],
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleDocUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploading((p) => ({ ...p, [docType]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API}/mediator/profile/documents/${docType}`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body:    fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Upload failed");
      setDocStatuses((p) => ({ ...p, [docType]: "pending" }));
    } catch (err) {
      alert(err.message);
    } finally {
      setDocUploading((p) => ({ ...p, [docType]: false }));
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
        else if (v !== undefined && v !== null) fd.append(k, v);
      });
      if (avatarFile) fd.append("avatar", avatarFile);

      const r = await fetch(`${API}/mediator/profile`, {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${token()}` },
        body:    fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Update failed");
      onSaved(data.profile);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="mpf-edit-wrap" onSubmit={handleSubmit}>

      {/* ── EDIT HEADER ── */}
      <div className="mpf-edit-header">
        <div className="mpf-edit-avatar-wrap">
          {avatarPreview ? (
            <img src={avatarPreview} alt="" className="mpf-edit-avatar" />
          ) : (
            <div className="mpf-edit-avatar-placeholder"><User size={28} /></div>
          )}
          <div className="mpf-avatar-overlay" onClick={() => avatarInputRef.current?.click()}>
            <Upload size={18} />
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="mpf-avatar-file-input"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="mpf-edit-header-info">
          <div className="mpf-edit-name">{form.name || profile.name}</div>
          <div className="mpf-edit-meta">
            <span className="mpf-med-chip">{profile.mediatorId}</span>
            <StatusDot status={profile.approvalStatus} />
          </div>
        </div>
      </div>

      {/* ── PERSONAL DETAILS ── */}
      <div className="mpf-form-section">
        <div className="mpf-form-section-title">
          <User size={16} /> Personal Details
        </div>
        <div className="mpf-form-grid">
          <div className="mpf-form-group">
            <label className="mpf-label req">Full Name</label>
            <input className="mpf-input" value={form.name} onChange={set("name")} placeholder="Enter your full name" required />
          </div>
          <div className="mpf-form-group">
            <label className="mpf-label">Email Address</label>
            <input className="mpf-input" value={profile.email} disabled placeholder="Email cannot be changed" />
          </div>
          <div className="mpf-form-group">
            <label className="mpf-label req">Phone Number</label>
            <div className="mpf-phone-wrap">
              <span className="mpf-phone-prefix">+91 |</span>
              <input
                className="mpf-input"
                value={form.phone}
                onChange={set("phone")}
                placeholder="9876543210"
                type="tel"
              />
            </div>
          </div>
          <div className="mpf-form-group">
            <label className="mpf-label">Date of Birth</label>
            <input
              className="mpf-input"
              type="text"
              value={form.dob}
              onChange={set("dob")}
              placeholder="DD/MM/YYYY"
            />
          </div>
        </div>

        {/* Languages */}
        <div className="mpf-form-group" style={{ marginTop: 16 }}>
          <label className="mpf-label">Languages Known</label>
          <div className="mpf-checkbox-grid">
            {LANGUAGE_OPTIONS.map((l) => (
              <label key={l} className="mpf-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.languages.includes(l)}
                  onChange={() => toggleLanguage(l)}
                />
                {l}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── ADDRESS ── */}
      <div className="mpf-form-section">
        <div className="mpf-form-section-title">
          <MapPin size={16} /> Address
        </div>
        <div className="mpf-form-grid">
          <div className="mpf-form-group">
            <label className="mpf-label">Pincode</label>
            <input className="mpf-input" value={form.pincode} onChange={set("pincode")} placeholder="Enter pincode" />
          </div>
          <div className="mpf-form-group">
            <label className="mpf-label">City</label>
            <input className="mpf-input" value={form.city} onChange={set("city")} placeholder="Enter city" />
          </div>
          <div className="mpf-form-group">
            <label className="mpf-label">State</label>
            <input className="mpf-input" value={form.state} onChange={set("state")} placeholder="Enter state" />
          </div>
          <div className="mpf-form-group">
            <label className="mpf-label">Country</label>
            <input className="mpf-input" value={form.country} onChange={set("country")} placeholder="India" />
          </div>
        </div>
      </div>

      {/* ── PROFESSIONAL DETAILS ── */}
      <div className="mpf-form-section">
        <div className="mpf-form-section-title">
          <Briefcase size={16} /> Professional Details
        </div>
        <div className="mpf-form-grid">
          <div className="mpf-form-group">
            <label className="mpf-label req">Highest Qualification</label>
            <input className="mpf-input" value={form.qualifications} onChange={set("qualifications")} placeholder="LL.M. in Dispute Resolution" required />
          </div>
          <div className="mpf-form-group">
            <label className="mpf-label">Current Designation</label>
            <input className="mpf-input" value={form.currentDesignation} onChange={set("currentDesignation")} placeholder="Enter Post" />
          </div>
          <div className="mpf-form-group">
            <label className="mpf-label">Organization / Firm</label>
            <input className="mpf-input" value={form.organization} onChange={set("organization")} placeholder="Company Name" />
          </div>
          <div className="mpf-form-group">
            <label className="mpf-label req">Years of Experience</label>
            <input className="mpf-input" type="number" min="0" value={form.experience} onChange={set("experience")} placeholder="YY" required />
          </div>
        </div>

        {/* Expertise checkboxes */}
        <div className="mpf-form-group" style={{ marginTop: 16 }}>
          <label className="mpf-label req">Areas of Expertise</label>
          <div className="mpf-checkbox-grid">
            {EXPERTISE_OPTIONS.map((opt) => (
              <label key={opt} className="mpf-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.expertiseAreas.includes(opt)}
                  onChange={() => toggleExpertise(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── DOCUMENT VERIFICATION ── */}
      <div className="mpf-form-section">
        <div className="mpf-form-section-title">
          <FileText size={16} /> Document Verification
        </div>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: -8, marginBottom: 16 }}>
          Upload replaces the existing document and resets verification status to pending admin review.
        </p>
        <div className="mpf-doc-upload-grid">
          {DOC_TYPES.map((dt) => {
            const status      = docStatuses[dt.key];
            const isUploading = docUploading[dt.key];
            return (
              <label key={dt.key} className={`mpf-upload-zone ${status ? "has-file" : ""}`}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={isUploading}
                  onChange={(e) => handleDocUpload(e, dt.key)}
                />
                <div className="mpf-upload-zone-icon">
                  {status === "verified"
                    ? <CheckCircle size={24} />
                    : status === "rejected"
                    ? <XCircle size={24} />
                    : <FileText size={24} />
                  }
                </div>
                <div className="mpf-upload-zone-label">{dt.label}</div>
                {isUploading
                  ? <div className="mpf-uploading-text">Uploading…</div>
                  : <div className="mpf-upload-zone-hint">Drag or <span>browse</span><br />{dt.hint}</div>
                }
                {status && !isUploading && (
                  <div className={`mpf-upload-zone-status ${status}`}>
                    {status === "verified" ? "Verified" : status === "pending" ? "Pending Review" : "Rejected — Re-upload"}
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* ── ADDITIONAL INFO ── */}
      <div className="mpf-form-section">
        <div className="mpf-form-section-title">
          <Award size={16} /> Additional Information
        </div>
        <div className="mpf-form-group">
          <label className="mpf-label">Short Bio</label>
          <textarea
            className="mpf-textarea"
            value={form.bio}
            onChange={set("bio")}
            placeholder="Briefly describe your mediation approach and notable achievements…"
            rows={4}
          />
        </div>
      </div>

      {/* ── FORM ACTIONS ── */}
      {saveError && <div className="mpf-save-error">{saveError}</div>}
      <div className="mpf-form-actions">
        <button type="button" className="mpf-btn-cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="mpf-btn-save" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
};

export default MediatorProfile;
