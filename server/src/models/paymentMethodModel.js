import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["card", "upi", "bank"],
      required: true,
    },
    isDefault: { type: Boolean, default: false },

    // ── Card fields (CVV is NEVER stored) ──
    lastFour: { type: String },
    cardBrand: { type: String, enum: ["visa", "mastercard", "rupay", "amex", "other"] },
    cardholderName: { type: String },
    expiryMonth: { type: String },
    expiryYear: { type: String },

    // ── UPI fields ──
    upiIdMasked: { type: String },
    upiIdFull: { type: String, select: false }, // stored but excluded from default queries
    verifiedName: { type: String },

    // ── Bank Account fields ──
    accountHolderName: { type: String },
    accountNumberMasked: { type: String }, // e.g. "****7890"
    ifscCode: { type: String },
    accountType: { type: String, enum: ["savings", "current"] },
    bankName: { type: String },
  },
  { timestamps: true }
);

paymentMethodSchema.index({ userId: 1, isDefault: -1 });

export default mongoose.model("PaymentMethod", paymentMethodSchema);
