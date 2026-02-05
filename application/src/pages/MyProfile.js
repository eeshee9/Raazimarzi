import React from "react";
import "./MyProfile.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/userContext";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { FaCog, FaBell } from "react-icons/fa";

const MyProfile = () => {
  const navigate = useNavigate();
  const { user, loading } = useUser();

  if (loading) {
    return <div style={{ padding: 40 }}>Loading profile...</div>;
  }

  if (!user) {
    return <div style={{ padding: 40, color: "red" }}>Please log in to view profile</div>;
  }

  return (
    <div className="dashboard-container">
      <Sidebar />

      <main className="main-content">
        <Header />

        {/* Profile Content */}
        <section className="profile-section">
          <div className="profile-left-card">
            <img
              src={user.avatar || "https://i.pravatar.cc/150"}
              alt="User"
              className="profile-avatar"
              onError={(e) => {
                e.target.src = "https://i.pravatar.cc/150";
              }}
            />
            <h3>{user.name}</h3>
            <p className="email">{user.email}</p>
            <p className="phone">{user.phone || "—"}</p>

            <button 
              className="save-btn"
              onClick={() => navigate("/user/edit-profile")}
            >
              <span>✏️</span> Edit Profile
            </button>
          </div>

          <div className="profile-right-card">
            <h3>Personal Information</h3>

            <div className="info-grid">
              <div>
                <p>Date of Birth</p>
                <h4>{user.dob || "—"}</h4>
              </div>
              <div>
                <p>Gender</p>
                <h4>{user.gender || "—"}</h4>
              </div>
              <div>
                <p>City</p>
                <h4>{user.city || "—"}</h4>
              </div>
              <div>
                <p>Country</p>
                <h4>{user.country || "India"}</h4>
              </div>
              <div>
                <p>State</p>
                <h4>{user.state || "—"}</h4>
              </div>
              <div>
                <p>Pin Code</p>
                <h4>{user.pincode || "—"}</h4>
              </div>
            </div>

            <div className="address-section">
              <p>Address</p>
              <h4>{user.address || "—"}</h4>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MyProfile;