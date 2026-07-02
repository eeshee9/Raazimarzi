import CaseNote   from "../models/caseNoteModel.js";
import MeetingNote from "../models/meetingNoteModel.js";
import Case        from "../models/caseModel.js";
import Meeting     from "../models/meetingModel.js";

/* ─── Assignment filter (mediator → either field) ──────────────────────────── */
const mediatorCaseFilter = (mediatorId) => ({
  $or: [
    { assignedNeutral: mediatorId, neutralType: "mediator" },
    { assignedMediator: mediatorId },
  ],
});

/* ─── Build a Mongoose case filter from request query params ─────────────── */
const buildFilter = (mediatorId, { status, caseType, q } = {}) => {
  const isAdmin = !mediatorId;
  const parts = [isAdmin ? {} : mediatorCaseFilter(mediatorId)];

  if (status)   parts.push({ status });
  if (caseType) parts.push({ caseType });

  if (q?.trim()) {
    const rx = { $regex: q.trim(), $options: "i" };
    parts.push({
      $or: [
        { caseId:  rx },
        { caseTitle: rx },
        { "petitionerDetails.fullName": rx },
        { "respondent.name": rx },
      ],
    });
  }

  return parts.length === 1 ? parts[0] : { $and: parts };
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. LIST — GET /api/mediator/case-notes
   Returns each assigned case with its note count and latest-note timestamp.
   Supports ?status= ?caseType= ?q= ?page= ?limit=
════════════════════════════════════════════════════════════════════════════ */
export const getCaseNotesList = async (req, res) => {
  try {
    const isAdmin    = req.user.role === "admin";
    const mediatorId = isAdmin ? null : req.user._id;
    const { status, caseType, q, page = 1, limit = 20 } = req.query;

    const filter = buildFilter(mediatorId, { status, caseType, q });

    const [cases, total] = await Promise.all([
      Case.find(filter)
        .select("caseId caseTitle caseType status createdAt updatedAt petitionerDetails respondent claimant mediatorObservations")
        .populate("claimant", "name email")
        .sort({ updatedAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean(),
      Case.countDocuments(filter),
    ]);

    const caseIds      = cases.map((c) => c._id);
    const authorFilter = isAdmin ? {} : { authorId: req.user._id };

    const noteCounts = await CaseNote.aggregate([
      { $match: { caseId: { $in: caseIds }, ...authorFilter } },
      {
        $group: {
          _id:    "$caseId",
          count:  { $sum: 1 },
          lastAt: { $max: "$updatedAt" },
        },
      },
    ]);

    const countMap  = {};
    const lastAtMap = {};
    for (const n of noteCounts) {
      countMap[n._id.toString()]  = n.count;
      lastAtMap[n._id.toString()] = n.lastAt;
    }

    const rows = cases.map((c) => ({
      _id:            c._id,
      caseId:         c.caseId,
      caseTitle:      c.caseTitle,
      caseType:       c.caseType,
      status:         c.status,
      createdAt:      c.createdAt,
      updatedAt:      c.updatedAt,
      petitionerName: c.petitionerDetails?.fullName || c.claimant?.name || "—",
      respondentName: c.respondent?.name || "—",
      hasObservations:!!c.mediatorObservations,
      noteCount:      countMap[c._id.toString()]  || 0,
      lastNoteAt:     lastAtMap[c._id.toString()] || null,
    }));

    return res.status(200).json({ success: true, cases: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. CASE NOTE WORKSPACE — GET /api/mediator/case-notes/:caseId
   Returns case metadata + CaseNote entries + MeetingNote entries for context.
   Admin sees all notes for the case; mediator sees only their own.
════════════════════════════════════════════════════════════════════════════ */
export const getCaseNoteDetail = async (req, res) => {
  try {
    const isAdmin    = req.user.role === "admin";
    const mediatorId = req.user._id;
    const { caseId } = req.params;

    // Access check
    const caseFilter = isAdmin
      ? { _id: caseId }
      : mediatorCaseFilter(mediatorId);

    const caseObj = await Case.findOne(
      isAdmin ? { _id: caseId } : { _id: caseId, ...mediatorCaseFilter(mediatorId) }
    )
      .select("caseId caseTitle caseType status createdAt updatedAt mediatorObservations petitionerDetails respondent claimant assignedMediator assignedNeutral")
      .populate("claimant",         "name email")
      .populate("assignedMediator", "name email avatar")
      .populate("assignedNeutral",  "name email avatar")
      .lean();

    if (!caseObj) {
      return res.status(403).json({ success: false, message: "Case not found or access denied" });
    }

    // CaseNote entries: admin sees all, mediator sees own
    const noteQuery = isAdmin ? { caseId } : { caseId, authorId: mediatorId };
    const caseNotes = await CaseNote.find(noteQuery)
      .populate("authorId", "name role avatar")
      .sort({ createdAt: -1 })
      .lean();

    // MeetingNote entries for this case (always scoped to requesting user's notes)
    const meetingNotes = await MeetingNote.find({ caseId, authorId: mediatorId })
      .populate("meetingId", "meetingTitle scheduledDate startTime")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      case: caseObj,
      caseNotes,
      meetingNotes,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   3. CREATE — POST /api/mediator/case-notes/:caseId
   Mediator-only write. Admin reads only.
════════════════════════════════════════════════════════════════════════════ */
export const createCaseNote = async (req, res) => {
  try {
    const mediatorId = req.user._id;
    const { caseId } = req.params;
    const { content, category } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

    // Enforce mediator assignment
    const caseObj = await Case.findOne({ _id: caseId, ...mediatorCaseFilter(mediatorId) });
    if (!caseObj) {
      return res.status(403).json({ success: false, message: "Case not found or not assigned to you" });
    }

    const note = await CaseNote.create({
      caseId,
      authorId: mediatorId,
      category: category || "General",
      content:  content.trim(),
    });

    const populated = await CaseNote.findById(note._id)
      .populate("authorId", "name role avatar")
      .lean();

    return res.status(201).json({ success: true, note: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
   4. UPDATE — PATCH /api/mediator/case-notes/entry/:noteId
   Only the author can edit. Admin cannot edit (read-only).
════════════════════════════════════════════════════════════════════════════ */
export const updateCaseNote = async (req, res) => {
  try {
    const mediatorId = req.user._id;
    const note = await CaseNote.findById(req.params.noteId);

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }
    if (note.authorId.toString() !== mediatorId.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit your own notes" });
    }

    if (req.body.content  !== undefined) note.content  = req.body.content.trim();
    if (req.body.category !== undefined) note.category = req.body.category;
    await note.save();

    const populated = await CaseNote.findById(note._id)
      .populate("authorId", "name role avatar")
      .lean();

    return res.status(200).json({ success: true, note: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
