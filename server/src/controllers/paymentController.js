import Transaction from "../models/transactionModel.js";
import PaymentMethod from "../models/paymentMethodModel.js";
import Case from "../models/caseModel.js";
import User from "../models/userModel.js";
import PDFDocument from "pdfkit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const maskUpiId = (upiId = "") => {
  const atIdx = upiId.lastIndexOf("@");
  if (atIdx <= 0) return upiId;
  const local = upiId.slice(0, atIdx);
  const domain = upiId.slice(atIdx + 1);
  return `${local[0]}****@${domain}`;
};

const fmtINR = (n) =>
  `₹${Number(n || 0)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

const ACTIVE_CASE_STATUSES = [
  "active", "Active", "pending", "Pending", "open", "Open",
  "in-progress", "in progress", "assigned", "notice-sent",
  "mediation", "in mediation", "arbitration",
];

/* ── Shared PDF generator ────────────────────────────────────────────────────
   Accepts:
     txn  — Transaction lean object
     user — { name, email } (may come from req.user or from txn.userId populate)
     res  — Express response object
─────────────────────────────────────────────────────────────────────────── */
const _generateInvoicePDF = (txn, user, res) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${txn.invoiceNumber}.pdf"`
  );
  doc.pipe(res);

  const purple = "#5b21b6";
  const gray   = "#6b7280";
  const dark   = "#111827";
  const mid    = "#4b5563";

  // ── Logo + company info ──────────────────────────────────────────
  doc.fontSize(22).fillColor(purple).font("Helvetica-Bold").text("RaaziMarzi", 50, 50);
  doc.fontSize(9).fillColor(gray).font("Helvetica")
    .text("RaaziMarzi Legal Solutions", 50, 77)
    .text("12th Floor, Trade Tower, Cyber City, Indore, MP", 50, 89)
    .text("GSTIN: 07AAACR1234A1Z1", 50, 101);

  // ── Status badge + invoice number ──────────────────────────────
  const statusColor =
    txn.status === "paid"   ? "#16a34a" :
    txn.status === "failed" ? "#dc2626" : "#ca8a04";
  const statusBg =
    txn.status === "paid"   ? "#dcfce7" :
    txn.status === "failed" ? "#fee2e2" : "#fef9c3";

  doc.rect(432, 50, 50, 20).fill(statusBg);
  doc.fontSize(9).fillColor(statusColor).font("Helvetica-Bold")
    .text(txn.status.toUpperCase(), 432, 56, { width: 50, align: "center" });

  doc.fontSize(11).fillColor(dark).font("Helvetica-Bold")
    .text(`INVOICE: #${txn.invoiceNumber}`, 50, 82, { align: "right", width: 495 });

  // ── Divider ──────────────────────────────────────────────────────
  doc.moveTo(50, 125).lineTo(545, 125).strokeColor("#e5e7eb").stroke();

  // ── FROM / BILL TO ────────────────────────────────────────────────
  doc.fontSize(8).fillColor(gray).font("Helvetica").text("FROM", 50, 142);
  doc.fontSize(10).fillColor(dark).font("Helvetica-Bold").text("RaaziMarzi Legal Solutions", 50, 155);
  doc.fontSize(9).fillColor(mid).font("Helvetica")
    .text("12th Floor, Trade Tower", 50, 169)
    .text("Cyber City, Indore, MP", 50, 181)
    .text("GSTIN: 07AAACR1234A1Z1", 50, 193);

  doc.fontSize(8).fillColor(gray).font("Helvetica").text("BILL TO", 310, 142);
  doc.fontSize(10).fillColor(dark).font("Helvetica-Bold").text(user?.name || "Client", 310, 155);
  let billY = 169;
  if (txn.caseCaseId) {
    doc.fontSize(9).fillColor(purple).font("Helvetica").text(`Case ID: ${txn.caseCaseId}`, 310, billY);
    billY += 13;
  }
  doc.fontSize(9).fillColor(mid).font("Helvetica").text(user?.email || "", 310, billY);

  // ── Divider ──────────────────────────────────────────────────────
  doc.moveTo(50, 220).lineTo(545, 220).strokeColor("#e5e7eb").stroke();

  // ── Date / Payment info ───────────────────────────────────────────
  const dY = 235;
  doc.fontSize(8).fillColor(gray).font("Helvetica").text("DATE ISSUED", 50, dY);
  doc.fontSize(10).fillColor(dark).font("Helvetica-Bold").text(fmtDate(txn.createdAt), 50, dY + 13);

  doc.fontSize(8).fillColor(gray).font("Helvetica").text("PAYMENT DATE", 210, dY);
  doc.fontSize(10).fillColor(dark).font("Helvetica-Bold").text(fmtDate(txn.paidAt), 210, dY + 13);

  doc.fontSize(8).fillColor(gray).font("Helvetica").text("PAYMENT METHOD", 370, dY);
  doc.fontSize(10).fillColor(dark).font("Helvetica-Bold").text(txn.paymentMethod || "—", 370, dY + 13);

  // ── Divider ──────────────────────────────────────────────────────
  doc.moveTo(50, 275).lineTo(545, 275).strokeColor("#e5e7eb").stroke();

  // ── Line items table header ───────────────────────────────────────
  const tY = 290;
  doc.fontSize(8).fillColor(gray).font("Helvetica")
    .text("DESCRIPTION", 50, tY)
    .text("CASE ID", 330, tY)
    .text("AMOUNT", 470, tY, { align: "right", width: 75 });

  doc.moveTo(50, tY + 14).lineTo(545, tY + 14).strokeColor("#e5e7eb").stroke();

  // ── Line item ─────────────────────────────────────────────────────
  const liY = tY + 22;
  doc.fontSize(10).fillColor(dark).font("Helvetica-Bold")
    .text(txn.description || "Mediation Fee", 50, liY);
  doc.fontSize(10).fillColor(dark).font("Helvetica")
    .text(txn.caseCaseId || "—", 330, liY)
    .text(fmtINR(txn.amount), 470, liY, { align: "right", width: 75 });

  doc.moveTo(50, liY + 22).lineTo(545, liY + 22).strokeColor("#e5e7eb").stroke();

  // ── Totals ────────────────────────────────────────────────────────
  const totY = liY + 35;
  doc.fontSize(9).fillColor(mid).font("Helvetica")
    .text("Subtotal", 370, totY)
    .text(fmtINR(txn.subtotal), 470, totY, { align: "right", width: 75 });

  doc.fontSize(9).fillColor(mid).font("Helvetica")
    .text(`GST (${txn.gstPercent || 18}%)`, 370, totY + 18)
    .text(fmtINR(txn.gstAmount), 470, totY + 18, { align: "right", width: 75 });

  doc.moveTo(370, totY + 38).lineTo(545, totY + 38).strokeColor("#e5e7eb").stroke();

  doc.fontSize(12).fillColor(dark).font("Helvetica-Bold").text("Total Amount", 370, totY + 48);
  doc.fontSize(12).fillColor(purple).font("Helvetica-Bold")
    .text(fmtINR(txn.amount), 470, totY + 48, { align: "right", width: 75 });

  // ── Notes ─────────────────────────────────────────────────────────
  const notesY = totY + 85;
  doc.rect(50, notesY, 495, 75).fill("#f9fafb");
  doc.fontSize(9).fillColor(dark).font("Helvetica-Bold").text("Notes & Payment Terms", 62, notesY + 12);
  const notesText =
    txn.notes ||
    `Thank you for choosing RaaziMarzi for your mediation services. This invoice covers professional fees${txn.caseCaseId ? ` for case ${txn.caseCaseId}` : ""}. Payments are non-refundable once sessions have commenced. For any billing queries, please contact finance@raazimarzi.com.`;
  doc.fontSize(8).fillColor(mid).font("Helvetica")
    .text(notesText, 62, notesY + 27, { width: 470, lineGap: 2 });

  doc.end();
};

/* ═══════════════════════════════════════════════════════════════
   1. GET DASHBOARD
   GET /api/payments/dashboard
═══════════════════════════════════════════════════════════════ */
export const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;

    // Total paid amount
    const totalPaidAgg = await Transaction.aggregate([
      { $match: { userId, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalPaid = totalPaidAgg[0]?.total || 0;

    const pendingCount = await Transaction.countDocuments({ userId, status: "pending" });
    const failedCount = await Transaction.countDocuments({ userId, status: "failed" });

    // Active cases count
    const activeCasesCount = await Case.countDocuments({
      status: { $in: ACTIVE_CASE_STATUSES },
      $or: [
        { createdBy: userId },
        { claimant: userId },
        { "respondent.userId": userId },
        { "respondent.email": userEmail?.toLowerCase() },
      ],
    });

    // Pending payments (most recent 5)
    const pendingPayments = await Transaction.find({ userId, status: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Saved payment methods (default first)
    const savedMethods = await PaymentMethod.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    // Recent transaction history (up to 50 for client-side filtering)
    const recentTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      stats: { totalPaid, pendingCount, failedCount, activeCasesCount },
      pendingPayments,
      savedMethods,
      recentTransactions,
    });
  } catch (err) {
    console.error("getDashboard error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   2. GET TRANSACTIONS (filterable)
   GET /api/payments/transactions?status=&dateFrom=&dateTo=&page=&limit=
═══════════════════════════════════════════════════════════════ */
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const filter = { userId };
    if (status && status !== "all") filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(`${dateTo}T23:59:59`);
    }

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    return res.status(200).json({ success: true, total, transactions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   3. GET TRANSACTION BY ID (for invoice view)
   GET /api/payments/transactions/:id
═══════════════════════════════════════════════════════════════ */
export const getTransactionById = async (req, res) => {
  try {
    const txn = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!txn)
      return res.status(404).json({ success: false, message: "Transaction not found" });

    return res.status(200).json({ success: true, transaction: txn });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   4. DOWNLOAD INVOICE PDF
   GET /api/payments/transactions/:id/invoice-pdf
═══════════════════════════════════════════════════════════════ */
export const downloadInvoicePDF = async (req, res) => {
  try {
    const txn = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!txn)
      return res.status(404).json({ success: false, message: "Transaction not found" });

    const user = await User.findById(req.user._id).select("name email").lean();
    _generateInvoicePDF(txn, user, res);
  } catch (err) {
    console.error("downloadInvoicePDF error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "Failed to generate invoice PDF" });
    }
  }
};

/* ═══════════════════════════════════════════════════════════════
   5. GET PAYMENT METHODS
   GET /api/payments/methods
═══════════════════════════════════════════════════════════════ */
export const getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ userId: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, methods });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   6. CREATE PAYMENT METHOD
   POST /api/payments/methods
═══════════════════════════════════════════════════════════════ */
export const createPaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, ...fields } = req.body;

    if (!["card", "upi", "bank"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment method type" });
    }

    const methodData = { userId, type };

    if (type === "card") {
      const { cardNumber, cardholderName, expiryMonth, expiryYear } = fields;
      if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear) {
        return res.status(400).json({
          success: false,
          message: "Card number, cardholder name, and expiry are required",
        });
      }
      const cleaned = cardNumber.replace(/[\s-]/g, "");
      if (cleaned.length < 12 || cleaned.length > 19 || !/^\d+$/.test(cleaned)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid card number" });
      }
      methodData.lastFour = cleaned.slice(-4);
      methodData.cardBrand = cleaned.startsWith("4")
        ? "visa"
        : cleaned.startsWith("5")
        ? "mastercard"
        : cleaned.startsWith("6")
        ? "rupay"
        : "other";
      methodData.cardholderName = cardholderName.trim();
      methodData.expiryMonth = expiryMonth;
      methodData.expiryYear = expiryYear;
    } else if (type === "upi") {
      const { upiId, verifiedName } = fields;
      if (!upiId) {
        return res
          .status(400)
          .json({ success: false, message: "UPI ID is required" });
      }
      if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid UPI ID format" });
      }
      methodData.upiIdMasked = maskUpiId(upiId);
      methodData.upiIdFull = upiId;
      methodData.verifiedName = verifiedName || "";
    } else {
      // bank
      const { accountHolderName, accountNumber, ifscCode, accountType } = fields;
      if (!accountHolderName || !accountNumber || !ifscCode || !accountType) {
        return res.status(400).json({
          success: false,
          message: "Account holder name, account number, IFSC code, and account type are required",
        });
      }
      const cleaned = accountNumber.replace(/\s/g, "");
      if (cleaned.length < 9 || cleaned.length > 18 || !/^\d+$/.test(cleaned)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid account number" });
      }
      if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid IFSC code format (e.g. SBIN0001234)" });
      }
      methodData.accountHolderName = accountHolderName.trim();
      methodData.accountNumberMasked = `****${cleaned.slice(-4)}`;
      methodData.ifscCode = ifscCode.toUpperCase();
      methodData.accountType = accountType;
      methodData.bankName = fields.bankName || "";
    }

    // Make default if this is the user's first method
    const existingCount = await PaymentMethod.countDocuments({ userId });
    if (existingCount === 0) methodData.isDefault = true;

    const method = await PaymentMethod.create(methodData);

    const safe = method.toObject();
    delete safe.upiIdFull;

    return res.status(201).json({
      success: true,
      message: "Payment method added successfully",
      method: safe,
    });
  } catch (err) {
    console.error("createPaymentMethod error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   7. SET DEFAULT PAYMENT METHOD
   PATCH /api/payments/methods/:id/default
═══════════════════════════════════════════════════════════════ */
export const setDefaultMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const method = await PaymentMethod.findOne({ _id: req.params.id, userId });
    if (!method) {
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });
    }

    await PaymentMethod.updateMany({ userId }, { isDefault: false });
    method.isDefault = true;
    await method.save();

    return res
      .status(200)
      .json({ success: true, message: "Default payment method updated" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   8. DELETE PAYMENT METHOD
   DELETE /api/payments/methods/:id
═══════════════════════════════════════════════════════════════ */
export const deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const method = await PaymentMethod.findOneAndDelete({ _id: req.params.id, userId });
    if (!method) {
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });
    }

    // Promote the oldest remaining method to default
    if (method.isDefault) {
      const next = await PaymentMethod.findOne({ userId }).sort({ createdAt: 1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    return res
      .status(200)
      .json({ success: true, message: "Payment method removed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   9. VERIFY UPI ID
   POST /api/payments/verify-upi
═══════════════════════════════════════════════════════════════ */
export const verifyUpiId = async (req, res) => {
  try {
    const { upiId } = req.body;
    if (!upiId) {
      return res
        .status(400)
        .json({ success: false, message: "UPI ID is required" });
    }
    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid UPI ID format" });
    }

    const user = await User.findById(req.user._id).select("name").lean();

    return res.status(200).json({
      success: true,
      verified: true,
      name: user?.name || "Account Holder",
      upiId,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   10. INITIATE PAYMENT — not yet available (no payment gateway configured)
   POST /api/payments/initiate
═══════════════════════════════════════════════════════════════ */
export const initiatePayment = async (_req, res) => {
  return res.status(503).json({
    success: false,
    message: "Online payment is not available yet. Please contact support to arrange payment.",
  });
};

/* ═══════════════════════════════════════════════════════════════
   11. VERIFY PAYMENT — not yet available (no payment gateway configured)
   POST /api/payments/verify
═══════════════════════════════════════════════════════════════ */
export const verifyPayment = async (_req, res) => {
  return res.status(503).json({
    success: false,
    message: "Online payment is not available yet. Please contact support to arrange payment.",
  });
};

/* ═══════════════════════════════════════════════════════════════
   11. CREATE TRANSACTION (admin / case-manager)
   POST /api/payments/transactions
═══════════════════════════════════════════════════════════════ */
export const createTransaction = async (req, res) => {
  try {
    const { userId, caseId, amount, description, paymentType, notes } = req.body;

    if (!userId || !amount) {
      return res
        .status(400)
        .json({ success: false, message: "userId and amount are required" });
    }
    if (amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be positive" });
    }

    // Compute GST (18% inclusive)
    const total = Number(amount);
    const subtotal = Math.round((total / 1.18) * 100) / 100;
    const gstAmount = Math.round((total - subtotal) * 100) / 100;

    let caseTitle = "";
    let caseCaseId = "";
    if (caseId) {
      const caseDoc = await Case.findById(caseId).select("caseTitle caseId").lean();
      if (caseDoc) {
        caseTitle = caseDoc.caseTitle || "";
        caseCaseId = caseDoc.caseId || "";
      }
    }

    const txn = await Transaction.create({
      userId,
      caseId: caseId || null,
      caseTitle,
      caseCaseId,
      amount: total,
      subtotal,
      gstAmount,
      description: description || "Mediation Fee",
      paymentType: paymentType || "mediator-fee",
      notes: notes || "",
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Payment transaction created",
      transaction: txn,
    });
  } catch (err) {
    console.error("createTransaction error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════════
   ── ADMIN ENDPOINTS ──
═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   A1. ADMIN DASHBOARD — KPIs + Revenue Trend + Status Distribution
   GET /api/payments/admin/dashboard
───────────────────────────────────────────────────────────── */
export const getAdminDashboard = async (req, res) => {
  try {
    // ── KPIs: all-time, all users ──
    const [revenueAgg, successCount, pendingCount, failedCount] = await Promise.all([
      Transaction.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.countDocuments({ status: "paid" }),
      Transaction.countDocuments({ status: "pending" }),
      Transaction.countDocuments({ status: "failed" }),
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // ── Revenue trend: paid transactions, last 12 calendar months ──
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const revenueTrend = await Transaction.aggregate([
      { $match: { status: "paid", createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$amount" },
          count:   { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // ── Status distribution ──
    const txnTotal = successCount + pendingCount + failedCount;
    const distribution = {
      paid:    { count: successCount, pct: txnTotal ? Math.round((successCount / txnTotal) * 100) : 0 },
      pending: { count: pendingCount, pct: txnTotal ? Math.round((pendingCount / txnTotal) * 100) : 0 },
      failed:  { count: failedCount,  pct: txnTotal ? Math.round((failedCount  / txnTotal) * 100) : 0 },
      total: txnTotal,
    };

    return res.status(200).json({
      success: true,
      stats: { totalRevenue, successCount, pendingCount, failedCount },
      revenueTrend,
      distribution,
    });
  } catch (err) {
    console.error("getAdminDashboard error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   A2. ADMIN TRANSACTIONS LIST — paginated + filterable
   GET /api/payments/admin/transactions?page=&limit=&status=&search=
───────────────────────────────────────────────────────────── */
export const getAdminTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const skip     = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && status !== "all") filter.status = status;

    if (search) {
      const q = search.trim();
      // Resolve user IDs matching name or email search
      const matchingUsers = await User.find({
        $or: [
          { name:  { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      }).select("_id").lean();
      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { txnId:         { $regex: q, $options: "i" } },
        { invoiceNumber: { $regex: q, $options: "i" } },
        { caseCaseId:    { $regex: q, $options: "i" } },
        { caseTitle:     { $regex: q, $options: "i" } },
        ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
      ];
    }

    const [total, transactions] = await Promise.all([
      Transaction.countDocuments(filter),
      Transaction.find(filter)
        .populate("userId", "name email avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      total,
      pages: Math.max(1, Math.ceil(total / limitNum)),
      page: pageNum,
      transactions,
    });
  } catch (err) {
    console.error("getAdminTransactions error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   A3. ADMIN GET TRANSACTION BY ID — no userId restriction
   GET /api/payments/admin/transactions/:id
───────────────────────────────────────────────────────────── */
export const getAdminTransactionById = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id)
      .populate("userId", "name email avatar")
      .lean();

    if (!txn)
      return res.status(404).json({ success: false, message: "Transaction not found" });

    return res.status(200).json({ success: true, transaction: txn });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   A4. ADMIN DOWNLOAD INVOICE PDF — any transaction
   GET /api/payments/admin/transactions/:id/invoice-pdf
───────────────────────────────────────────────────────────── */
export const downloadAdminInvoicePDF = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id)
      .populate("userId", "name email")
      .lean();

    if (!txn)
      return res.status(404).json({ success: false, message: "Transaction not found" });

    // txn.userId is populated — pass the user sub-document directly
    _generateInvoicePDF(txn, txn.userId, res);
  } catch (err) {
    console.error("downloadAdminInvoicePDF error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "Failed to generate invoice PDF" });
    }
  }
};
