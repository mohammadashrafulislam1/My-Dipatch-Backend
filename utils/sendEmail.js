import nodemailer from "nodemailer";
import 'dotenv/config';

// Add this temporarily to your sendEmail function to debug
console.log("Attempting to send from:", process.env.SMTP_USER);
console.log("Is SMTP_PASS defined?:", !!process.env.SMTP_PASS);
const transporter = nodemailer.createTransport({
    service: 'Gmail', // or another email service provider
    auth: {
        user: process.env.SMTP_USER, // Your email address
        pass: process.env.SMTP_PASS, // Your email password or app password
    },
});

/**
 * EMAIL SENDER FUNCTION
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `<${process.env.SMTP_USER}>`,
      to,
      subject,
      html:html,
    });

    console.log("✅ Email sent successfully:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email send error details:", {
      message: err.message,
      code: err.code,
      command: err.command,
    });
    // Throw error so the calling function can handle UI feedback or retries
    throw err; 
  }
};