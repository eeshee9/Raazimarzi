import React, { useState, useEffect, useCallback } from "react";
import "./Login.css";
import { useNavigate, useLocation, Link } from "react-router-dom";
import loginBg from "../assets/icons/rec.png";
import google from "../assets/icons/google.png";
import linkedin from "../assets/icons/linkdin.png";
import phone from "../assets/icons/phone.png";
import fb from "../assets/icons/fb.png";
import axios from "axios";

// API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = new URLSearchParams(location.search).get("redirect");

  /* ================= REDIRECT BY ROLE ================= */
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

  /* ================= AUTO LOGIN ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role) {
      redirectByRole(role);
    }
  }, [redirectByRole]);

  /* ================= LOGIN ================= */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      if (res.data?.success && res.data?.token) {
        // Save auth data
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.user.role);
        localStorage.setItem("email", res.data.user.email);
        localStorage.setItem("userId", res.data.user.id);
        localStorage.setItem("userName", res.data.user.name);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        // Redirect user
        redirectByRole(res.data.user.role);
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);

      if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else if (err.response?.status === 400) {
        setError(err.response.data.message);
      } else if (err.response?.status === 500) {
        setError("Server error. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
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
          <p className="subtitle">
            Sign in to resolve your disputes online.
          </p>

          {error && (
            <div
              className="error-message"
              style={{
                backgroundColor: "#fee",
                color: "#c33",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "16px",
                border: "1px solid #fcc",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="input-group password-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: "pointer" }}
              >
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
              Don&apos;t have an account?{" "}
              <Link
                to={`/signup${
                  redirectPath ? `?redirect=${redirectPath}` : ""
                }`}
              >
                Sign Up
              </Link>
            </p>

            <div className="social-row">
              <span>
                <img src={google} alt="Google" />
              </span>
              <span>
                <img src={linkedin} alt="LinkedIn" />
              </span>
              <span>
                <img src={phone} alt="Phone" />
              </span>
              <span>
                <img src={fb} alt="Facebook" />
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
