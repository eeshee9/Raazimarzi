// src/pages/MediatorHearingRoom.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { Video } from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import "./MediatorStub.css";

const MediatorHearingRoom = () => {
  const navigate = useNavigate();
  return (
    <MediatorLayout>
      <div className="medstub-page">
        <div className="medstub-card">
          <div className="medstub-icon-wrap"><Video size={32} /></div>
          <h2>Hearing Room</h2>
          <span className="medstub-badge">Coming Next</span>
          <p>
            Join or manage virtual and in-person hearing sessions, view meeting details,
            and access recordings from this room.
          </p>
          <button className="medstub-back-btn" onClick={() => navigate("/mediator/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorHearingRoom;
