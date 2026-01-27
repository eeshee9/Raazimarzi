import Contact from "../models/Contact.model.js";
import { sendContactMail } from "../services/mail.service.js";

/* ================= SUBMIT CONTACT FORM ================= */
export const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const contact = await Contact.create({
      name,
      email,
      phone,
      message,
    });

    // non-blocking email
    sendContactMail({ name, email, phone, message }).catch(console.error);

    res.status(201).json({
      success: true,
      message: "Thank you for contacting us!",
      data: contact,
    });
  } catch (error) {
    console.error("Contact error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================= GET ALL CONTACTS (ADMIN) ================= */
export const getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      contacts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
    });
  }
};
