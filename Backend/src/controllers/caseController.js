// import Case from "../models/caseModel.js";

// // ✅ File a new case
// export const fileNewCase = async (req, res) => {
//   try {
//     const data = req.body;
//     const file = req.file;

//     if (!data.caseTitle || !data.createdBy) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }
//     // Validate basic required fields
//     if (!data.caseTitle || !data.createdBy) {
//       return res.status(400).json({ message: "Required fields missing" });
//     }

//     // Generate unique caseId
//     const caseId = "CASE-" + Math.floor(100000 + Math.random() * 900000);

//     const newCase = new Case({
//       caseType: data.caseType,
//       caseTitle: data.caseTitle,
//       causeOfAction: data.causeOfAction,
//       reliefSought: data.reliefSought,
//       caseValue: data.caseValue,
//       petitionerDetails: data.petitionerDetails,
//       defendantDetails: data.defendantDetails,
//       caseFacts: {
//         caseSummary: data.caseSummary,
//         documentTitle: data.documentTitle,
//         documentType: data.documentType,
//         witnessDetails: data.witnessDetails,
//         place: data.place,
//         date: data.date,
//         digitalSignature: data.digitalSignature,
//         declaration: data.declaration,
//       },
//       createdBy: data.createdBy,
//       caseId,
//     });

//     await newCase.save();
//     res.status(201).json({ success: true, message: "Case filed successfully", case: newCase });
//   } catch (error) {
//     console.error("❌ Error filing case:", error);
//     res.status(500).json({ success: false, message: "Server error", error: error.message });
//   }
// };

// // ✅ Get all cases (for admin)
// export const getAllCases = async (req, res) => {
//   try {
//     const cases = await Case.find().populate("createdBy", "name email role");
//     res.status(200).json({ success: true, cases });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Failed to fetch cases", error: error.message });
//   }
// };

// // ✅ Get all cases of a particular user
// export const getUserCases = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const cases = await Case.find({ createdBy: userId });
//     res.status(200).json({ success: true, cases });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Error fetching user cases", error: error.message });
//   }
// };

import Case from "../models/caseModel.js";

// ✅ File a new case
export const fileNewCase = async (req, res) => {
  try {
    const {
      caseType,
      caseTitle,
      causeOfAction,
      reliefSought,
      caseValue,
      petitioner,
      defendant,
      caseFacts,
    } = req.body;

    if (!caseTitle || !petitioner?.fullName) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // ✅ Get user from JWT middleware
    const createdBy = req.user.id;

    // Generate unique caseId
    const caseId = "CASE-" + Math.floor(100000 + Math.random() * 900000);

    const newCase = await Case.create({
      caseId,
      caseType,
      caseTitle,
      causeOfAction,
      reliefSought,
      caseValue,
      petitionerDetails: petitioner,
      defendantDetails: defendant,
      caseFacts,
      createdBy,
    });

    res.status(201).json({
      success: true,
      message: "Case filed successfully",
      case: newCase,
    });
  } catch (error) {
    console.error("❌ Error filing case:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
