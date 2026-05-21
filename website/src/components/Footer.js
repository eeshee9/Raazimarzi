"use client";

import Image from "next/image";
import Link from "next/link";
import "../styles/footer.css";
import { FaInstagram, FaLinkedin, FaFacebook } from "react-icons/fa";

const WEBSITE_PATH = "/website";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        {/* ── Brand: logo + tagline + socials ── */}
        <div className="footer-brand">
          <Link href={WEBSITE_PATH}>
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

          <div className="social-icons">
            <a href="#" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="#" aria-label="LinkedIn">
              <FaLinkedin />
            </a>
            <a href="#" aria-label="Facebook">
              <FaFacebook />
            </a>
          </div>
        </div>

        {/* ── 4 link columns ── */}
        <div className="footer-links">
          {/* Product */}
          <div>
            <h4>Product</h4>
            <Link href={`${WEBSITE_PATH}/user`}>User</Link>
            <Link href={`${WEBSITE_PATH}/mediator`}>Mediator</Link>
            <Link href={`${WEBSITE_PATH}/how-it-works`}>How It Works</Link>
          </div>

             {/* Solutions */}
          <div>
            <h4>Solutions</h4>
            <Link href={`/Services/IndividualDisputes`}>Individual Disputes</Link>
            <Link href={`/Services/ConsumerDisputes`}>Consumer Disputes</Link>
            <Link href={`/Services/CommercialDisputes`}>Commercial Disputes</Link>
          </div>

          {/* Resources */}
          <div>
            <h4>Resources</h4>
            <Link href={`${WEBSITE_PATH}/blog`}>Blog</Link>
            <Link href={`${WEBSITE_PATH}/help`}>Help Center</Link>
            <Link href={`${WEBSITE_PATH}/faq`}>FAQs</Link>
          </div>

          {/* Legal */}
          <div>
            <h4>Legal</h4>
            <Link href={`${WEBSITE_PATH}/terms`}>Terms &amp; Conditions</Link>
            <Link href={`${WEBSITE_PATH}/privacy-policy`}>Privacy Policy</Link>
            <Link href={`${WEBSITE_PATH}/security`}>Security</Link>
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