// src/pages/MediatorPayment.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard } from "lucide-react";
import MediatorLayout from "../components/MediatorLayout";
import "./MediatorStub.css";

const MediatorPayment = () => {
  const navigate = useNavigate();
  return (
    <MediatorLayout>
      <div className="medstub-page">
        <div className="medstub-card">
          <div className="medstub-icon-wrap"><CreditCard size={32} /></div>
          <h2>Payment</h2>
          <span className="medstub-badge">Coming Next</span>
          <p>
            View your earnings, invoices, and payment history for completed mediations.
            Track fees and manage your payout preferences from here.
          </p>
          <button className="medstub-back-btn" onClick={() => navigate("/mediator/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </MediatorLayout>
  );
};

export default MediatorPayment;
