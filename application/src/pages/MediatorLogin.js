import React, { useState } from "react";
import "./Login.css";
import "./MediatorLogin.css";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import mediatorLoginBg from "../assets/icons/mediator-login.png";

const MediatorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAccessDenied(false);
    try {
      const res = await api.post("/auth/login", { email, password });
      const user = res.data?.user;

      if (!res.data?.success || !res.data?.token || !user) {
        setError("Login failed. Please try again.");
        return;
      }

      if (user.role !== "mediator") {
        setAccessDenied(true);
        return;
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("email", user.email);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/mediator/dashboard", { replace: true });
    } catch (err) {
      if (err.response?.status === 403 && err.response.data?.approvalStatus) {
        setError(err.response.data.message);
      } else if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else if (err.response?.status === 400) {
        setError(err.response.data.message);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="auth-wrapper">
        <div className="auth-left">
          <div className="auth-left-image">
            <img src={mediatorLoginBg} alt="" role="presentation" />
          </div>
        </div>
        <div className="auth-right">
          <div className="ml-denied-card">
            <div className="ml-denied-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
            </div>
            <h2>Mediator Access Required</h2>
            <p>This account is not registered as a mediator on Razi Marzi. To access the Mediator Portal, you must complete the mediator application and verification process.</p>
            <button className="auth-btn" onClick={() => navigate("/mediator-signup")}>Apply as Mediator</button>
            <button type="button" className="back-link" onClick={() => setAccessDenied(false)}>Back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-left-image">
          <img src={mediatorLoginBg} alt="" role="presentation" />
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <h1 className="ml-heading">Mediator Log In</h1>

          <div className="ml-card">
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">Log in to continue managing your cases</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrap">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M2 7l10 7 10-7" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrap">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <span className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </span>
              </div>
              <div className="form-row-end">
                <Link to="/forgotpassword" className="forgot-link">Forgot Password?</Link>
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <span className="checkmark" />
                Remember this device
              </label>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <span className="btn-loader" /> : <>Login <span className="btn-arrow">→</span></>}
            </button>
            </form>

            <div className="auth-or">OR CONTINUE WITH</div>
            <button type="button" className="google-btn" disabled>
              <svg viewBox="0 0 48 48" width="18" height="18"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.5 29.6 4 24 4c-7.5 0-14 4.1-17.7 10.7z" /><path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.3C29.6 35 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.9 39.8 16.4 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.3C41.5 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-3.5z" /></svg>
              Continue with Google
            </button>
          </div>

          <p className="auth-footer">
            New Mediator? <Link to="/mediator-signup" className="auth-link">Apply for Verification</Link>
          </p>
          <p className="ml-note">
            *NOTE- Only verified mediators can access dispute cases. New mediators must complete the verification process before receiving assignments.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MediatorLogin;
