import React from "react";
import { FaCog, FaBell } from "react-icons/fa";
import { useUser } from "../context/userContext";
import { useNavigate } from "react-router-dom";
import "./Header.css";

const Header = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div></div>
      <div className="nav-icons">
        <FaCog className="icon" />
        <FaBell className="icon" />
        <div 
          className="profile" 
          onClick={() => navigate("/user/my-profile")}
          style={{ cursor: "pointer" }}
        >
          <img
            src={user?.avatar || "https://i.pravatar.cc/40"}
            alt="profile"
            className="profile-img"
          />
          <span>{user?.name || "Loading..."}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;