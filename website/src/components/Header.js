"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "../styles/header.css";

export default function Header() {
  const pathname = usePathname();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const servicesRef = useRef(null);

  const isActive = (path) => pathname === path;
  const isServiceActive = pathname.startsWith("/Services");

  /* SCROLL + OUTSIDE CLICK */
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const handleClickOutside = (e) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) {
        setServicesOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  /* LOCK SCROLL ON MOBILE MENU */
  useEffect(() => {
    document.body.style.overflow = mobileMenu ? "hidden" : "auto";
  }, [mobileMenu]);

  return (
    <>
      {/* ================= HEADER ================= */}
      <header className={`header ${scrolled ? "scrolled" : ""}`}>
        <div className="container">
          {/* LOGO */}
          <div className="logo-area">
            <img
              src="/assets/images/logo.png"
              alt="RaaziMarzi Logo"
              className="logo"
            />
          </div>

          {/* DESKTOP NAV */}
          <nav className="nav-links">
            <div
              className="services-dropdown"
              ref={servicesRef}
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={`services-link ${
                  isServiceActive ? "active" : ""
                }`}
                onClick={() => setServicesOpen(!servicesOpen)}
              >
                Services <span className="arrow">⌄</span>
              </span>

              <div
                className={`dropdown-menu ${
                  servicesOpen ? "open" : ""
                }`}
              >
                <div className="dropdown-item">
                  <span>Commercial Dispute ➜</span>
                  <div className="sub-menu">
                    <Link
                      href="/Services/ContractDisputes"
                      className={
                        isActive("/Services/ContractDisputes") ? "active" : ""
                      }
                    >
                      Contract Dispute
                    </Link>
                    <Link
                      href="/Services/PartnershipDisputes"
                      className={
                        isActive("/Services/PartnershipDisputes")
                          ? "active"
                          : ""
                      }
                    >
                      Partnership Dispute
                    </Link>
                  </div>
                </div>

                <div className="dropdown-item">
                  <span>Individual Dispute ➜</span>
                  <div className="sub-menu">
                    <Link
                      href="/Services/Property&RentalDisputes"
                      className={
                        isActive("/Services/Property&RentalDisputes")
                          ? "active"
                          : ""
                      }
                    >
                      Property & Rental Dispute
                    </Link>
                    <Link
                      href="/Services/ConsumerDisputes"
                      className={
                        isActive("/Services/ConsumerDisputes") ? "active" : ""
                      }
                    >
                      Consumer Dispute
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/AboutUs"
              className={isActive("/AboutUs") ? "active" : ""}
            >
              About Us
            </Link>

            <Link
              href="/solutions"
              className={isActive("/solutions") ? "active" : ""}
            >
              Solutions
            </Link>

            <Link
              href="/case-journey"
              className={isActive("/case-journey") ? "active" : ""}
            >
              Case Journey
            </Link>

            <Link
              href="/ContactUs"
              className={isActive("/ContactUs") ? "active" : ""}
            >
              Contact Us
            </Link>
          </nav>

          {/* REQUEST DEMO */}
          <div className="demo-btn">
            <Link href="http://localhost:3001/login">Request Demo</Link>
          </div>

          {/* MOBILE ICON */}
          <div
            className="mobile-icon"
            onClick={() => setMobileMenu(true)}
          >
            ☰
          </div>
        </div>
      </header>

      {/* ================= MOBILE MENU ================= */}
      <div className={`mobile-menu-overlay ${mobileMenu ? "show" : ""}`}>
        <div className="mobile-menu">
          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
          >
            ✕
          </button>

          {/* SERVICES */}
          <div className={`mobile-box ${servicesOpen ? "open" : ""}`}>
            <div
              className="mobile-box-header"
              onClick={() => setServicesOpen(!servicesOpen)}
            >
              Services <span>{servicesOpen ? "⌃" : "⌄"}</span>
            </div>

            <div className="mobile-tabs">
              <button className="active">Commercial Disputes</button>
              <button>Individual Disputes</button>
            </div>

            <div className="mobile-sub-links">
              <Link href="/Services/ContractDisputes">
                Contract Disputes
              </Link>
              <Link href="/Services/PartnershipDisputes">
                Partnership Disputes
              </Link>
            </div>

            <div className="mobile-sub-links">
              <Link href="/Services/Property&RentalDisputes">
                Property & Rental Dispute Resolution (ODR)
              </Link>
              <Link href="/Services/ConsumerDisputes">
                Consumer Disputes
              </Link>
            </div>
          </div>

          <Link href="/AboutUs" className="mobile-box">About Us</Link>
          <Link href="/case-journey" className="mobile-box">Case Journey</Link>
          <Link href="/ContactUs" className="mobile-box">Contact Us</Link>

          <Link href="/request-demo" className="mobile-demo-btn">
            Request Demo
          </Link>
        </div>
      </div>
    </>
  );
}
