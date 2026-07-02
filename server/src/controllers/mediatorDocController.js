import Document from "../models/documentModel.js";
import Case from "../models/caseModel.js";

const mediatorCaseFilter = (mediatorId) => ({
  $or: [
    { assignedNeutral: mediatorId, neutralType: "mediator" },
    { assignedMediator: mediatorId },
  ],
});

/* ═══════════════════════════════════════════════════════════════════════════
   GET /api/mediator/documents
   Returns assigned-case folders with document counts for the mediator.
   Supports ?status= and ?caseType= filters on the case level.
   Documents counted are only those with accessControl case-parties or public
   (the same set the mediator can actually view).
═══════════════════════════════════════════════════════════════════════════ */
export const getMediatorDocFolders = async (req, res) => {
  try {
    const mediatorId = req.user._id;
    const { status, caseType } = req.query;

    const caseFilter = mediatorCaseFilter(mediatorId);
    if (status) caseFilter.status = status;
    if (caseType) caseFilter.caseType = caseType;

    const cases = await Case.find(caseFilter)
      .select("caseId caseTitle caseType status createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    if (cases.length === 0) {
      return res.status(200).json({ success: true, folders: [] });
    }

    const caseIds = cases.map((c) => c._id);

    // Aggregate visible document counts per case
    const docCounts = await Document.aggregate([
      {
        $match: {
          caseId: { $in: caseIds },
          accessControl: { $in: ["case-parties", "public"] },
        },
      },
      {
        $group: {
          _id: "$caseId",
          count:    { $sum: 1 },
          lastDocAt: { $max: "$updatedAt" },
        },
      },
    ]);

    const countMap   = {};
    const lastDocMap = {};
    for (const d of docCounts) {
      countMap[d._id.toString()]   = d.count;
      lastDocMap[d._id.toString()] = d.lastDocAt;
    }

    const folders = cases.map((c) => ({
      ...c,
      documentCount:  countMap[c._id.toString()]   || 0,
      lastDocumentAt: lastDocMap[c._id.toString()] || c.updatedAt,
    }));

    return res.status(200).json({ success: true, folders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
