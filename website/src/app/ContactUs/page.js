"use client";

import { useState } from "react";
import "@/styles/contact.css";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "error"

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    // Optional client-side phone validation
    if (formData.phone && !/^[0-9+\-() ]+$/.test(formData.phone)) {
      setStatus("error");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Submission failed");

      setStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (error) {
      console.error("Contact form error:", error);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="contact-wrapper">
      <div className="contact-card">
        <img
          src="/assets/images/logo.png"
          alt="RaaziMarzi Logo"
          className="contact-logo"
        />

        <h2>Let’s Connect and Get a Solution!</h2>
        <p className="sub-text">Your solution awaits you.</p>

        <form onSubmit={handleSubmit} className="contact-form">
          {/* Name */}
          <div className="input-group">
            <span className="icon">👤</span>
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div className="input-group">
            <span className="icon">✉️</span>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Phone */}
          <div className="input-group">
            <span className="icon">📱</span>
            <input
              type="tel"
              name="phone"
              placeholder="Phone no."
              value={formData.phone}
              onChange={handleChange}
              pattern="^[0-9+\-() ]*$"
              title="Enter a valid phone number"
            />
          </div>

          {/* Message */}
          <textarea
            name="message"
            placeholder="Message"
            rows="4"
            value={formData.message}
            onChange={handleChange}
            required
          />

          {/* Submit */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Sending..." : "Get Solution"}
          </button>

          {/* Status Messages */}
          {status === "success" && (
            <p className="form-message success">
              Thank you! We’ll contact you soon.
            </p>
          )}
          {status === "error" && (
            <p className="form-message error">
              Something went wrong. Please check your input or try again later.
            </p>
          )}
        </form>

        {/* Optional redirect to app login */}
        {status === "success" && (
          <p className="redirect-msg">
            Or <a href="/app/login">login to your account</a>
          </p>
        )}
      </div>
    </section>
  );
}
