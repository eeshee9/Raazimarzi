// src/components/MediatorLayout.js — Shared shell for all mediator screens
import React from "react";
import { useAuth } from "../context/authContext";
import MediatorSidebar from "./MediatorSidebar";
import { Bell } from "lucide-react";
import "./MediatorLayout.css";

const MediatorLayout = ({ children, topbarLeft }) => {
  const { user } = useAuth();
  const name     = user?.name || localStorage.getItem("userName") || "Mediator";
  const avatar   = user?.avatar || null;
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleHamburger = () => window.dispatchEvent(new Event("open-mobile-menu"));

  return (
    <div className="medlayout-root">
      <MediatorSidebar />

      <div className="medlayout-body">
        <header className="medlayout-topbar">
          <button
            className="medlayout-hamburger"
            onClick={handleHamburger}
            aria-label="Open menu"
          >
            <span /><span /><span />
          </button>

          {topbarLeft && (
            <div className="medlayout-topbar-left">{topbarLeft}</div>
          )}

          <div className="medlayout-topbar-right">
            <button className="medlayout-notif-btn" aria-label="Notifications">
              <Bell size={18} />
              <span className="medlayout-notif-dot" />
            </button>

            <div className="medlayout-avatar-wrap">
              {avatar
                ? <img src={avatar} alt={name} className="medlayout-avatar-img" />
                : <div className="medlayout-avatar-initials">{initials}</div>
              }
            </div>
          </div>
        </header>

        <main className="medlayout-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MediatorLayout;
