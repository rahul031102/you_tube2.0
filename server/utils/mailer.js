import nodemailer from "nodemailer";

export const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const secure = process.env.EMAIL_SECURE === "true";

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

export const sendMail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("Email not sent: mail transporter not configured.");
    return false;
  }

  await transporter.sendMail({
    from:
      process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@yourtube.com",
    to,
    subject,
    html,
  });
  return true;
};
