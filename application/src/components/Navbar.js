// src/components/UserNavbar.js
import React from "react";
import { useUser } from "../context/userContext";
import { FaCog, FaBell } from "react-icons/fa";

const UserNavbar = () => {
  const { user, loading } = useUser();

  return (
    <header className="navbar">
      <div></div>
      <div className="nav-icons">
        <FaCog className="icon" />
        <FaBell className="icon" />
        <div className="profile">
          <img
            src={user?.avatar || "https://i.pravatar.cc/40"}
            alt="profile"
            className="profile-img"
          />
          <span>{loading ? "Loading..." : user?.name || "User"}</span>
        </div>
      </div>
    </header>
  );
};

export default UserNavbar;