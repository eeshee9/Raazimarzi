import React from "react";
import { useNavigate } from "react-router-dom";
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
import {
  FaCog,
  FaBell,
} from "react-icons/fa";

const FileNewCaseStep1 = () => {
  const navigate = useNavigate();
 const handleNext = () => {
    navigate("/user/file-new-case/step2");
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
          <div className="menu-item active" onClick={() => navigate("/user/file-new-case/step1")}>
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

      {/* Main Content */}
      <section className="main-section">
          {/* Navbar */}
               <header className="navbar">
                 <div></div>
                 <div className="nav-icons">
                   <FaCog className="icon" />
                   <FaBell className="icon" />
                   <div className="profile">
                     <img
                       src="https://i.pravatar.cc/40"
                       alt="profile"
                       className="profile-img"
                     />
                     <span>Rohan Singhania</span>
                   </div>
                 </div>
               </header>

                 {/* Step Progress Bar */}
        <div className="step-bar">
          <span className="active-step">Step 1</span>
          <span>Step 2</span>
          <span>Step 3</span>
        </div>


        <div className="form-content">
          <h4>Case Details</h4>
          <div className="form-grid">
            <input placeholder="Case Type" />
            <input placeholder="Case Title" />
            <input placeholder="Cause of Action" />
            <input placeholder="Relief Sought" />
            <input placeholder="Case Value" />
            <input placeholder="Case Title" />
          </div>

          <h4>Petitioner Details</h4>
          <div className="form-grid">
            <input placeholder="Full Name" />
            <input placeholder="Father/Spouse Name" />
            <input placeholder="Gender" />
            <input placeholder="Date of Birth" />
            <input placeholder="Mobile Number" />
            <input placeholder="Email ID" />
            <input placeholder="ID Proof Type" />
            <input placeholder="Upload ID Proof" />
            <input className="full-width" placeholder="Full Address" />
          </div>

          <h4>Defendant Details</h4>
          <div className="form-grid">
            <input placeholder="Full Name" />
            <input placeholder="Father/Spouse Name" />
            <input placeholder="Gender" />
            <input placeholder="Date of Birth" />
            <input placeholder="Mobile Number" />
            <input placeholder="Email ID" />
            <input placeholder="Any Identification Details" />
          </div>

           <button className="next-btn" onClick={handleNext}>Next</button>
    </div>
      </section>
    </div>
  );
};

export default FileNewCaseStep1;