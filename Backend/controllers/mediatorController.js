const Case = require("../models/caseModel");

// Get all cases assigned to this mediator
const getAssignedCases = async (req, res) => {
  try {
    const cases = await Case.find({ mediator: req.user._id });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update case status/result
const updateCase = async (req, res) => {
  try {
    const caseData = await Case.findById(req.params.id);
    if (!caseData) return res.status(404).json({ message: "Case not found" });

    caseData.status = req.body.status || caseData.status;
    caseData.result = req.body.result || caseData.result;

    await caseData.save();
    res.json({ message: "Case updated", case: caseData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAssignedCases, updateCase };
