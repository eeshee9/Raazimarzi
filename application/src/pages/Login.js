// src/pages/Login.js
import React, { useState, useEffect, useCallback } from "react";
import "./Login.css";
import { useNavigate, useLocation, Link } from "react-router-dom";
import loginBg from "../assets/icons/rec.png";
import google from "../assets/icons/google.png";
import linkedin from "../assets/icons/linkdin.png";
import phone from "../assets/icons/phone.png";
import fb from "../assets/icons/fb.png";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = new URLSearchParams(location.search).get("redirect");

  const redirectByRole = useCallback(
    (role) => {
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
        return;
      }

      switch (role) {
        case "admin":
          navigate("/admin/dashboard", { replace: true });
          break;
        case "mediator":
          navigate("/mediator/dashboard", { replace: true });
          break;
        case "case-manager":
          navigate("/case-manager/dashboard", { replace: true });
          break;
        default:
          navigate("/user/dashboard", { replace: true });
      }
    },
    [navigate, redirectPath]
  );

  // Auto-login
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) redirectByRole(role);
  }, [redirectByRole]);

  /* ================= LOGIN ================= */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/users/login`, {
        email,
        password,
      });

      // ✅ Save auth info
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("email", res.data.email);

      redirectByRole(res.data.role);
    } catch (err) {
      const message = err.response?.data?.message;

      // 🔐 Password reset flow
      if (err.response?.status === 403) {
        navigate(`/forgotpassword?email=${email}`);
        return;
      }

      alert(message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-image">
          <img src={loginBg} alt="Login" />
        </div>

        <div className="login-form">
          <div className="logo">
            <img src="/assets/images/logo.png" alt="RaaziMarzi" />
            <span>ODR Platform</span>
          </div>

          <h2>Welcome to RaaziMarzi</h2>
          <p className="subtitle">Sign in to resolve your disputes online.</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group password-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>

            <p className="forgot">
              <Link to="/forgotpassword">Forgot Password?</Link>
            </p>

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="bottom-text">
              Don’t have an account? <Link to="/signup">Sign Up</Link>
            </p>

            <div className="social-row">
              <span><img src={google} alt="Google" /></span>
              <span><img src={linkedin} alt="LinkedIn" /></span>
              <span><img src={phone} alt="Phone" /></span>
              <span><img src={fb} alt="Facebook" /></span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
