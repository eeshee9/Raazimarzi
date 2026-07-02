// src/components/MediatorSidebar.js — New design: white sidebar, 7 nav items
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContext";
import { Headphones, Menu, X } from "lucide-react";
import "./MediatorSidebar.css";

import RzmzLogo    from "../assets/Rzmzlogo.png";
import HomeIcon    from "../assets/icons/home.png";
import CaseIcon    from "../assets/icons/newcase.png";
import MeetingIcon from "../assets/icons/meeting.png";
import ChatIcon    from "../assets/icons/chat.png";
import DocIcon     from "../assets/icons/document.png";
import NotesIcon   from "../assets/icons/file.png";
import ProfileIcon from "../assets/icons/Vector.png";
import LogoutIcon  from "../assets/icons/logout.png";

const MENU_ITEMS = [
  { key: "dashboard",  label: "Dashboard",    icon: HomeIcon,    path: "/mediator/dashboard" },
  { key: "my-cases",   label: "My Cases",     icon: CaseIcon,    path: "/mediator/my-cases" },
  { key: "meetings",   label: "Meetings",     icon: MeetingIcon, path: "/mediator/meetings" },
  { key: "messages",   label: "Messages",     icon: ChatIcon,    path: "/mediator/messages" },
  { key: "documents",  label: "Documents",    icon: DocIcon,     path: "/mediator/documents" },
  { key: "case-notes", label: "My Case Notes",icon: NotesIcon,   path: "/mediator/case-notes" },
  { key: "profile",    label: "Profile",      icon: ProfileIcon, path: "/mediator/profile" },
];

const MediatorSidebar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { logoutUser } = useAuth();

  const [collapsed,    setCollapsed]    = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener("open-mobile-menu", handler);
    return () => window.removeEventListener("open-mobile-menu", handler);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setMobileOpen(false);
    };
    document.addEventListener("mousedown",  onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => {
      document.removeEventListener("mousedown",  onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = ({ key, path }) => {
    const p = location.pathname;
    if (key === "my-cases") return p.startsWith("/mediator/my-cases") || p.startsWith("/mediator/cases/");
    if (key === "meetings") return p.startsWith("/mediator/meetings") || p.startsWith("/mediator/case-meetings");
    return p.startsWith(path);
  };

  const handleNav = (path) => { navigate(path); setMobileOpen(false); };

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    setIsLoggingOut(true);
    try {
      logoutUser();
      navigate("/mediator/login", { replace: true });
    } catch (err) {
      console.error("Logout:", err);
    } finally {
      setIsLoggingOut(false);
      setMobileOpen(false);
    }
  };

  const renderNav = (isMobile = false) =>
    MENU_ITEMS.map(({ key, label, icon, path }) => {
      const active = isActive({ key, path });
      return (
        <div
          key={key}
          className={`msb-item${active ? " msb-active" : ""}${isMobile ? " msb-mob" : ""}`}
          onClick={() => handleNav(path)}
        >
          <img src={icon} alt={label} className="msb-icon" />
          {(!collapsed || isMobile) && <span className="msb-label">{label}</span>}
        </div>
      );
    });

  const BottomActions = ({ isMobile = false }) => (
    <div className="msb-bottom">
      {(!collapsed || isMobile) && (
        <div className="msb-support" title="Support coming soon"
        onClick={() => window.open("mailto:support@raazimarzi.com", "_blank")}>
          <Headphones size={15} />
          <span>Contact Support</span>
        </div>
      )}
      <div
        className={`msb-logout${isMobile ? " msb-mob" : ""}`}
        onClick={handleLogout}
        style={{ opacity: isLoggingOut ? 0.6 : 1, cursor: isLoggingOut ? "not-allowed" : "pointer" }}
      >
        <img src={LogoutIcon} alt="Logout" className="msb-icon msb-logout-icon" />
        {(!collapsed || isMobile) && (
          <span className="msb-logout-label">{isLoggingOut ? "Logging out…" : "Logout"}</span>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className={`msb-sidebar${collapsed ? " msb-collapsed" : ""}`}>
        <div className="msb-logo-row">
          <img src={RzmzLogo} alt="RaaziMarzi" className="msb-logo-img" />
          {!collapsed && <span className="msb-logo-text">RaaziMarzi.com</span>}
        </div>

        <div className={`msb-toggle-row${collapsed ? " msb-toggle-center" : ""}`}>
          <button
            className="msb-toggle-btn"
            onClick={() => setCollapsed((p) => !p)}
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="msb-nav">{renderNav()}</nav>
        <BottomActions />
      </aside>

      {/* ── Mobile overlay ── */}
      <div
        className={`msb-overlay${mobileOpen ? " open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Mobile drawer ── */}
      <aside ref={drawerRef} className={`msb-drawer${mobileOpen ? " open" : ""}`}>
        <div className="msb-drawer-header">
          <div className="msb-logo-row">
            <img src={RzmzLogo} alt="RaaziMarzi" className="msb-logo-img" />
            <span className="msb-logo-text">RaaziMarzi.com</span>
          </div>
          <button className="msb-close-btn" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className="msb-nav">{renderNav(true)}</nav>
        <BottomActions isMobile />
      </aside>
    </>
  );
};

export default MediatorSidebar;
