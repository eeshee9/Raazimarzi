import React, { useState, useEffect } from "react";
import "./Login.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import loginBg from "../assets/icons/rec.png"; 

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // UI ONLY
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ✅ Redirect helper
  const redirectByRole = (role) => {
    switch (role) {
      case "admin":
        navigate("/admin/dashboard");
        break;
      case "mediator":
        navigate("/mediator/dashboard");
        break;
      case "case-manager":
        navigate("/case-manager/dashboard");
        break;
      default:
        navigate("/user/dashboard");
    }
  };

  // ✅ Check existing login
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole) redirectByRole(storedRole);
  }, []);

  // ✅ Send OTP (backend unchanged)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/otp/send-otp", { email });
      alert("OTP sent successfully!");
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.message || "Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Verify OTP (backend unchanged)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/otp/verify-otp",
        { email, otp }
      );

      const { role, token } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("email", email);

      redirectByRole(role);
    } catch (err) {
      alert(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        {/* LEFT IMAGE */}
        <div className="login-image">
          <img src={loginBg} alt="Login" />
        </div>

        {/* RIGHT FORM */}
        <div className="login-form">
          <div className="logo">
            <img src="/logo.png" alt="Raazimarzi" />
            <span>ODR Platform</span>
          </div>

          <h2>Welcome to Raazimerzi</h2>
          <p className="subtitle">
            Sign in to resolving your disputes online.
          </p>

          {step === 1 ? (
            <form onSubmit={handleSendOtp}>

              {/* EMAIL */}
              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* PASSWORD (UI ONLY) */}
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

              <p className="forgot">Forgot Password?</p>

              <button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Sign In"}
              </button>

              <p className="bottom-text">
                Don’t have an account? <a href="/signup">Sign Up</a>
              </p>

              {/* SOCIAL ICONS (UI ONLY) */}
              <div className="social-row">
                <span>G</span>
                <span>in</span>
                <span>📱</span>
                <span>f</span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <p className="subtitle">
                OTP sent to <b>{email}</b>
              </p>

              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Login"}
              </button>

              <p className="back-link" onClick={() => setStep(1)}>
                ← Change Email
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
