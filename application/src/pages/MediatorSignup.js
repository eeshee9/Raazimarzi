import React, { useState } from "react";
import "./MediatorSignup.css";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import logo from "../assets/Rzmzlogo.png";
import heroImg from "../assets/icons/mediator-login.png";

const EXPERTISE_OPTIONS = ["Family", "Property", "Banking", "Consumer", "Employment", "Commercial", "Financial", "Contractual"];
const LANGUAGE_OPTIONS = ["English", "Hindi", "Marathi", "Gujarati", "Tamil", "Telugu", "Bengali", "Punjabi"];

const DOC_FIELDS = [
  { name: "qualificationDegree",    label: "Highest Qualification Degree",        required: true,  hint: "PDF, PNG (MAX 5MB)" },
  { name: "certification",          label: "Mediation / Arbitration Certification", required: true, hint: "PDF ONLY (MAX 10MB)" },
  { name: "legalLicense",           label: "Legal Practice License",              required: true,  hint: "PDF, PNG (MAX 5MB)" },
  { name: "govtId",                 label: "Aadhaar / Passport / Driving License (Any One)", required: true, hint: "PDF ONLY (MAX 10MB)" },
  { name: "barCouncilRegistration", label: "Bar Council Registration",            required: false, hint: "PDF, PNG (MAX 5MB)" },
  { name: "policeVerification",     label: "Police Verification Certificate",     required: false, hint: "PDF ONLY (MAX 10MB)" },
];

const emptyForm = {
  name: "", email: "", phone: "", dob: "", password: "", confirmPassword: "",
  languages: [],
  pincode: "", city: "", state: "", country: "India",
  qualification: "", currentDesignation: "", organization: "", experience: "",
  expertise: [],
  bio: "",
  certifyInfo: false,
  agreeTerms: false,
};

const MediatorSignup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setError("");
  };

  const toggleInList = (key, val) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val],
    }));
  };

  const handleFile = (field) => (e) => {
    const file = e.target.files[0];
    if (file) setFiles((f) => ({ ...f, [field]: file }));
  };

  const handleDrop = (field) => (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setFiles((f) => ({ ...f, [field]: file }));
  };

  const validate = () => {
    if (!form.name || !form.email || !form.phone || !form.dob || !form.password) {
      return "Please fill all required personal details.";
    }
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    if (!form.pincode || !form.city) return "Pincode and city are required.";
    if (!form.qualification || !form.experience) return "Highest qualification and years of experience are required.";
    if (form.expertise.length === 0) return "Select at least one area of expertise.";
    for (const f of DOC_FIELDS) {
      if (f.required && !files[f.name]) return `${f.label} is required.`;
    }
    if (!form.certifyInfo) return "Please certify that the information provided is accurate.";
    if (!form.agreeTerms) return "Please agree to the Terms of Service and Privacy Policy.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("name", form.name);
      data.append("email", form.email);
      data.append("phone", form.phone);
      data.append("dob", form.dob);
      data.append("password", form.password);
      data.append("languages", JSON.stringify(form.languages));
      data.append("pincode", form.pincode);
      data.append("city", form.city);
      data.append("state", form.state);
      data.append("country", form.country);
      data.append("qualification", form.qualification);
      data.append("currentDesignation", form.currentDesignation);
      data.append("organization", form.organization);
      data.append("experience", form.experience);
      data.append("expertise", JSON.stringify(form.expertise));
      data.append("bio", form.bio);
      data.append("certifyInfo", form.certifyInfo);
      data.append("agreeTerms", form.agreeTerms);
      Object.entries(files).forEach(([field, file]) => data.append(field, file));

      await api.post("/auth/mediator-signup", data, { headers: { "Content-Type": "multipart/form-data" } });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="ms-wrapper">
        <div className="ms-submitted-card">
          <div className="ms-submitted-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2>Application Submitted</h2>
          <p>Application submitted successfully. Our team will review your profile and documents.</p>
          <button className="auth-btn" onClick={() => navigate("/")}>Back to Home</button>
          <div className="ms-progress-track">
            <div className="ms-progress-step completed">
              <div className="ms-step-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <span>APPLIED</span>
            </div>
            <div className="ms-progress-line active" />
            <div className="ms-progress-step active">
              <div className="ms-step-circle"><span /></div>
              <span>REVIEW</span>
            </div>
            <div className="ms-progress-line" />
            <div className="ms-progress-step">
              <div className="ms-step-circle"><span /></div>
              <span>VERIFIED</span>
            </div>
          </div>
          <div className="ms-next-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <div>
              <strong>What happens next?</strong>
              <p>Our compliance team typically reviews mediator applications within 3-5 business days. You'll receive an email confirmation at your registered address.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ms-wrapper">
      {/* TOP NAV */}
      <nav className="ms-nav">
        <div className="ms-nav-logo">
          <img src={logo} alt="RaaziMarzi" />
        </div>
        <Link to="/mediator/login" className="ms-nav-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back to Login
        </Link>
      </nav>

      {/* HERO BANNER */}
      <div className="ms-hero">
        <div className="ms-hero-image">
          <img src={heroImg} alt="Mediation" />
          <div className="ms-hero-overlay" />
        </div>
        <div className="ms-hero-text">
          <h1>Apply as Mediator</h1>
          <p>New to RaaziMarzi? Submit your credentials and complete verification to join our panel of certified mediators.</p>
        </div>
      </div>

      {/* FORM CARD */}
      <div className="ms-card">
        {error && <div className="auth-error" style={{ marginBottom: 20 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Personal Details */}
          <div className="ms-section">
            <h3 className="ms-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>
              Personal Details
            </h3>
            <div className="ms-grid-2">
              <div className="form-group">
                <label>Full Name*</label>
                <div className="input-wrap">
                  <input name="name" placeholder="Enter your full name" value={form.name} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address*</label>
                <div className="input-wrap">
                  <input type="email" name="email" placeholder="john@example.com" value={form.email} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number*</label>
                <div className="input-wrap has-prefix">
                  <span className="phone-prefix">+91 |</span>
                  <input name="phone" placeholder="9876543210" value={form.phone} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Date of Birth*</label>
                <div className="input-wrap">
                  <input type="date" name="dob" value={form.dob} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Password*</label>
                <div className="input-wrap">
                  <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
                  <span className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password*</label>
                <div className="input-wrap">
                  <input type={showConfirm ? "text" : "password"} name="confirmPassword" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
                  <span className="input-icon-right" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                  </span>
                </div>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Languages Known</label>
              <div className="ms-expertise-row">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <button key={opt} type="button"
                    className={`ms-expertise-chip${form.languages.includes(opt) ? " selected" : ""}`}
                    onClick={() => toggleInList("languages", opt)}>
                    <span className="ms-chip-check">
                      {form.languages.includes(opt)
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        : <span className="ms-chip-empty" />}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="ms-section">
            <h3 className="ms-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              Address
            </h3>
            <div className="ms-grid-2">
              <div className="form-group">
                <label>Pincode*</label>
                <div className="input-wrap">
                  <input name="pincode" placeholder="Enter pincode" value={form.pincode} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>City*</label>
                <div className="input-wrap">
                  <input name="city" placeholder="Enter city" value={form.city} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>State</label>
                <div className="input-wrap">
                  <input name="state" placeholder="Enter state" value={form.state} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Country</label>
                <div className="input-wrap">
                  <input name="country" placeholder="Enter country" value={form.country} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="ms-section">
            <h3 className="ms-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
              Professional Details
            </h3>
            <div className="ms-grid-2">
              <div className="form-group">
                <label>Highest Qualification*</label>
                <div className="input-wrap">
                  <input name="qualification" placeholder="LL.M. in Dispute Resolution" value={form.qualification} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Current Designation</label>
                <div className="input-wrap">
                  <input name="currentDesignation" placeholder="Enter Post" value={form.currentDesignation} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Organization/Firm</label>
                <div className="input-wrap">
                  <input name="organization" placeholder="Company Name" value={form.organization} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Years of Experience*</label>
                <div className="input-wrap">
                  <input name="experience" placeholder="YY" type="number" min="0" value={form.experience} onChange={handleChange} required />
                </div>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Areas of Expertise*</label>
              <div className="ms-expertise-row">
                {EXPERTISE_OPTIONS.map((opt) => (
                  <button
                    key={opt} type="button"
                    className={`ms-expertise-chip${form.expertise.includes(opt) ? " selected" : ""}`}
                    onClick={() => toggleInList("expertise", opt)}
                  >
                    <span className="ms-chip-check">
                      {form.expertise.includes(opt)
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        : <span className="ms-chip-empty" />}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Document Verification */}
          <div className="ms-section">
            <h3 className="ms-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Document Verification
            </h3>
            <div className="ms-grid-2">
              {DOC_FIELDS.map((f) => (
                <div className="form-group" key={f.name}>
                  <label>{f.label}{f.required ? "*" : ""}</label>
                  <div
                    className={`ms-dropzone${files[f.name] ? " has-file" : ""}`}
                    onClick={() => document.getElementById(`ms-file-${f.name}`).click()}
                    onDrop={handleDrop(f.name)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <input id={`ms-file-${f.name}`} type="file" accept=".pdf,.png,.jpg,.jpeg" hidden onChange={handleFile(f.name)} />
                    {files[f.name] ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12" /></svg>
                        <span>{files[f.name].name}</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        <p>Drag or <span className="ms-browse">browse</span></p>
                        <small>{f.hint}</small>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="ms-section">
            <h3 className="ms-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              Additional Information
            </h3>
            <div className="form-group">
              <label>Short Bio</label>
              <textarea
                name="bio" rows={5}
                placeholder="Briefly describe your mediation approach and notable achievements..."
                value={form.bio} onChange={handleChange}
                className="ms-textarea"
              />
            </div>
          </div>

          {/* Declarations */}
          <div className="ms-declarations">
            <label className="ms-declare-label">
              <input type="checkbox" name="certifyInfo" checked={form.certifyInfo} onChange={handleChange} />
              <span className="ms-declare-check" />
              I certify that all the information provided above is accurate and I am authorized to practice mediation.
            </label>
            <label className="ms-declare-label">
              <input type="checkbox" name="agreeTerms" checked={form.agreeTerms} onChange={handleChange} />
              <span className="ms-declare-check" />
              I have read and agree to the <Link to="/mediator-terms" className="auth-link">Terms of Service</Link> and <Link to="/mediator-terms" className="auth-link">Privacy Policy</Link>.
            </label>
          </div>

          {/* Actions */}
          <div className="ms-actions">
            <button type="button" className="ms-cancel-btn" onClick={() => navigate("/mediator/login")}>Cancel</button>
            <button type="submit" className="auth-btn ms-submit-btn" disabled={loading}>
              {loading ? <span className="btn-loader" /> : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MediatorSignup;
