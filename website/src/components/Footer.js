"use client";

import Image from "next/image";
import Link from "next/link";
import "../styles/footer.css";
import { FaInstagram, FaFacebook, FaWhatsapp } from "react-icons/fa";

const WEBSITE_PATH = "/website";
const APP_PATH = "/app";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        {/* Logo */}
        <Link href={WEBSITE_PATH}>
          <Image
            src="/assets/images/logo.png"
            alt="RaaziMarzi Logo"
            width={160}
            height={50}
            priority
            className="logo"
          />
        </Link>

        {/* Social */}
        <div className="footer-social">
          <p>Follow Us</p>
          <div className="social-icons">
            <a href="#" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="#" aria-label="Facebook">
              <FaFacebook />
            </a>
            <a href="#" aria-label="WhatsApp">
              <FaWhatsapp />
            </a>
          </div>
        </div>

        {/* Newsletter */}
        <div className="footer-newsletter">
          <p>Join Our Newsletter</p>
          <div className="newsletter-box">
            <input type="email" placeholder="Email address" />
            <button type="button">Submit</button>
          </div>
          <span className="newsletter-text">
            Subscribe to our newsletter
          </span>
        </div>
      </div>

      <hr className="footer-divider" />

      <div className="footer-links">
        <div>
          <h4>Company</h4>
          <Link href={`${WEBSITE_PATH}/about-us`}>About Us</Link>
          <Link href={`${WEBSITE_PATH}/mission`}>Our Mission</Link>
          <Link href={`${WEBSITE_PATH}/team`}>Our Team</Link>
          <Link href={`${WEBSITE_PATH}/careers`}>Careers</Link>
          <Link href={`${WEBSITE_PATH}/contact`}>Contact Us</Link>
        </div>

        <div>
          <h4>ODR Service</h4>
          <Link href={`${WEBSITE_PATH}/services/case-filing`}>Case Filing</Link>
          <Link href={`${WEBSITE_PATH}/services/mediation`}>Mediation</Link>
          <Link href={`${WEBSITE_PATH}/services/document-review`}>Document Review</Link>
          <Link href={`${WEBSITE_PATH}/services/legal-drafting`}>Legal Drafting</Link>
          <Link href={`${WEBSITE_PATH}/services/arbitration`}>Arbitration</Link>
        </div>

        <div>
          <h4>Platform</h4>
          <Link href={`${WEBSITE_PATH}/how-it-works`}>How ODR Works</Link>
          <Link href={`${WEBSITE_PATH}/pricing`}>Pricing</Link>
          <Link href={`${WEBSITE_PATH}/faq`}>FAQs</Link>
          <Link href={`${WEBSITE_PATH}/partners`}>Partner with Us</Link>
          <Link href={`${WEBSITE_PATH}/success-stories`}>Success Stories</Link>
        </div>

        <div>
          <h4>Legal</h4>
          <Link href={`${WEBSITE_PATH}/privacy-policy`}>Privacy Policy</Link>
          <Link href={`${WEBSITE_PATH}/terms`}>Terms & Conditions</Link>
          <Link href={`${WEBSITE_PATH}/refund-policy`}>Refund Policy</Link>
        </div>

        <div>
          <h4>Support</h4>
          <Link href={`${WEBSITE_PATH}/help`}>Help Center</Link>
          <Link href={`${WEBSITE_PATH}/support`}>Raise a Ticket</Link>
          <Link href="mailto:support@raazimarzi.com">Support Email</Link>
          <Link href={`${WEBSITE_PATH}/chat`}>Live Chat</Link>
        </div>

        <div>
          <h4>Quick Links</h4>
          <Link href={`${APP_PATH}/file-case`}>File a Case</Link>
          <Link href={`${APP_PATH}/dashboard`}>Track Your Case</Link>
          <Link href={`${APP_PATH}/advocate-register`}>Advocate Registration</Link>
          <Link href={`${APP_PATH}/login`}>Client Login</Link>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} RaaziMarzi. All rights reserved.
      </div>
    </footer>
  );
}
