// src/components/UserSidebar.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { useUser } from "../context/userContext";

// Icons — unchanged
import Vector      from "../assets/icons/Vector.png";
import HomeIcon    from "../assets/icons/home.png";
import FileIcon    from "../assets/icons/file.png";
import MeetingIcon from "../assets/icons/meeting.png";
import CaseIcon    from "../assets/icons/newcase.png";
import DocsIcon    from "../assets/icons/document.png";
import ChatIcon    from "../assets/icons/chat.png";
import PaymentIcon from "../assets/icons/payment.png";
import SupportIcon from "../assets/icons/support.png";
import LogoutIcon  from "../assets/icons/logout.png";

const menuItems = [
  { key: "dashboard", label: "Dashboard",   icon: HomeIcon,    path: "/user/dashboard" },
  { key: "file-case", label: "File a case", icon: FileIcon,    path: "/user/file-new-case/step1" },
  { key: "my-cases",  label: "My Cases",    icon: CaseIcon,    path: "/user/my-cases" },
  { key: "meetings",  label: "Meetings",    icon: MeetingIcon, path: "/user/case-meetings" },
  { key: "chats",     label: "Messages",    icon: ChatIcon,    path: "/user/chats" },
  { key: "documents", label: "Documents",   icon: DocsIcon,    path: "/user/documents" },
  { key: "payments",  label: "Payments",    icon: PaymentIcon, path: "/user/payments" },
  { key: "support",   label: "Support",     icon: SupportIcon, path: "/user/support" },
  { key: "profile",   label: "Profile",     icon: Vector,      path: "/user/my-profile" },
];

const UserSidebar = ({ activePage = "dashboard" }) => {
  const navigate  = useNavigate();
  const { logoutUser } = useAuth();
  const { clearUser }  = useUser();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggingOut,     setIsLoggingOut]     = useState(false);
  const [mobileOpen,       setMobileOpen]       = useState(false);

  const drawerRef = useRef(null);

  // Listen for hamburger event fired from mob-topbar in UserDashboard
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener("open-mobile-menu", handler);
    return () => window.removeEventListener("open-mobile-menu", handler);
  }, []);

  // Close drawer on outside click / tap
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown",  handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown",  handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [mobileOpen]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggleSidebar = () => setSidebarCollapsed(p => !p);

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (!confirmLogout) return;
    setIsLoggingOut(true);
    try {
      logoutUser();
      clearUser();
      alert("Logged out successfully!");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Failed to logout. Please try again.");
    } finally {
      setIsLoggingOut(false);
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* ════ DESKTOP SIDEBAR ════ */}
      <aside className={`usr-sidebar${sidebarCollapsed ? " usr-collapsed" : ""}`}>
        <div className="usr-sidebar-header">
          <div className="usr-sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <span className="usr-bar" />
            <span className="usr-bar" />
            <span className="usr-bar" />
          </div>
        </div>

        <nav className="usr-menu">
          {menuItems.map(({ key, label, icon, path }) => (
            <div
              key={key}
              className={`usr-menu-item${activePage === key ? " usr-active" : ""}`}
              onClick={() => navigate(path)}
            >
              <img src={icon} alt={label} />
              {!sidebarCollapsed && <span>{label}</span>}
            </div>
          ))}
        </nav>

        <div className="usr-logout">
          <div
            className="usr-menu-item usr-logout-item"
            onClick={handleLogout}
            style={{ cursor: isLoggingOut ? "not-allowed" : "pointer", opacity: isLoggingOut ? 0.6 : 1 }}
          >
            <img src={LogoutIcon} alt="Logout" className="usr-logout-icon" />
            {!sidebarCollapsed && <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>}
          </div>
        </div>
      </aside>

      {/* ════ MOBILE DRAWER ════ */}

      {/* Dim overlay */}
      <div
        className={`usr-mob-overlay${mobileOpen ? " open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Slide-in panel */}
      <aside
        ref={drawerRef}
        className={`usr-mob-drawer${mobileOpen ? " open" : ""}`}
      >
        <div className="usr-mob-drawer-header">
          <button
            className="usr-mob-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="usr-mob-menu">
          {menuItems.map(({ key, label, icon, path }) => (
            <div
              key={key}
              className={`usr-mob-item${activePage === key ? " active" : ""}`}
              onClick={() => handleNav(path)}
            >
              <img src={icon} alt={label} />
              <span>{label}</span>
            </div>
          ))}
        </nav>

        <div className="usr-mob-logout">
          <div
            className={`usr-mob-item usr-mob-logout-item`}
            onClick={handleLogout}
            style={{ cursor: isLoggingOut ? "not-allowed" : "pointer", opacity: isLoggingOut ? 0.6 : 1 }}
          >
            <img src={LogoutIcon} alt="Logout" />
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default UserSidebar;