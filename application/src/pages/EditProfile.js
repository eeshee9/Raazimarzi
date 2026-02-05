import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/userContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import "./EditProfile.css";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser, loading } = useUser();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    dob: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    avatar: "",
  });

  const [avatarPreview, setAvatarPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ Pre-fill form with existing user data
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        dob: user.dob || "",
        gender: user.gender || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "India",
        pincode: user.pincode || "",
        avatar: user.avatar || "",
      });
      setAvatarPreview(user.avatar || "https://i.pravatar.cc/150");
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  // ✅ Handle avatar URL input
  const handleAvatarChange = (e) => {
    const url = e.target.value;
    setFormData({ ...formData, avatar: url });
    setAvatarPreview(url || "https://i.pravatar.cc/150");
  };

  // ✅ Validate form
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }

    if (!formData.phone.trim()) {
      setError("Phone number is required");
      return false;
    }

    if (!/^[0-9]{10}$/.test(formData.phone)) {
      setError("Phone number must be 10 digits");
      return false;
    }

    if (!formData.dob) {
      setError("Date of birth is required");
      return false;
    }

    if (!formData.gender) {
      setError("Gender is required");
      return false;
    }

    return true;
  };

  // ✅ Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const result = await updateUser(formData);

    if (result.success) {
      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        navigate("/user/my-profile");
      }, 1500);
    } else {
      setError(result.error || "Failed to update profile");
    }

    setSaving(false);
  };

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="edit-profile-container">
          <h2>Edit Profile</h2>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <form onSubmit={handleSubmit} className="edit-profile-form">
            {/* Avatar Section */}
            <div className="avatar-section">
              <img
                src={avatarPreview}
                alt="Avatar Preview"
                className="avatar-preview"
                onError={(e) => {
                  e.target.src = "https://i.pravatar.cc/150";
                }}
              />
              <div className="avatar-input-group">
                <label>Profile Picture URL</label>
                <input
                  type="url"
                  name="avatar"
                  value={formData.avatar}
                  onChange={handleAvatarChange}
                  placeholder="https://example.com/your-photo.jpg"
                />
                <small>Or use a service like <a href="https://imgur.com" target="_blank" rel="noopener noreferrer">Imgur</a> to upload your photo</small>
              </div>
            </div>

            {/* Basic Info */}
            <div className="form-grid">
              <div className="form-group">
                <label>
                  Full Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Phone Number <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength="10"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Date of Birth <span className="required">*</span>
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Gender <span className="required">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Pin Code</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  maxLength="6"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
              />
            </div>

            <div className="button-group">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate("/user/my-profile")}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EditProfile;