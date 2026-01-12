import mongoose from "mongoose";

const caseSchema = new mongoose.Schema(
  {
    caseType: String,
    caseTitle: String,
    causeOfAction: String,
    reliefSought: String,
    caseValue: String,

    petitionerDetails: {
      fullName: String,
      fatherName: String,
      gender: String,
      dob: String,
      mobileNumber: String,
      email: String,
      address: String,
      idProofType: String,
      idProofFile: String,
    },

    defendantDetails: {
      fullName: String,
      fatherName: String,
      gender: String,
      dob: String,
      mobileNumber: String,
      email: String,
      identificationDetails: String,
    },

    caseFacts: {
      caseSummary: String,
      documentTitle: String,
      documentType: String,
      witnessDetails: String,
      place: String,
      date: String,
      digitalSignature: String,
      declaration: Boolean,
    },

    caseStatus: {
      type: String,
      default: "Pending",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    caseId: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Case", caseSchema);
