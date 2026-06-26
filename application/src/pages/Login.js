import React, { useState, useEffect, useCallback } from "react";
import "./Login.css";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../api/axios";
import loginBg from "../assets/icons/login.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = new URLSearchParams(location.search).get("redirect");

  const redirectByRole = useCallback(
    (role) => {
      if (redirectPath) { navigate(redirectPath, { replace: true }); return; }
      switch (role) {
        case "admin": navigate("/admin/dashboard", { replace: true }); break;
        case "sub-admin": navigate("/admin/dashboard", { replace: true }); break;
        case "mediator": navigate("/mediator/dashboard", { replace: true }); break;
        case "case-manager": navigate("/cm/dashboard", { replace: true }); break;
        default: navigate("/user/dashboard", { replace: true });
      }
    },
    [navigate, redirectPath]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) redirectByRole(role);
  }, [redirectByRole]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data?.success && res.data?.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.user.role);
        localStorage.setItem("email", res.data.user.email);
        localStorage.setItem("userId", res.data.user.id);
        localStorage.setItem("userName", res.data.user.name);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        redirectByRole(res.data.user.role);
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      if (err.response?.status === 401) setError("Invalid email or password");
      else if (err.response?.status === 400 || err.response?.status === 403) setError(err.response.data.message);
      else if (err.response?.status === 500) setError("Server error. Please try again later.");
      else setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* BACKGROUND IMAGE — fills entire viewport */}
      <div className="auth-left">
        <div className="auth-left-image">
          <img src={loginBg} alt="" role="presentation" />
        </div>
      </div>

      {/* RIGHT PANEL — floats over the right (empty) half of the image */}
      <div className="auth-right">
        <div className="auth-form-container">
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

          <p className="auth-footer">
            Don't have an account? <Link to={`/signup${redirectPath ? `?redirect=${redirectPath}` : ""}`} className="auth-link">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;