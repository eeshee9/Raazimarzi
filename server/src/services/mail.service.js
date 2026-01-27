import nodemailer from "nodemailer";

// Create reusable transporter using Zoho SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: process.env.EMAIL_SECURE === "true", 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

// Send Contact Form Email to Admin
export const sendContactMail = async ({ name, email, phone, message }) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL, // Admin email
    subject: "New Contact Request - RaaziMarzi",
    html: `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || "N/A"}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Send Demo Request Email to Admin
export const sendDemoMail = async ({ name, email, phone, company, message }) => {
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: "New Demo Request - RaaziMarzi",
    html: `
      <h3>New Demo Request</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || "N/A"}</p>
      <p><strong>Company:</strong> ${company || "N/A"}</p>
      <p><strong>Message:</strong> ${message || "N/A"}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Optional: Test SMTP connection
export const testSMTP = async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP connection is working");
  } catch (err) {
    console.error("❌ SMTP connection failed:", err);
  }
};

// Add this to mail.service.js
export const sendOtpMail = async ({ email, otp, type }) => {
  const subject = type === "signup" ? "Your Signup OTP - RaaziMarzi" : "Your Password Reset OTP - RaaziMarzi";
  const html = `
    <h3>${subject}</h3>
    <p>Your OTP is:</p>
    <h2>${otp}</h2>
    <p>Valid for 5 minutes</p>
  `;

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });
};
