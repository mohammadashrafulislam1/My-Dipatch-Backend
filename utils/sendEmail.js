import nodemailer from "nodemailer";

console.log("process.env.SMTP_USER", process.env.SMTP_USER)
console.log("process.env.SMTP_PASS", process.env.SMTP_PASS)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // MUST be true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // App Password, NOT your real password
  },
});
export const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"LocalRun" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email send error:", err);
  }
};
