import nodemailer from "nodemailer";
import 'dotenv/config';

// Add this temporarily to your sendEmail function to debug
console.log("Attempting to send from:", process.env.SMTP_USER);
console.log("Is SMTP_PASS defined?:", !!process.env.SMTP_PASS);
/**
 * TRANSPORTER CONFIGURATION
 * Using host/port explicitly is more reliable on cloud platforms like Render.
 * Ensure SMTP_PASS is a 16-character Google App Password.
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, 
  },
  // Increased timeouts to handle slow network handshakes
  connectionTimeout: 10000, 
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

/**
 * EMAIL SENDER FUNCTION
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Ride App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
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