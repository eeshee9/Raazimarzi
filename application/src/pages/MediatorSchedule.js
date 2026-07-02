// src/pages/MediatorSchedule.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import "./MediatorStub.css";

const MediatorSchedule = () => {
  const navigate = useNavigate();
  return (
    <MediatorLayout>
      <div className="medstub-page">
        <div className="medstub-card">
          <div className="medstub-icon-wrap"><CalendarDays size={32} /></div>
          <h2>Schedule</h2>
          <span className="medstub-badge">Coming Next</span>
          <p>
            Your full calendar of hearings, sessions, and deadlines across all assigned
            cases will be visible and manageable here.
          </p>
          <button className="medstub-back-btn" onClick={() => navigate("/mediator/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorSchedule;
