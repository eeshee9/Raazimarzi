// src/pages/MediatorCloseCase.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import "./MediatorStub.css";

const MediatorCloseCase = () => {
  const navigate = useNavigate();
  return (
    <MediatorLayout>
      <div className="medstub-page">
        <div className="medstub-card">
          <div className="medstub-icon-wrap"><CheckCircle2 size={32} /></div>
          <h2>Close Case</h2>
          <span className="medstub-badge">Coming Next</span>
          <p>
            Submit case closure with resolution summary, upload award documents,
            and mark cases as formally resolved from this screen.
          </p>
          <button className="medstub-back-btn" onClick={() => navigate("/mediator/my-cases")}>
            Go to My Cases
          </button>
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorCloseCase;
