import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeIcon from "../assets/icons/home.png";
import Vector from "../assets/icons/Vector.png";
import FileIcon from "../assets/icons/file.png";
import MeetingIcon from "../assets/icons/meeting.png";
import CaseIcon from "../assets/icons/newcase.png";
import DocsIcon from "../assets/icons/document.png";
import ChatIcon from "../assets/icons/chat.png";
import PaymentIcon from "../assets/icons/payment.png";
import SupportIcon from "../assets/icons/support.png";
import LogoutIcon from "../assets/icons/logout.png";
import "../pages/UserMyCases.css";
import { FaCog, FaBell } from "react-icons/fa";

const Dashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Dummy data for tables
  const raisedCases = [
    { id: "#3201", title: "Property Dispute", party1: "Mohan Das", party2: "Ravi Gupta", category: "Property Dispute", mediator: "Ajay Sharma", status: "Active" },
    { id: "#3202", title: "Property Dispute", party1: "Mohan Das", party2: "Ravi Gupta", category: "Property Dispute", mediator: "Ajay Sharma", status: "Hold" },
    { id: "#3203", title: "Property Dispute", party1: "Mohan Das", party2: "Ravi Gupta", category: "Property Dispute", mediator: "Ajay Sharma", status: "Pending" },
    { id: "#3204", title: "Property Dispute", party1: "Mohan Das", party2: "Ravi Gupta", category: "Property Dispute", mediator: "Ajay Sharma", status: "Active" },
    { id: "#3205", title: "Property Dispute", party1: "Mohan Das", party2: "Ravi Gupta", category: "Property Dispute", mediator: "Ajay Sharma", status: "Hold" },
    { id: "#3206", title: "Property Dispute", party1: "Mohan Das", party2: "Ravi Gupta", category: "Property Dispute", mediator: "Ajay Sharma", status: "Pending" },
  ];

  const opponentCases = [
    { id: "#3201", title: "Property Dispute", party1: "Mohan Das", party2: "Ravi Gupta", category: "Property Dispute", mediator: "Ajay Sharma", status: "Active" },
    { id: "#3202", title: "Property Dispute", party1: "Mohan Das", party2: "Ravi Gupta", category: "Property Dispute", mediator: "Ajay Sharma", status: "Hold" },
    { id: "#3203", title: "Property Dispute", party1: "Mohan Das", party2: "Ravi Gupta", category: "Property Dispute", mediator: "Ajay Sharma", status: "Active" },
  ];

  // Handlers
  const handleReset = () => setSearch("");

  const filteredRaisedCases = raisedCases.filter((c) =>
    c.id.toLowerCase().includes(search.toLowerCase())
  );
  const filteredOpponentCases = opponentCases.filter((c) =>
    c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="sidebar-title">Dashboard</h2>
        <nav className="menu">
          <div className="menu-item " onClick={() => navigate("/user/dashboard")}>
            <img src={HomeIcon} alt="Home" />
            <span>Home</span>
          </div>
           <div className="menu-item" onClick={() => navigate("/user/my-profile")}>
                      <img src={Vector} alt="Profile" />
                      <span>My Profile</span>
                    </div>        
          <div
            className="menu-item "
            onClick={() => navigate("/user/file-new-case/step1")}
          >
            <img src={FileIcon} alt="File New Case" />
            <span>File New Case</span>
          </div>
             <div className="menu-item active" onClick={() => navigate("/user/my-cases")}>
            <img src={CaseIcon} alt="My Cases" />
            <span>My Cases</span>
          </div>
          <div className="menu-item" onClick={() => navigate("/user/case-meetings")}>
            <img src={MeetingIcon} alt="Case Meetings" />
            <span>Case Meetings</span>
          </div>
          <div className="menu-item" onClick={() => navigate("/user/documents")}>
            <img src={DocsIcon} alt="Documents" />
            <span>Documents</span>
          </div>
          <div className="menu-item" onClick={() => navigate("/user/chats")}>
            <img src={ChatIcon} alt="Chats" />
            <span>Chats</span>
          </div>
          <div className="menu-item" onClick={() => navigate("/user/payment")}>
            <img src={PaymentIcon} alt="Payment" />
            <span>Payment</span>
          </div>
          <div className="menu-item" onClick={() => navigate("/user/support")}>
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

        {/* Search bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by case id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="reset-btn" onClick={handleReset}>
            Reset
          </button>
        </div>

        {/* My Raised Cases */}
        <div className="table-section">
          <div className="section-header">
            <h3>My Raised Cases</h3>
            <button className="view-all">View all</button>
          </div>
          <table className="cases-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Title</th>
                <th>Party 1</th>
                <th>Party 2</th>
                <th>Category</th>
                <th>Mediator</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRaisedCases.map((c, i) => (
                <tr key={i}>
                  <td>{c.id}</td>
                  <td>{c.title}</td>
                  <td>{c.party1}</td>
                  <td>{c.party2}</td>
                  <td>{c.category}</td>
                  <td>{c.mediator}</td>
                  <td className={`status ${c.status.toLowerCase()}`}>
                    {c.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Opponent Parties Raised Cases */}
        <div className="table-section">
          <div className="section-header">
            <h3>Opponent Parties Raised Cases</h3>
            <button className="view-all">View all</button>
          </div>
          <table className="cases-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Title</th>
                <th>Party 1</th>
                <th>Party 2</th>
                <th>Category</th>
                <th>Mediator</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpponentCases.map((c, i) => (
                <tr key={i}>
                  <td>{c.id}</td>
                  <td>{c.title}</td>
                  <td>{c.party1}</td>
                  <td>{c.party2}</td>
                  <td>{c.category}</td>
                  <td>{c.mediator}</td>
                  <td className={`status ${c.status.toLowerCase()}`}>
                    {c.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
