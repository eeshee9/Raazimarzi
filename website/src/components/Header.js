"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { APP_BASE_PATH } from "@/config/appConfig";
import "@/styles/header.css";

/* ─── Full UJM category tree ─── */
const SERVICE_TREE = [
  {
    id: "individual",
    label: "Individual Disputes",
    href: "/Services/IndividualDisputes",
    sub: [
      {
        label: "Property & Rental Disputes",
        href: "/Services/Property&RentalDisputes",
        // items: [
        //   "Rent / Loan Disputes",
        //   "Security Deposit Disputes",
        //   "Lease Violations",
        //   "Maintenance Issues",
        //   "Boundary Disputes",
        //   "Illegal Possession",
        // ],
      },
      {
        label: "Family Disputes",
        href: "/Services/FamilyDisputes",
        // items: [
        //   "Divorce",
        //   "Maintenance / Alimony",
        //   "Property Division in Family",
        //   "Guardianship Disputes",
        //   "Domestic Violence & Protection Cases",
        //   "Dowry",
        //   "Child Custody",
        // ],
      },
      {
        label: "Neighbour & Community",
        href: "/Services/NeighborDisputes",
        // items: [
        //   "Noise Complaints",
        //   "Parking Issues",
        //   "Privacy and Safety",
        //   "Maintenance",
        // ],
      },
    ],
  },
  {
    id: "consumer",
    label: "Consumer Disputes",
    href: "/Services/ConsumerDisputes",
    sub: [
      {
        label: "Product Complaints",
        href: "/Services/ProductComplaints",
        // items: ["Defective Product Complaint", "Warranty Disputes", "Product Not as Described"],
      },
      // ── NOT YET DEVELOPED ──
      // {
      //   label: "Service Complaints",
      //   href: "/Services/ServiceComplaints",
      //   items: ["Poor Service Quality", "Incomplete Service", "Service Delay", "False Promises"],
      // },
      // {
      //   label: "Delivery Issues",
      //   href: "/Services/DeliveryIssues",
      //   items: ["Product Not Delivered", "Late Delivery", "Wrong Product Delivered"],
      // },
      // {
      //   label: "Refund & Billing Disputes",
      //   href: "/Services/RefundBillingDisputes",
      //   items: ["Refund Not Received", "Overcharging Complaints", "Hidden Charges Disputes"],
      // },
    ],
  },
  {
    id: "commercial",
    label: "Commercial Disputes",
    href: "/Services/CommercialDisputes",
    sub: [
      // ── NOT YET DEVELOPED ──
      // {
      //   label: "Trade & Business Disputes",
      //   href: "/Services/TradeBusinessDisputes",
      //   items: [
      //     "Trade Document Disputes",
      //     "Document & Transfer Disputes",
      //     "Cargo & Goods Transport Disputes",
      //     "Sale of Goods Disputes",
      //     "Trading Agency Disputes",
      //   ],
      // },
      // {
      //   label: "Finance & Banking Disputes",
      //   href: "/Services/FinanceBankingDisputes",
      //   items: [
      //     "Investment Agreement Disputes",
      //     "Insurance & Life Insurance Claim Disputes",
      //     "Financial Services Disputes",
      //     "Outsourcing & BPO Disputes",
      //     "Unpaid Invoices & Money Recovery",
      //     "Business Loan & Credit Disputes",
      //     "Cheque Bounce Disputes",
      //   ],
      // },
      {
        label: "Corporate & Business Agreement Disputes",
        href: "/Services/ContractDisputes",
        // items: [
        //   "Joint Venture Disputes",
        //   "Shareholder & Investor Disputes",
        //   "Business Partnership Disputes",
        //   "Management & Consultancy Agreement Disputes",
        //   "Distribution & Licensing Agreement Disputes",
        //   "Agency Contract Disputes",
        //   "Board & Management Conflicts",
        //   "Mergers & Acquisition Disputes",
        // ],
      },
      // ── NOT YET DEVELOPED ──
      // {
      //   label: "Construction & Infrastructure",
      //   href: "/Services/ConstructionInfrastructure",
      //   items: [
      //     "Construction Contract Disputes",
      //     "Infrastructure Project Disputes",
      //     "Tender & Procurement Disputes",
      //     "Contractor Payment Disputes",
      //     "Construction Defect & Quality Disputes",
      //     "Project Delay & Penalty Disputes",
      //   ],
      // },
      // {
      //   label: "Commercial Property Disputes",
      //   href: "/Services/CommercialPropertyDisputes",
      //   items: [
      //     "Commercial Property Lease Disputes",
      //     "Office Rent Disputes",
      //     "Warehouse & Industrial Rental Disputes",
      //     "Commercial Property Ownership Disputes",
      //     "Commercial Property Development Disputes",
      //   ],
      // },
      // {
      //   label: "Intellectual Property Disputes",
      //   href: "/Services/IntellectualPropertyDisputes",
      //   items: [
      //     "Trademark & Brand Disputes",
      //     "Copyright Infringement Disputes",
      //     "Patent Dispute Resolution",
      //     "Industrial Design Disputes",
      //     "Domain Name Disputes",
      //     "Trade Secret & Confidentiality Disputes",
      //   ],
      // },
      // {
      //   label: "Technology & Digital Disputes",
      //   href: "/Services/TechnologyDigitalDisputes",
      //   items: [
      //     "Technology Development Agreement Disputes",
      //     "Software & SaaS Licensing Disputes",
      //     "IT Services Agreement Disputes",
      //     "Digital Platform & App Disputes",
      //     "E-Commerce Platform Disputes",
      //   ],
      // },
      // {
      //   label: "Franchise & Distribution Disputes",
      //   href: "/Services/FranchiseDistributionDisputes",
      //   items: [
      //     "Franchise Agreement Disputes",
      //     "Franchise Royalty & Fee Disputes",
      //     "Franchise Territory Violation Disputes",
      //     "Franchise Termination Disputes",
      //     "Distribution Network Disputes",
      //     "Dealer/Ship Agreement Disputes",
      //   ],
      // },
      // {
      //   label: "Employment & Workforce Disputes",
      //   href: "/Services/EmploymentWorkforceDisputes",
      //   items: [
      //     "Employment Contract Disputes",
      //     "Wrongful Termination Disputes",
      //     "Salary & Severance Disputes",
      //     "Non-Compete Agreement Disputes",
      //     "Employee Confidentiality Disputes",
      //     "Contractor & Freelancer Disputes",
      //     "Workplace Harassment",
      //   ],
      // },
      // {
      //   label: "Contract & Agreement Disputes",
      //   href: "/Services/ContractAgreementDisputes",
      //   items: [
      //     "Breach of Contract",
      //     "Service Agreement Disputes",
      //     "Vendor & Supplier Contract Disputes",
      //     "Contract Non-Performance Disputes",
      //     "Payment Default Disputes",
      //     "Contract Cancellation Disputes",
      //   ],
      // },
    ],
  },
];

/* ─── Nav structure ─── */
const NAV_ITEMS = [
  {
    id: "solutions",
    label: "Solutions",
    href: "/Services",
    dropdown: {
      sections: [
        {
          title: "Solutions",
          items: SERVICE_TREE.map((cat) => ({
            icon: cat.id === "individual" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            ) : cat.id === "consumer" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            ),
            label: cat.label,
            desc: cat.id === "individual"
              ? "Resolve personal conflicts easily"
              : cat.id === "consumer"
              ? "Handle product and service issues"
              : "Manage business and contract disputes",
            href: cat.href,
            subTree: cat,
          })),
        },
      ],
    },
  },
  {
    id: "resources",
    label: "Resources",
    dropdown: {
      sections: [
        {
          title: "Resources",
          items: [
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              ),
              label: "Blog",
              desc: "Latest updates in legal-tech trends.",
              href: "/blog",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              ),
              label: "Help Center",
              desc: "Documentation and direct support.",
              href: "/help",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              ),
              label: "FAQs",
              desc: "Quick answers to common questions.",
              href: "/faq",
            },
          ],
        },
      ],
    },
  },
  {
    id: "pricing",
    label: "Pricing",
    href: "/pricing",
  },
];

/* ─── Solutions sub-panel (mega) ─── */
function SolutionsMega({ subTree, onClose }) {
  const [activeSub, setActiveSub] = useState(null);
  const activeSubObj = subTree?.sub.find((s) => s.label === activeSub);

  if (!subTree) return null;
  return (
    <div className="hdr-solutions-mega">
      <div className="hdr-mega-col hdr-mega-col--sub">
        <p className="hdr-mega-heading">{subTree.label}</p>
        {subTree.sub.map((sub) => (
          <div
            key={sub.label}
            className={`hdr-mega-sub-item ${activeSub === sub.label ? "active" : ""}`}
            onMouseEnter={() => setActiveSub(sub.label)}
          >
            <Link href={sub.href} onClick={onClose} className="hdr-mega-sub-link">
              {sub.label}
            </Link>
            {sub.items?.length > 0 && <span className="hdr-mega-chevron">›</span>}
          </div>
        ))}
      </div>
      {activeSubObj?.items?.length > 0 && (
        <div className="hdr-mega-col hdr-mega-col--items">
          <p className="hdr-mega-heading">{activeSubObj.label}</p>
          {activeSubObj.items.map((item) => (
            <div key={item} className="hdr-mega-item">
              <Link
                href={`${activeSubObj.href}#${item.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={onClose}
                className="hdr-mega-item-link"
              >
                {item}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   MOBILE MENU — 3-level slide panel
══════════════════════════════════════ */
function MobileMenu({ open, onClose, isLoggedIn, navigateToApp }) {
  // panel: "main" | "solutions" | "solutions-sub"
  const [panel, setPanel] = useState("main");
  const [activeCat, setActiveCat] = useState(null); // SERVICE_TREE item
  const [expandedCatId, setExpandedCatId] = useState(null); // for 3rd panel accordion

  // Reset panel when menu closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPanel("main");
        setActiveCat(null);
        setExpandedCatId(null);
      }, 300);
    }
  }, [open]);

  const goBack = () => {
    if (panel === "solutions-sub") setPanel("solutions");
    else if (panel === "solutions") setPanel("main");
  };

  const handleCatClick = (cat) => {
    setActiveCat(cat);
    setExpandedCatId(null);
    setPanel("solutions-sub");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`hdr-mob-overlay ${open ? "hdr-mob-overlay--show" : ""}`}
        onClick={onClose}
      />

      {/* Panel container */}
      <div className={`hdr-mob-panel-wrap ${open ? "hdr-mob-panel-wrap--open" : ""}`}>

        {/* ── PANEL 1: Main menu ── */}
        <div className={`hdr-mob-panel hdr-mob-panel--main ${panel === "main" ? "hdr-mob-panel--active" : panel !== "main" ? "hdr-mob-panel--left" : ""}`}>
          <div className="hdr-mob-panel__top">
            <Link href="/" onClick={onClose}>
              <Image src="/assets/images/logo.png" alt="RaaziMarzi Logo" width={130} height={32} />
            </Link>
            <button className="hdr-mob-panel__close" onClick={onClose} aria-label="Close menu">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <nav className="hdr-mob-panel__nav">
            {/* Solutions row — opens panel 2 */}
            <div className="hdr-mob-panel__row" onClick={() => setPanel("solutions")}>
              <span className="hdr-mob-panel__row-label">Solutions</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Resources row — opens panel 2 equivalent (simple links) */}
            <div className="hdr-mob-panel__row" onClick={() => setPanel("resources")}>
              <span className="hdr-mob-panel__row-label">Resources</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Static links */}
            <Link href="/pricing" className="hdr-mob-panel__row hdr-mob-panel__row--link" onClick={onClose}>
              <span className="hdr-mob-panel__row-label">Pricing</span>
            </Link>
          </nav>

          {/* CTA buttons */}
          <div className="hdr-mob-panel__cta">
            <button
              className="hdr-mob-panel__btn hdr-mob-panel__btn--outline"
              onClick={() => { onClose(); navigateToApp("/login"); }}
            >
              Log In
            </button>
            <button
              className="hdr-mob-panel__btn hdr-mob-panel__btn--filled"
              onClick={() => { onClose(); navigateToApp(isLoggedIn ? "/dashboard" : "/login"); }}
            >
              {isLoggedIn ? "My Dashboard" : "File a Case"}
            </button>
          </div>
        </div>

        {/* ── PANEL 2: Solutions ── */}
        <div className={`hdr-mob-panel hdr-mob-panel--solutions ${panel === "solutions" ? "hdr-mob-panel--active" : panel === "solutions-sub" ? "hdr-mob-panel--left" : ""}`}>
          <div className="hdr-mob-panel__top hdr-mob-panel__top--inner">
            <button className="hdr-mob-panel__back" onClick={goBack} aria-label="Go back">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="hdr-mob-panel__title">Solutions</span>
            <button className="hdr-mob-panel__close" onClick={onClose} aria-label="Close menu">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <nav className="hdr-mob-panel__nav">
            {SERVICE_TREE.map((cat) => (
              <div
                key={cat.id}
                className="hdr-mob-panel__card-row"
                onClick={() => handleCatClick(cat)}
              >
                <span className="hdr-mob-panel__card-icon">
                  {cat.id === "individual" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  ) : cat.id === "consumer" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  )}
                </span>
                <span className="hdr-mob-panel__card-text">
                  <span className="hdr-mob-panel__card-label">{cat.label}</span>
                  <span className="hdr-mob-panel__card-desc">
                    {cat.id === "individual" ? "Resolve personal conflicts easily" : cat.id === "consumer" ? "Handle product and service issues" : "Manage business and contract disputes"}
                  </span>
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="hdr-mob-panel__card-arrow">
                  <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ))}
          </nav>
        </div>

        {/* ── PANEL 2b: Resources ── */}
        <div className={`hdr-mob-panel hdr-mob-panel--resources ${panel === "resources" ? "hdr-mob-panel--active" : ""}`}>
          <div className="hdr-mob-panel__top hdr-mob-panel__top--inner">
            <button className="hdr-mob-panel__back" onClick={goBack} aria-label="Go back">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="hdr-mob-panel__title">Resources</span>
            <button className="hdr-mob-panel__close" onClick={onClose} aria-label="Close menu">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <nav className="hdr-mob-panel__nav">
            {[
              { label: "Blog", desc: "Latest updates in legal-tech trends.", href: "/blog" },
              { label: "Help Center", desc: "Documentation and direct support.", href: "/help" },
              { label: "FAQs", desc: "Quick answers to common questions.", href: "/faq" },
            ].map((r) => (
              <Link key={r.label} href={r.href} className="hdr-mob-panel__card-row" onClick={onClose}>
                <span className="hdr-mob-panel__card-text">
                  <span className="hdr-mob-panel__card-label">{r.label}</span>
                  <span className="hdr-mob-panel__card-desc">{r.desc}</span>
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* ── PANEL 3: Category sub-items ── */}
        <div className={`hdr-mob-panel hdr-mob-panel--sub ${panel === "solutions-sub" ? "hdr-mob-panel--active" : ""}`}>
          <div className="hdr-mob-panel__top hdr-mob-panel__top--inner">
            <button className="hdr-mob-panel__back" onClick={goBack} aria-label="Go back">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="hdr-mob-panel__title">Solutions</span>
            <button className="hdr-mob-panel__close" onClick={onClose} aria-label="Close menu">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {activeCat && (
            <>
              {/* Category header card */}
              <div className="hdr-mob-panel__cat-header">
                <span className="hdr-mob-panel__card-icon">
                  {activeCat.id === "individual" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  ) : activeCat.id === "consumer" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  )}
                </span>
                <span className="hdr-mob-panel__card-text">
                  <span className="hdr-mob-panel__card-label">{activeCat.label}</span>
                  <span className="hdr-mob-panel__card-desc">
                    {activeCat.id === "individual" ? "Resolve personal conflicts easily" : activeCat.id === "consumer" ? "Handle product and service issues" : "Manage business and contract disputes"}
                  </span>
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Sub-categories accordion */}
              <nav className="hdr-mob-panel__nav hdr-mob-panel__nav--sub">
                {activeCat.sub.map((sub) => {
                  const isExpanded = expandedCatId === sub.label;
                  return (
                    <div key={sub.label} className="hdr-mob-panel__accordion">
                      <div
                        className={`hdr-mob-panel__acc-row ${isExpanded ? "hdr-mob-panel__acc-row--open" : ""}`}
                        onClick={() => setExpandedCatId(isExpanded ? null : sub.label)}
                      >
                        <Link
                          href={sub.href}
                          className="hdr-mob-panel__acc-label"
                          onClick={(e) => { e.stopPropagation(); onClose(); }}
                        >
                          {sub.label}
                        </Link>
                        {sub.items?.length > 0 && (
                          <svg
                            width="14" height="14" viewBox="0 0 14 14" fill="none"
                            className={`hdr-mob-panel__acc-chevron ${isExpanded ? "hdr-mob-panel__acc-chevron--up" : ""}`}
                          >
                            <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      {isExpanded && sub.items?.length > 0 && (
                        <div className="hdr-mob-panel__acc-items">
                          {sub.items.map((item) => (
                            <Link
                              key={item}
                              href={`${sub.href}#${item.toLowerCase().replace(/\s+/g, "-")}`}
                              className="hdr-mob-panel__acc-item"
                              onClick={onClose}
                            >
                              {item}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </>
          )}
        </div>

      </div>
    </>
  );
}

/* ══════════════════════════════════════
   MAIN HEADER
══════════════════════════════════════ */
export default function Header() {
  const pathname = usePathname();
  const isLoggedIn = false; // TODO: replace with real auth

  const [scrolled, setScrolled] = useState(false);
  const [openNav, setOpenNav] = useState(null);
  const [activeSolution, setActiveSolution] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const dropdownRef = useRef(null);

  const navigateToApp = useCallback((path = "/login") => {
    try { window.location.href = `${APP_BASE_PATH}${path}`; }
    catch { window.location.href = "/app/login"; }
  }, []);

  /* scroll */
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  /* click outside */
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenNav(null);
        setActiveSolution(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* body scroll lock */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  /* escape key */
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        setOpenNav(null);
        setActiveSolution(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const closeAll = () => {
    setOpenNav(null);
    setActiveSolution(null);
    setMobileOpen(false);
  };

  const toggleNav = (id) => {
    if (openNav === id) { setOpenNav(null); setActiveSolution(null); }
    else { setOpenNav(id); setActiveSolution(null); }
  };

  return (
    <>
      <header className={`hdr ${scrolled ? "hdr--scrolled" : "hdr--top"}`}>
        <div className="hdr__inner">

{/* LOGO */}
<Link href="/" className="hdr__logo" aria-label="RaaziMarzi home">

  {/* Full logo with text — shown at top */}
  <Image
    src="/assets/icons/Logo.png"
    alt="RaaziMarzi Logo"
    width={160} height={40}
    priority
    sizes="160px"
    className="hdr__logo-full"
  />

  {/* Symbol/icon only — shown when scrolled */}
  <Image
    src="/assets/icons/Brand.png"
    alt="RaaziMarzi Icon"
    width={54} height={44}
    priority
    sizes="54px"
    className="hdr__logo-icon"
    unoptimized
  />

</Link>

          {/* DESKTOP NAV */}
          <nav className="hdr__nav" aria-label="Main navigation" ref={dropdownRef}>
            {NAV_ITEMS.map((item) => {
              const isOpen = openNav === item.id;
              const hasDropdown = !!item.dropdown;
              const isActive = item.id === "solutions"
                ? pathname.startsWith("/Services")
                : item.href
                ? pathname === item.href
                : pathname.startsWith(`/${item.id}`);

              return (
                <div key={item.id} className="hdr__nav-item">
                  {item.href && !hasDropdown ? (
                    <Link
                      href={item.href}
                      className={`hdr__nav-link ${isActive ? "hdr__nav-link--active" : ""}`}
                    >
                      {item.label}
                    </Link>
                  ) : item.href && hasDropdown ? (
                    <div className={`hdr__nav-btn-wrap ${isOpen ? "hdr__nav-btn--open" : ""} ${isActive ? "hdr__nav-btn--active" : ""}`}>
                      <Link href={item.href} className="hdr__nav-btn-label" onClick={closeAll}>
                        {item.label}
                      </Link>
                      <span
                        className="hdr__nav-btn-arrow"
                        role="button"
                        tabIndex={0}
                        aria-expanded={isOpen}
                        onClick={() => toggleNav(item.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleNav(item.id); } }}
                      >
                        <svg
                          className={`hdr__nav-chevron ${isOpen ? "hdr__nav-chevron--up" : ""}`}
                          width="12" height="12" viewBox="0 0 12 12" fill="none"
                        >
                          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </div>
                  ) : (
                    <button
                      className={`hdr__nav-btn ${isOpen ? "hdr__nav-btn--open" : ""} ${isActive ? "hdr__nav-btn--active" : ""}`}
                      onClick={() => toggleNav(item.id)}
                      aria-expanded={isOpen}
                    >
                      {item.label}
                      <svg
                        className={`hdr__nav-chevron ${isOpen ? "hdr__nav-chevron--up" : ""}`}
                        width="12" height="12" viewBox="0 0 12 12" fill="none"
                      >
                        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}

                  {/* DROPDOWN PANEL */}
                  {hasDropdown && isOpen && (
                    <div className={`hdr__dropdown hdr__dropdown--${item.id}`}>
                      {item.dropdown.sections.map((section) => (
                        <div key={section.title} className="hdr__dd-section">
                          <p className="hdr__dd-section-title">{section.title}</p>
                          <div className="hdr__dd-card">
                            {section.items.map((di) => (
                              <div key={di.label} className="hdr__dd-item-wrap">
                                <Link
                                  href={di.href}
                                  className="hdr__dd-item"
                                  onClick={() => { if (!di.subTree) closeAll(); }}
                                  onMouseEnter={() => {
                                    if (di.subTree) setActiveSolution(di.subTree);
                                    else setActiveSolution(null);
                                  }}
                                >
                                  <span className="hdr__dd-icon">{di.icon}</span>
                                  <span className="hdr__dd-text">
                                    <span className="hdr__dd-label">{di.label}</span>
                                    <span className="hdr__dd-desc">{di.desc}</span>
                                  </span>
                                  {di.subTree && (
                                    <svg className="hdr__dd-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Solutions mega panel */}
                      {item.id === "solutions" && activeSolution && (
                        <SolutionsMega subTree={activeSolution} onClose={closeAll} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* CTA BUTTONS */}
          <div className="hdr__cta">
            {isLoggedIn ? (
              <button className="hdr__btn hdr__btn--filled" onClick={() => navigateToApp("/dashboard")}>
                My Dashboard
              </button>
            ) : (
              <>
                <button className="hdr__btn hdr__btn--outline" onClick={() => navigateToApp("/login")}>
                  Log In
                </button>
                <button className="hdr__btn hdr__btn--filled" onClick={() => navigateToApp("/login")}>
                  File a Case
                </button>
              </>
            )}
          </div>

          {/* MOBILE HAMBURGER */}
          <button
            className="hdr__hamburger"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isLoggedIn={isLoggedIn}
        navigateToApp={navigateToApp}
      />
    </>
  );
}