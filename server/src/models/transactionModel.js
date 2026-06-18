import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // Display IDs (human-readable)
    txnId: { type: String, unique: true, index: true },
    invoiceNumber: { type: String, unique: true },

    // Ownership
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Case linkage
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "Case", default: null },
    caseTitle: { type: String, default: "" },
    caseCaseId: { type: String, default: "" }, // e.g. "RM-1023"

    // Payment purpose
    paymentType: {
      type: String,
      enum: ["filing-fee", "mediator-fee", "arbitrator-fee", "other"],
      default: "mediator-fee",
    },
    description: { type: String, default: "Mediation Fee" },

    // Amounts (stored in INR, total = subtotal + gstAmount)
    subtotal: { type: Number, required: true },
    gstPercent: { type: Number, default: 18 },
    gstAmount: { type: Number, required: true },
    amount: { type: Number, required: true }, // total
    currency: { type: String, default: "INR" },

    // Status
    status: {
      type: String,
      enum: ["paid", "pending", "failed"],
      default: "pending",
      index: true,
    },
    paymentMethod: { type: String, default: "" }, // human label e.g. "Bank Transfer (HDFC)"
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      default: null,
    },
    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: "" },
    notes: { type: String, default: "" },

    // Razorpay placeholders — wire up when Razorpay goes live
    // TODO: Razorpay integration point
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
  },
  { timestamps: true }
);

// Auto-generate human-readable IDs before first save
transactionSchema.pre("save", async function (next) {
  if (!this.isNew) return next();
  try {
    if (!this.txnId) {
      const ts = Date.now().toString().slice(-5);
      const rand = Math.floor(100 + Math.random() * 900);
      this.txnId = `TXN-${ts}${rand}`;
    }
    if (!this.invoiceNumber) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.invoiceNumber = `INV-${rand}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Transaction", transactionSchema);
