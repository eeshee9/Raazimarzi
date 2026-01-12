import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CaseContext } from "../context/caseContext"; // 

import HomeIcon from "../assets/icons/home.png";
import FileIcon from "../assets/icons/file.png";
import MeetingIcon from "../assets/icons/meeting.png";
import CaseIcon from "../assets/icons/newcase.png";
import DocsIcon from "../assets/icons/document.png";
import ChatIcon from "../assets/icons/chat.png";
import PaymentIcon from "../assets/icons/payment.png";
import SupportIcon from "../assets/icons/support.png";
import LogoutIcon from "../assets/icons/logout.png";

import "../pages/FileNewCase.css";
import { FaCog, FaBell } from "react-icons/fa";

const FileNewCaseStep2 = () => {
  const navigate = useNavigate();
  const { caseData } = useContext(CaseContext); // ✅ data from Step 1

  const [formData, setFormData] = useState({
    caseSummary: "",
    documentTitle: "",
    documentType: "",
    witnessDetails: "",
    place: "",
    date: "",
    digitalSignature: "",
    declaration: false,
  });

  // ✅ Handle inputs & checkbox
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // ✅ Submit handler
  const handleSubmit = async () => {
    try {
      if (!caseData || Object.keys(caseData).length === 0) {
        alert("⚠️ Please complete Step 1 first.");
        navigate("/user/file-new-case/step1");
        return;
      }

      const token = localStorage.getItem("token");

      const finalData = {
        ...caseData,
        caseFacts: {
          caseSummary: formData.caseSummary,
          documentTitle: formData.documentTitle,
          documentType: formData.documentType,
          witnessDetails: formData.witnessDetails,
          place: formData.place,
          date: formData.date,
          digitalSignature: formData.digitalSignature,
          declaration: Boolean(formData.declaration),
        },
      };

      console.log("📤 Sending case data to backend:", finalData);

      const res = await axios.post("http://localhost:5000/api/cases/file", finalData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (res.data.success) {
        alert("✅ Case filed successfully!");
        navigate("/user/my-cases");
      } else {
        alert("⚠️ Something went wrong while filing the case.");
      }
    } catch (error) {
      console.error("❌ Error submitting case:", error.response || error.message);
      alert("Error submitting case. Please try again later.");
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="sidebar-title">Dashboard</h2>
        <nav className="menu">
          <div className="menu-item" onClick={() => navigate("/user/dashboard")}>
            <img src={HomeIcon} alt="Home" />
            <span>Home</span>
          </div>

          <div className="menu-item active" onClick={() => navigate("/user/file-new-case/step2")}>
            <img src={FileIcon} alt="File New Case" />
            <span>File New Case</span>
          </div>

          <div className="menu-item" onClick={() => navigate("/user/my-cases")}>
            <img src={CaseIcon} alt="My Cases" />
            <span>My Cases</span>
          </div>

          <div className="menu-item" onClick={() => navigate("/user/case-meetings")}>
            <img src={MeetingIcon} alt="Case Meetings" />
            <span>Case Meetings</span>
          </div>

          <div className="menu-item">
            <img src={DocsIcon} alt="Documents" />
            <span>Documents</span>
          </div>

          <div className="menu-item">
            <img src={ChatIcon} alt="Chats" />
            <span>Chats</span>
          </div>

          <div className="menu-item">
            <img src={PaymentIcon} alt="Payment" />
            <span>Payment</span>
          </div>

          <div className="menu-item">
            <img src={SupportIcon} alt="Support" />
            <span>Support</span>
          </div>
        </nav>

        <div className="logout">
          <div className="menu-item">
            <img src={LogoutIcon} alt="Logout" />
            <span>Log out</span>
          </div>
        </div>
      </aside>

      {/* Main Section */}
      <section className="main-section">
        <header className="navbar">
          <div></div>
          <div className="nav-icons">
            <FaCog className="icon" />
            <FaBell className="icon" />
            <div className="profile">
              <img src="https://i.pravatar.cc/40" alt="profile" className="profile-img" />
              <span>Rohan Singhania</span>
            </div>
          </div>
        </header>

        {/* Step Progress Bar */}
        <div className="step-bar">
          <span>Step 1</span>
          <span className="active-step">Step 2</span>
          <span>Step 3</span>
        </div>

        {/* Form Content */}
        <div className="form-content">
          <h4>Case Facts & Evidence</h4>
          <textarea
            name="caseSummary"
            placeholder="Case Summary"
            value={formData.caseSummary}
            onChange={handleChange}
          ></textarea>

          <div className="form-grid">
            <input
              name="documentTitle"
              placeholder="Document Title"
              value={formData.documentTitle}
              onChange={handleChange}
            />
            <input
              name="documentType"
              placeholder="Document Type"
              value={formData.documentType}
              onChange={handleChange}
            />
            <input
              name="witnessDetails"
              placeholder="Witness Details"
              value={formData.witnessDetails}
              onChange={handleChange}
            />
          </div>

          <h4>Verification & Affidavit</h4>
          <div className="form-grid">
            <input
              name="place"
              placeholder="Place"
              value={formData.place}
              onChange={handleChange}
            />
            <input
              name="date"
              type="date"
              placeholder="Date"
              value={formData.date}
              onChange={handleChange}
            />
            <input
              name="digitalSignature"
              placeholder="Upload Digital Signature"
              value={formData.digitalSignature}
              onChange={handleChange}
            />
          </div>

          <div className="declaration">
            <input
              type="checkbox"
              id="declaration"
              name="declaration"
              checked={formData.declaration}
              onChange={handleChange}
            />
            <label htmlFor="declaration">
              I hereby declare that the above information is true.
            </label>
          </div>

          <div className="button-group">
            <button className="prev-btn" onClick={() => navigate("/user/file-new-case/step1")}>
              ← Back
            </button>
            <button className="next-btn" onClick={handleSubmit}>
              Submit Case
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FileNewCaseStep2;
