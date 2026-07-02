// src/pages/MediatorDraftResolution.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { FileSignature } from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import "./MediatorStub.css";

const MediatorDraftResolution = () => {
  const navigate = useNavigate();
  return (
    <MediatorLayout>
      <div className="medstub-page">
        <div className="medstub-card">
          <div className="medstub-icon-wrap"><FileSignature size={32} /></div>
          <h2>Draft Resolution</h2>
          <span className="medstub-badge">Coming Next</span>
          <p>
            Draft, review, and prepare settlement agreements and resolution documents
            for parties' signatures directly from this module.
          </p>
          <button className="medstub-back-btn" onClick={() => navigate("/mediator/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorDraftResolution;
