import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  try {
    await resend.emails.send({
      from: "onboarding@resend.dev", // default test domain
      to,
      subject,
      html,
    });
    console.log("✅ Email sent to", to);
  } catch (err) {
    console.error("Email send error:", err);
  }
};
