const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Case title is required"],
    },
    description: {
      type: String,
      required: [true, "Case description is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Party1 or Party2
      required: true,
    },
    evidence: {
      type: String, // could be file path or text
      default: "",
    },
    mediator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assigned mediator
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Closed"],
      default: "Pending",
    },
    result: {
      type: String, // mediator’s result/decision
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Case", caseSchema);
