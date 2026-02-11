// src/pages/UserCaseMeetingsNextPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";

import "./UserCaseMeetingsNextPage.css";
import { FaVideo, FaPhoneSlash, FaMicrophone, FaDesktop, FaCog } from "react-icons/fa";

const UserCaseMeetingsNextPage = () => {
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([
    {
      sender: "Abhishek Singh",
      text: "It is a long established fact that a reader will be distracted by the readable content of a page.",
      time: "03:15 pm",
      type: "opponent",
    },
    {
      sender: "Rohan Singh",
      text: "Sure, noted!",
      time: "03:16 pm",
      type: "mediator",
    },
  ]);

  const handleSend = () => {
    if (message.trim() === "") return;

    setChat((prev) => [
      ...prev,
      {
        sender: "You",
        text: message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "self",
      },
    ]);

    setMessage("");
  };

  return (
    <div className="dashboard-container">
      {/* Reusable Sidebar */}
      <UserSidebar activePage="meetings" />

      {/* Main Content */}
      <section className="main-section">
        {/* Reusable Navbar */}
        <UserNavbar />

        {/* Meeting Section */}
        <div className="meeting-container">
          <div className="meeting-header">
            <button className="ongoing-btn">On going meeting</button>
            <button className="case-btn">Case Session</button>
          </div>

          <div className="video-section">
            <div className="video-card opponent">
              <img src="https://i.pravatar.cc/500?img=12" alt="Opponent" className="video-frame" />
              <span className="label">Opponent</span>
            </div>
            <div className="video-card mediator">
              <img src="https://i.pravatar.cc/500?img=32" alt="Mediator" className="video-frame" />
              <span className="label">Mediator</span>
            </div>
            <div className="video-small">
              <img src="https://i.pravatar.cc/150?img=56" alt="You" className="video-frame-small" />
            </div>
          </div>

          <div className="controls">
            <FaVideo className="control-icon" />
            <FaDesktop className="control-icon" />
            <FaPhoneSlash className="control-icon end-call" />
            <FaMicrophone className="control-icon" />
            <FaCog className="control-icon" />
          </div>

          {/* Chat Section */}
          <div className="chat-section">
            <div className="chat-users">
              <h4>Chat Box</h4>
              <div className="chat-user">
                <img src="https://i.pravatar.cc/40?img=12" alt="Opponent" />
                <div>
                  <p className="name">Abhishek Singh</p>
                  <p className="role">Opponent</p>
                </div>
              </div>
              <div className="chat-user">
                <img src="https://i.pravatar.cc/40?img=32" alt="Mediator" />
                <div>
                  <p className="name">Rohan Singh</p>
                  <p className="role">Mediator</p>
                </div>
              </div>
            </div>

            <div className="chat-box">
              <div className="chat-messages">
                <p className="chat-date">Today</p>
                {chat.length === 0 ? (
                  <p style={{ textAlign: "center", padding: 10 }}>No messages yet.</p>
                ) : (
                  chat.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.type === "self" ? "self" : ""}`}>
                      <p className="chat-text">{msg.text}</p>
                      <span className="chat-time">{msg.time}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  placeholder="Write a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button onClick={handleSend} disabled={!message.trim()}>
                  &#9658;
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserCaseMeetingsNextPage;