// src/pages/MediatorCaseMeetings.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { Video } from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import "./MediatorStub.css";

const MediatorCaseMeetings = () => {
  const navigate = useNavigate();
  return (
    <MediatorLayout>
      <div className="medstub-page">
        <div className="medstub-card">
          <div className="medstub-icon-wrap"><Video size={32} /></div>
          <h2>Case Meetings</h2>
          <span className="medstub-badge">Coming Next</span>
          <p>
            View all scheduled hearings and virtual sessions for your assigned cases.
            Join calls, review agendas, and record meeting notes from here.
          </p>
          <button className="medstub-back-btn" onClick={() => navigate("/mediator/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorCaseMeetings;
