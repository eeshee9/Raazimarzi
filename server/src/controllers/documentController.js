import Document from "../models/documentModel.js";
import Case from "../models/caseModel.js";
import path from "path";
import { uploadDocument as uploadToNeev, deleteDocument as deleteFromNeev, getPresignedUrl } from "../utils/storageProvider.js";
import { MAX_FILES_PER_CASE } from "../utils/validateCase.js";
import { canAccessCase } from "../utils/accessControl.js";
import { sanitizeFilename } from "../utils/sanitizeFilename.js";

/* ═══════════════════════════════════════════════════════════════
   1. UPLOAD DOCUMENT
   Validates first, only touches storage once validation has passed.
═══════════════════════════════════════════════════════════════ */
export const uploadDocument = async (req, res) => {
  try {
    const { documentTitle, description, category, caseId, accessControl, tags, isConfidential } = req.body;

    // ✅ Validation
    if (!documentTitle || !category || !caseId) {
      return res.status(400).json({
        success: false,
        message: "Document title, category, and case ID are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // ✅ Verify case exists
    const caseExists = await Case.findById(caseId);
    if (!caseExists) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    // ✅ Verify user has access to the case
    const hasAccess = await canAccessCase(req.user._id, caseId, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "You don't have access to this case" });
    }

    // ✅ Enforce the per-case document cap before touching storage at all
    const existingDocCount = await Document.countDocuments({ caseId });
    if (existingDocCount >= MAX_FILES_PER_CASE) {
      return res.status(400).json({
        success: false,
        message: `This case already has the maximum of ${MAX_FILES_PER_CASE} documents`,
      });
    }

    // ✅ Upload to NeevCloud
    let uploaded;
    try {
      uploaded = await uploadToNeev(req.file, caseId, req.user._id);
    } catch (uploadErr) {
      console.error("❌ NeevCloud upload error:", uploadErr);
      return res.status(500).json({
        success: false,
        message: "Failed to upload file to storage",
        error: uploadErr.message,
      });
    }

    // ✅ Create document record
    let document;
    try {
      document = await Document.create({
        documentTitle:     documentTitle.trim(),
        description:       description?.trim(),
        category,
        originalFileName:  sanitizeFilename(req.file.originalname),
        storedFileName:    uploaded.key,
        provider:          "neev",
        storageKey:        uploaded.key,
        filePath:          "",
        fileSize:          req.file.size,
        mimeType:          req.file.mimetype,
        fileExtension:     path.extname(req.file.originalname).toLowerCase(),
        caseId,
        uploadedBy:        req.user._id,
        accessControl:     accessControl || "case-parties",
        tags:              tags ? JSON.parse(tags) : [],
        isConfidential:    isConfidential === "true",
      });
    } catch (dbErr) {
      // Roll back the uploaded object so it doesn't become orphaned
      await deleteFromNeev(uploaded.key);
      throw dbErr;
    }

    const populatedDoc = await Document.findById(document._id)
      .populate("uploadedBy", "name email")
      .populate("caseId", "caseId caseTitle");

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      document: populatedDoc,
    });
  } catch (error) {
    console.error("❌ Upload document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload document",
      error: error.message,
    });
  }
};

/* ═══════════════════════════════════════════════════════════════
   2. GET DOCUMENTS BY CASE
═══════════════════════════════════════════════════════════════ */
export const getDocumentsByCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const hasAccess = await canAccessCase(req.user._id, caseId, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const documents = await Document.find({ caseId })
      .populate("uploadedBy", "name email role")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    const filteredDocs = documents.filter((doc) =>
      doc.canAccess(req.user._id, req.user.role)
    );

    return res.status(200).json({
      success: true,
      count: filteredDocs.length,
      documents: filteredDocs,
    });
  } catch (error) {
    console.error("❌ Get documents error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch documents" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   3. GET SINGLE DOCUMENT
═══════════════════════════════════════════════════════════════ */
export const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate("uploadedBy", "name email role")
      .populate("approvedBy", "name email")
      .populate("caseId", "caseId caseTitle");

    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const hasAccess     = document.canAccess(req.user._id, req.user.role);
    const hasCaseAccess = await canAccessCase(req.user._id, document.caseId._id, req.user.role);

    if (!hasAccess || !hasCaseAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    await document.recordView(req.user._id, ipAddress);

    return res.status(200).json({ success: true, document });
  } catch (error) {
    console.error("❌ Get document error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch document" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   4. DOWNLOAD / VIEW DOCUMENT
   Returns a short-lived presigned URL — objects in NeevCloud are private.
═══════════════════════════════════════════════════════════════ */
export const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const hasAccess     = document.canAccess(req.user._id, req.user.role);
    const hasCaseAccess = await canAccessCase(req.user._id, document.caseId, req.user.role);

    if (!hasAccess || !hasCaseAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await document.recordDownload();

    const downloadUrl = await getPresignedUrl(document.storageKey, 300);

    return res.status(200).json({
      success:     true,
      downloadUrl,
      fileName:    document.originalFileName,
    });
  } catch (error) {
    console.error("❌ Download document error:", error);
    return res.status(500).json({ success: false, message: "Failed to download document" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   5. UPDATE DOCUMENT (metadata only)
═══════════════════════════════════════════════════════════════ */
export const updateDocument = async (req, res) => {
  try {
    const { documentTitle, description, category, tags, accessControl } = req.body;

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (
      req.user.role !== "admin" &&
      document.uploadedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (documentTitle)              document.documentTitle = documentTitle.trim();
    if (description !== undefined)  document.description   = description.trim();
    if (category)                   document.category      = category;
    if (tags)                       document.tags          = JSON.parse(tags);
    if (accessControl)              document.accessControl = accessControl;

    await document.save();

    const updated = await Document.findById(document._id)
      .populate("uploadedBy", "name email")
      .populate("approvedBy", "name email");

    return res.status(200).json({
      success:  true,
      message:  "Document updated successfully",
      document: updated,
    });
  } catch (error) {
    console.error("❌ Update document error:", error);
    return res.status(500).json({ success: false, message: "Failed to update document" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   6. DELETE DOCUMENT
═══════════════════════════════════════════════════════════════ */
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (
      req.user.role !== "admin" &&
      document.uploadedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await deleteFromNeev(document.storageKey);

    for (const version of document.previousVersions) {
      if (version.storageKey) {
        await deleteFromNeev(version.storageKey);
      }
    }

    await document.deleteOne();

    return res.status(200).json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("❌ Delete document error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete document" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   7. APPROVE DOCUMENT
═══════════════════════════════════════════════════════════════ */
export const approveDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    document.status     = "Approved";
    document.approvedBy = req.user._id;
    document.approvedAt = new Date();
    await document.save();

    const updated = await Document.findById(document._id)
      .populate("uploadedBy", "name email")
      .populate("approvedBy", "name email");

    return res.status(200).json({
      success:  true,
      message:  "Document approved successfully",
      document: updated,
    });
  } catch (error) {
    console.error("❌ Approve document error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve document" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   8. REJECT DOCUMENT
═══════════════════════════════════════════════════════════════ */
export const rejectDocument = async (req, res) => {
  try {
    const { reason } = req.body;

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    document.status          = "Rejected";
    document.rejectionReason = reason || "No reason provided";
    document.approvedBy      = req.user._id;
    document.approvedAt      = new Date();
    await document.save();

    const updated = await Document.findById(document._id)
      .populate("uploadedBy", "name email")
      .populate("approvedBy", "name email");

    return res.status(200).json({
      success:  true,
      message:  "Document rejected",
      document: updated,
    });
  } catch (error) {
    console.error("❌ Reject document error:", error);
    return res.status(500).json({ success: false, message: "Failed to reject document" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   9. RENAME DOCUMENT
═══════════════════════════════════════════════════════════════ */
export const renameDocument = async (req, res) => {
  try {
    const { documentTitle } = req.body;
    if (!documentTitle || !documentTitle.trim()) {
      return res.status(400).json({ success: false, message: "New document title is required" });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (
      req.user.role !== "admin" &&
      document.uploadedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    document.documentTitle = documentTitle.trim();
    await document.save();

    return res.status(200).json({ success: true, message: "Document renamed", document });
  } catch (error) {
    console.error("❌ Rename document error:", error);
    return res.status(500).json({ success: false, message: "Failed to rename document" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   10. REPLACE DOCUMENT FILE (replaces file, resets to pending)
═══════════════════════════════════════════════════════════════ */
export const replaceDocument = async (req, res) => {
  let uploaded; // tracked here so the outer catch can roll back an orphaned upload
  try {
    const { documentId } = req.body;
    const id = documentId || req.params.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (
      req.user.role !== "admin" &&
      document.uploadedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Upload new file to NeevCloud before touching the old one
    try {
      uploaded = await uploadToNeev(req.file, document.caseId, req.user._id);
    } catch (uploadErr) {
      console.error("❌ NeevCloud upload error:", uploadErr);
      return res.status(500).json({
        success: false,
        message: "Failed to upload file to storage",
        error: uploadErr.message,
      });
    }

    // Delete old file now that the new one is safely stored
    await deleteFromNeev(document.storageKey);

    // Update document with new file
    document.originalFileName = sanitizeFilename(req.file.originalname);
    document.storedFileName   = uploaded.key;
    document.provider         = "neev";
    document.storageKey       = uploaded.key;
    document.fileSize         = req.file.size;
    document.mimeType         = req.file.mimetype;
    document.status           = "Pending Review";
    document.rejectionReason  = undefined;
    document.approvedBy       = undefined;
    document.approvedAt       = undefined;

    await document.save();

    const updated = await Document.findById(document._id)
      .populate("uploadedBy", "name email")
      .populate("caseId", "caseId caseTitle");

    return res.status(200).json({
      success: true,
      message: "Document replaced successfully",
      document: updated,
    });
  } catch (error) {
    console.error("❌ Replace document error:", error);
    if (uploaded?.key) await deleteFromNeev(uploaded.key);
    return res.status(500).json({ success: false, message: "Failed to replace document" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   11. GET MY CASES WITH DOCUMENTS (for UserDocuments page)
   Returns cases the user is involved in, each with their documents
═══════════════════════════════════════════════════════════════ */
export const getMyCasesWithDocuments = async (req, res) => {
  try {
    const userId    = req.user._id;
    const userEmail = req.user.email;

    // Find cases where user is petitioner
    const raisedCasesRaw = await Case.find({
      $or: [{ createdBy: userId }, { claimant: userId }],
    })
      .select("caseId caseTitle caseType status createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    // Find cases where user is respondent
    const opponentCasesRaw = await Case.find({
      $or: [
        { "respondent.userId":      userId },
        { "respondent.email":       userEmail?.toLowerCase() },
        { "defendantDetails.email": userEmail },
      ],
      $and: [
        { createdBy: { $ne: userId } },
        { claimant:  { $ne: userId } },
      ],
    })
      .select("caseId caseTitle caseType status createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();

    // Tag each case with the user's role in that case
    const raisedCases   = raisedCasesRaw.map(c   => ({ ...c, _myRole: "petitioner" }));
    const opponentCases = opponentCasesRaw.map(c => ({ ...c, _myRole: "respondent" }));

    const allCases = [...raisedCases, ...opponentCases];

    // For each case, fetch documents
    const casesWithDocs = await Promise.all(
      allCases.map(async (c) => {
        const documents = await Document.find({ caseId: c._id })
          .populate("uploadedBy", "name email role")
          .populate("approvedBy", "name email")
          .sort({ createdAt: -1 })
          .lean();

        // Normalize document fields for frontend
        const normalizedDocs = documents.map((d) => {
          const rawStatus = (d.status || "Pending Review").toLowerCase();
          const status = rawStatus === "approved" ? "approved"
            : rawStatus === "rejected" ? "rejected"
            : "pending";

          // Build audit trail from approvedBy/approvedAt since model has no auditTrail field
          const auditTrail = d.approvedBy
            ? [{
                action: status === "rejected" ? "Rejected" : "Approved",
                byName: d.approvedBy?.name || "Admin",
                at: d.approvedAt || d.updatedAt,
              }]
            : [];

          return {
            _id:            d._id,
            fileName:       d.documentTitle || d.originalFileName || "Document",
            documentTitle:  d.documentTitle,
            fileUrl:        d.fileUrl,
            fileSize:       d.fileSize,
            mimeType:       d.mimeType,
            fileExtension:  d.fileExtension,
            status,
            rejectionReason: d.rejectionReason,
            uploadedBy:     d.uploadedBy?.name || "—",
            uploadedById:   d.uploadedBy?._id?.toString() || null,
            uploaderAvatar: null,
            uploaderRole:   d.uploadedBy?.role || "petitioner",
            category:       d.category,
            createdAt:      d.createdAt,
            caseId:         c.caseId,
            auditTrail,
          };
        });

        return {
          _id:        c._id,
          caseNumber: c.caseId,
          title:      c.caseTitle || c.caseType || "Case",
          status:     (c.status || "pending").toLowerCase(),
          caseType:   c.caseType,
          myRole:     c._myRole || "petitioner",
          createdAt:  c.createdAt,
          updatedAt:  c.updatedAt,
          fileCount:  normalizedDocs.length,
          documents:  normalizedDocs,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count:   casesWithDocs.length,
      cases:   casesWithDocs,
    });
  } catch (error) {
    console.error("❌ getMyCasesWithDocuments error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch cases with documents" });
  }
};

/* ═══════════════════════════════════════════════════════════════
   12. GET ALL DOCUMENTS (ADMIN ONLY)
═══════════════════════════════════════════════════════════════ */
export const getAllDocuments = async (req, res) => {
  try {
    const { status, category, caseId } = req.query;

    const filter = {};
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (caseId)   filter.caseId   = caseId;

    const documents = await Document.find(filter)
      .populate("uploadedBy", "name email")
      .populate("approvedBy", "name email")
      .populate("caseId", "caseId caseTitle status caseType createdAt updatedAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success:   true,
      count:     documents.length,
      documents,
    });
  } catch (error) {
    console.error("❌ Get all documents error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch documents" });
  }
};