// src/pages/Signup.js
import React, { useState } from "react";
import "./Signup.css";
import { useNavigate, useLocation, Link } from "react-router-dom";
import signupBg from "../assets/icons/rec.png";
import google from "../assets/icons/google.png";
import linkdin from "../assets/icons/linkdin.png";
import phone from "../assets/icons/phone.png";
import fb from "../assets/icons/fb.png";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const Signup = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "user",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // OTP Flow States
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = new URLSearchParams(location.search).get("redirect");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  /* ================= STEP 1: SEND OTP ================= */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    // Validation
    if (!form.email) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/otp/send-otp`, {
        email: form.email,
        type: "signup",
      });

      if (res.data.success) {
        setOtpSent(true);
        setMessage("OTP sent to your email! Check your inbox.");
      } else {
        setError(res.data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      const errorMessage = err.response?.data?.message || "Failed to send OTP. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ================= STEP 2: VERIFY OTP ================= */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/otp/verify-otp`, {
        email: form.email,
        otp: otp,
        type: "signup",
      });

      if (res.data.success) {
        setOtpVerified(true);
        setMessage("OTP verified! Now complete your registration.");
      } else {
        setError(res.data.message || "Invalid OTP");
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      const errorMessage = err.response?.data?.message || "Invalid or expired OTP";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ================= STEP 3: COMPLETE SIGNUP ================= */
  const handleCompleteSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    // Validation
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/auth/signup`, {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: form.role,
      });

      if (res.data.success && res.data.token) {
        // Store token and user info
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.user.role);
        localStorage.setItem("email", res.data.user.email);
        localStorage.setItem("userId", res.data.user.id);
        localStorage.setItem("userName", res.data.user.name);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        setMessage("Signup successful! Redirecting...");

        // Redirect after 1 second
        setTimeout(() => {
          if (redirectPath) {
            navigate(redirectPath, { replace: true });
          } else {
            switch (res.data.user.role) {
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
          }
        }, 1000);
      } else {
        setError(res.data.message || "Signup failed");
      }
    } catch (err) {
      console.error("Signup error:", err);
      const errorMessage = err.response?.data?.message || "Signup failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* LEFT IMAGE */}
        <div className="login-image">
          <img src={signupBg} alt="Signup" />
        </div>

        {/* RIGHT FORM */}
        <div className="login-form">
          <div className="logo">
            <img src="/logo.png" alt="Raazimarzi" />
            <span>ODR Platform</span>
          </div>

          <h2>Welcome to Raazimarzi</h2>
          <p className="subtitle">
            {!otpSent && "Register your account with us!"}
            {otpSent && !otpVerified && "Enter the OTP sent to your email"}
            {otpVerified && "Complete your registration"}
          </p>

          {/* Error Message */}
          {error && (
            <div className="error-message" style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="success-message" style={{
              backgroundColor: '#efe',
              color: '#393',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px',
              border: '1px solid #cfc'
            }}>
              {message}
            </div>
          )}

          {/* STEP 1: Enter Email & Send OTP */}
          {!otpSent && (
            <form onSubmit={handleSendOtp}>
              <div className="input-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>

              <p className="bottom-text">
                Already have an account?{" "}
                <Link to={`/login${redirectPath ? `?redirect=${redirectPath}` : ""}`}>
                  Sign in
                </Link>
              </p>
            </form>
          )}

          {/* STEP 2: Verify OTP */}
          {otpSent && !otpVerified && (
            <form onSubmit={handleVerifyOtp}>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={6}
                  pattern="[0-9]{6}"
                />
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <p className="bottom-text">
                Didn't receive OTP?{" "}
                <span 
                  onClick={() => !loading && handleSendOtp({ preventDefault: () => {} })}
                  style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Resend
                </span>
              </p>
            </form>
          )}

          {/* STEP 3: Complete Registration */}
          {otpVerified && (
            <form onSubmit={handleCompleteSignup}>
              <div className="input-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </div>

              <div className="input-group password-group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password (min 6 characters)"
                  value={form.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  minLength={6}
                />
                <span 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: 'pointer' }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </div>

              <div className="input-group">
                <input
                  type="text"
                  name="phone"
                  placeholder="Phone Number (optional)"
                  value={form.phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <select 
                  name="role" 
                  value={form.role} 
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="user">User</option>
                  <option value="mediator">Mediator</option>
                  <option value="case-manager">Case Manager</option>
                </select>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Complete Registration"}
              </button>

              <p className="bottom-text">
                Already have an account?{" "}
                <Link to={`/login${redirectPath ? `?redirect=${redirectPath}` : ""}`}>
                  Sign in
                </Link>
              </p>

              <div className="social-row">
                <span><img src={google} alt="Google" /></span>
                <span><img src={linkdin} alt="LinkedIn" /></span>
                <span><img src={phone} alt="Phone" /></span>
                <span><img src={fb} alt="Facebook" /></span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;