import React from "react";
import "./MediatorTerms.css";
import { Link } from "react-router-dom";
import logo from "../assets/Rzmzlogo.png";

const MediatorTerms = () => (
  <div className="mt-wrapper">
    <nav className="mt-nav">
      <div className="mt-nav-logo">
        <img src={logo} alt="RaaziMarzi" />
      </div>
      <Link to="/mediator/login" className="mt-nav-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        Back to Login
      </Link>
    </nav>

    <div className="mt-hero">
      <h1>Terms And Conditions</h1>
    </div>

    <div className="mt-card">
      <p>
        By registering and serving as a Mediator on the Razi Marzi platform, you agree to the following obligations and professional standards:
      </p>

      <h2>1. Confidentiality &amp; Non-Disclosure</h2>
      <p>As a Mediator, you acknowledge that all information, documents, communications, recordings, and discussions shared during the mediation process are strictly confidential.</p>
      <p>You shall:</p>
      <ul>
        <li>Not disclose any case-related information to any third party.</li>
        <li>Not share, copy, download, distribute, or publish confidential materials outside the platform.</li>
        <li>Use information obtained during mediation solely for the purpose of facilitating dispute resolution.</li>
        <li>Continue to maintain confidentiality even after the closure of a case or termination of your association with Razi Marzi.</li>
      </ul>
      <p>Any unauthorized disclosure may result in immediate termination of platform access and further legal action where applicable.</p>

      <h2>2. Neutrality &amp; Impartiality</h2>
      <p>You agree to remain impartial and independent throughout the mediation process.</p>
      <p>You shall:</p>
      <ul>
        <li>Treat all parties fairly and equally.</li>
        <li>Avoid conflicts of interest.</li>
        <li>Disclose any personal, professional, or financial relationship with a party involved in a dispute.</li>
        <li>Refrain from favoring, influencing, or coercing any participant.</li>
      </ul>

      <h2>3. Professional Conduct</h2>
      <p>You agree to conduct all mediations with professionalism, integrity, respect, and diligence.</p>
      <p>You shall:</p>
      <ul>
        <li>Maintain appropriate communication with all parties.</li>
        <li>Act in accordance with applicable mediation standards and ethical guidelines.</li>
        <li>Avoid abusive, discriminatory, or inappropriate conduct.</li>
      </ul>

      <h2>4. Case Commitment &amp; Continuity</h2>
      <p>Upon accepting a mediation assignment, you commit to actively managing the matter until its conclusion.</p>
      <p>You shall not:</p>
      <ul>
        <li>Abandon an assigned case without valid justification.</li>
        <li>Discontinue participation midway through proceedings without prior approval from the Razi Marzi administration.</li>
      </ul>
      <p>If exceptional circumstances prevent you from continuing, you must immediately notify the platform administration and cooperate in the orderly transfer of the matter.</p>

      <h2>5. Resolution Responsibility</h2>
      <p>You acknowledge that your role is to facilitate constructive dialogue and assist parties in reaching a mutually acceptable resolution.</p>
      <p>You agree to:</p>
      <ul>
        <li>Attend scheduled mediation sessions.</li>
        <li>Maintain timely communication.</li>
        <li>Properly document mediation progress and outcomes within the platform.</li>
        <li>Make reasonable efforts to bring assigned matters to a formal closure.</li>
      </ul>

      <h2>6. Platform Compliance</h2>
      <p>You shall use the platform only for authorized dispute resolution activities and comply with all operational guidelines issued by Razi Marzi.</p>

      <h2>7. Verification &amp; Credential Accuracy</h2>
      <p>You confirm that all information, certifications, qualifications, and documents submitted during registration are accurate and authentic.</p>
      <p>Any false, misleading, or fraudulent information may result in rejection, suspension, or permanent removal from the platform.</p>

      <h2>8. Suspension &amp; Removal</h2>
      <p>Razi Marzi reserves the right to suspend, restrict, or terminate mediator access in cases involving:</p>
      <ul>
        <li>Breach of confidentiality.</li>
        <li>Conflict of interest.</li>
        <li>Unprofessional conduct.</li>
        <li>Repeated failure to manage assigned cases.</li>
        <li>Submission of false information.</li>
        <li>Violation of platform policies.</li>
      </ul>

      <h2>9. Acceptance</h2>
      <p>By proceeding with registration, you acknowledge that you have read, understood, and agree to comply with these Mediator Terms &amp; Conditions and all applicable policies of Razi Marzi.</p>

      <Link to="/mediator/login" className="mt-back-btn">Back to Login</Link>
    </div>
  </div>
);

export default MediatorTerms;
