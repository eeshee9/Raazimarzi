import React, { useState } from "react";
import axios from "axios";
import "./ForgotPassword.css";
import forgotBg from "../assets/icons/rec.png";
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // STEP 1: SEND OTP
  const sendOtp = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/otp/send-otp", {
        email,
        purpose: "forgot-password",
      });
      setStep(2);
    } catch {
      setMessage("Failed to send OTP");
    }
  };

  // STEP 2: VERIFY OTP (UI ONLY)
  const verifyOtp = (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setMessage("Enter valid OTP");
      return;
    }
    setStep(3);
  };

  // STEP 3: RESET PASSWORD
  const resetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirm) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/reset-password", {
        email,
        otp,
        newPassword,
      });
      navigate("/login");
    } catch {
      setMessage("Invalid or expired OTP");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        <div className="login-image">
          <img src={forgotBg} alt="Forgot Password" />
        </div>

        <div className="login-form">
          <h2>Forgot Password</h2>

          {message && <p className="error">{message}</p>}

          {step === 1 && (
            <form onSubmit={sendOtp}>
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit">Continue</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyOtp}>
              <input
                type="text"
                placeholder="Enter OTP"
                maxLength="6"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button type="submit">Verify OTP</button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={resetPassword}>
              <input
                type="password"
                placeholder="New Password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirm Password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <button type="submit">Reset Password</button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
