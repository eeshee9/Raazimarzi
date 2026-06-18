"use client";

import Image from "next/image";
import Link from "next/link";
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        {/* ── Brand: logo + tagline ── */}
        <div className="footer-brand">
          <Link href="/">
            <Image
              src="/assets/images/logo.png"
              alt="RaaziMarzi Logo"
              width={160}
              height={50}
              priority
              className="footer-logo"
            />
          </Link>

          <p className="footer-tagline">
            Resolve disputes faster with secure online mediation. Effortless
            compliance and professional calm.
          </p>
        </div>

        {/* ── Link columns ── */}
        <div className="footer-links">
          {/* Solutions */}
          <div>
            <h4>Solutions</h4>
            <Link href="/Services/IndividualDisputes">Individual Disputes</Link>
            <Link href="/Services/ConsumerDisputes">Consumer Disputes</Link>
            <Link href="/Services/CommercialDisputes">Commercial Disputes</Link>
          </div>

          {/* Legal */}
          <div>
            <h4>Legal</h4>
            <Link href="/terms">Terms &amp; Conditions</Link>
            <Link href="/privacy-policy">Privacy Policy</Link>
          </div>
        </div>
      </div>

      <hr className="footer-divider" />

      <div className="footer-bottom">
        © {new Date().getFullYear()} RaaziMarzi. All rights reserved. Made with ♥ in India By{" "}
        <a href="https://eagleeyedigital.in" target="_blank" rel="noopener noreferrer">
          EagleEye Digital
        </a>
      </div>
    </footer>
  );
}
