import express from "express";
import protect, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getDashboard,
  getTransactions,
  getTransactionById,
  downloadInvoicePDF,
  getPaymentMethods,
  createPaymentMethod,
  setDefaultMethod,
  deletePaymentMethod,
  verifyUpiId,
  initiatePayment,
  verifyPayment,
  createTransaction,
  getAdminDashboard,
  getAdminTransactions,
  getAdminTransactionById,
  downloadAdminInvoicePDF,
} from "../controllers/paymentController.js";

const router = express.Router();

const adminOrManager = [protect, authorizeRoles(["admin", "case-manager"])];

/* ── User routes (authenticated) ── */
router.get("/dashboard",                       protect, getDashboard);
router.get("/transactions",                    protect, getTransactions);
router.get("/transactions/:id",                protect, getTransactionById);
router.get("/transactions/:id/invoice-pdf",    protect, downloadInvoicePDF);
router.get("/methods",                         protect, getPaymentMethods);
router.post("/methods",                        protect, createPaymentMethod);
router.patch("/methods/:id/default",           protect, setDefaultMethod);
router.delete("/methods/:id",                  protect, deletePaymentMethod);
router.post("/verify-upi",                     protect, verifyUpiId);
router.post("/initiate",                       protect, initiatePayment);
router.post("/verify",                         protect, verifyPayment);

/* ── Admin / Case-Manager routes ── */
router.post("/transactions",                   ...adminOrManager, createTransaction);

/* ── Admin Payments module ── */
router.get("/admin/dashboard",                          ...adminOrManager, getAdminDashboard);
router.get("/admin/transactions",                       ...adminOrManager, getAdminTransactions);
router.get("/admin/transactions/:id",                   ...adminOrManager, getAdminTransactionById);
router.get("/admin/transactions/:id/invoice-pdf",       ...adminOrManager, downloadAdminInvoicePDF);

export default router;
