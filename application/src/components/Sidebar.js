import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import HomeIcon from "../assets/icons/home.png";
import Vector from "../assets/icons/Vector.png";
import FileIcon from "../assets/icons/file.png";
import MeetingIcon from "../assets/icons/meeting.png";
import CaseIcon from "../assets/icons/newcase.png";
import DocsIcon from "../assets/icons/document.png";
import ChatIcon from "../assets/icons/chat.png";
import PaymentIcon from "../assets/icons/payment.png";
import SupportIcon from "../assets/icons/support.png";
import LogoutIcon from "../assets/icons/logout.png";
import { useUser } from "../context/userContext";
import "./Sidebar.css";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useUser();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <nav className="menu">
        <div
          className={`menu-item ${isActive("/user/dashboard") ? "active" : ""}`}
          onClick={() => navigate("/user/dashboard")}
        >
          <img src={HomeIcon} alt="Home" />
          {!collapsed && <span>Home</span>}
        </div>

        <div
          className={`menu-item ${isActive("/user/my-profile") ? "active" : ""}`}
          onClick={() => navigate("/user/my-profile")}
        >
          <img src={Vector} alt="Profile" />
          {!collapsed && <span>My Profile</span>}
        </div>

        <div
          className={`menu-item ${
            isActive("/user/file-new-case/step1") ? "active" : ""
          }`}
          onClick={() => navigate("/user/file-new-case/step1")}
        >
          <img src={FileIcon} alt="File New Case" />
          {!collapsed && <span>File New Case</span>}
        </div>

        <div
          className={`menu-item ${isActive("/user/my-cases") ? "active" : ""}`}
          onClick={() => navigate("/user/my-cases")}
        >
          <img src={CaseIcon} alt="My Cases" />
          {!collapsed && <span>My Cases</span>}
        </div>

        <div
          className={`menu-item ${
            isActive("/user/case-meetings") ? "active" : ""
          }`}
          onClick={() => navigate("/user/case-meetings")}
        >
          <img src={MeetingIcon} alt="Case Meetings" />
          {!collapsed && <span>Case Meetings</span>}
        </div>

        <div className="menu-item">
          <img src={DocsIcon} alt="Documents" />
          {!collapsed && <span>Documents</span>}
        </div>

        <div
          className={`menu-item ${isActive("/user/chats") ? "active" : ""}`}
          onClick={() => navigate("/user/chats")}
        >
          <img src={ChatIcon} alt="Chats" />
          {!collapsed && <span>Chats</span>}
        </div>

        <div className="menu-item">
          <img src={PaymentIcon} alt="Payment" />
          {!collapsed && <span>Payment</span>}
        </div>

        <div className="menu-item">
          <img src={SupportIcon} alt="Support" />
          {!collapsed && <span>Support</span>}
        </div>
      </nav>

      <div className="logout">
        <div className="menu-item" onClick={handleLogout}>
          <img src={LogoutIcon} alt="Logout" />
          {!collapsed && <span>Log out</span>}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;