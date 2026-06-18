import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — RaaziMarzi",
  description: "Privacy Policy for the RaaziMarzi Online Dispute Resolution platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main style={{
        maxWidth: "760px",
        margin: "0 auto",
        padding: "120px 24px 80px",
        fontFamily: "inherit",
      }}>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Legal</p>
        <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#111827", marginBottom: "16px" }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: "15px", color: "#6b7280", marginBottom: "40px" }}>
          Last updated: June 2025
        </p>

        <div style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "32px",
          marginBottom: "40px",
        }}>
          <p style={{ fontSize: "15px", color: "#374151", lineHeight: "1.7", margin: 0 }}>
            We are currently finalising our Privacy Policy. This document will be published here before
            the platform goes live for public access. It will cover how we collect, store, and protect
            your personal data in accordance with applicable Indian data protection laws.
          </p>
          <p style={{ fontSize: "15px", color: "#374151", lineHeight: "1.7", marginTop: "16px" }}>
            RaaziMarzi is committed to protecting your privacy. Your dispute information and personal
            details are kept strictly confidential and are never shared with third parties without
            your consent.
          </p>
          <p style={{ fontSize: "15px", color: "#374151", lineHeight: "1.7", marginTop: "16px", marginBottom: 0 }}>
            For privacy-related questions, please{" "}
            <Link href="/ContactUs" style={{ color: "#5b21b6", fontWeight: "600", textDecoration: "none" }}>
              contact us
            </Link>
            .
          </p>
        </div>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "14px",
            color: "#5b21b6",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          ← Back to Home
        </Link>
      </main>
      <Footer />
    </>
  );
}
