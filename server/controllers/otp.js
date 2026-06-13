import crypto from "crypto";
import users from "../Modals/Auth.js";
import otps from "../Modals/otp.js";
import { sendMail } from "../utils/mailer.js";
import { sendSms } from "../utils/sms.js";

const OTP_TTL_MINUTES = 10;

const SOUTH_INDIAN_STATES = [
  "tamil nadu",
  "kerala",
  "karnataka",
  "andhra pradesh",
  "telangana",
];

const normalize = (value) => (value || "").trim().toLowerCase();

const isSouthIndia = ({ region, country, countryCode }) => {
  const india =
    normalize(country) === "india" || normalize(countryCode) === "in";
  return india && SOUTH_INDIAN_STATES.includes(normalize(region));
};

const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const maskEmail = (email = "") => {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 1))}@${domain}`;
};

const maskPhone = (phone = "") => {
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return trimmed;
  return `${"*".repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
};

export const requestOtp = async (req, res) => {
  const { userId, region, country, countryCode, forceEmail } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User id is required." });
  }

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const southIndia = isSouthIndia({ region, country, countryCode });
    // South India -> email OTP. Everywhere else -> SMS OTP.
    let channel = southIndia || forceEmail ? "email" : "sms";

    if (channel === "sms" && !user.phone) {
      return res.status(400).json({
        code: "PHONE_REQUIRED",
        message:
          "No registered mobile number. Add a phone number or use email instead.",
      });
    }

    const destination = channel === "email" ? user.email : user.phone;
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // Invalidate any previous unused codes for this user.
    await otps.deleteMany({ userId: user._id, used: false });
    await otps.create({ userId: user._id, otp, channel, destination, expiresAt });

    const message = `Your YourTube verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`;
    let delivered = false;
    if (channel === "email") {
      delivered = await sendMail({
        to: destination,
        subject: "Your YourTube verification code",
        html: `<div style="font-family: sans-serif;">
          <h2>YourTube Login Verification</h2>
          <p>Your verification code is:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
          <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>
        </div>`,
      });
    } else {
      delivered = await sendSms({ to: destination, body: message });
    }

    const response = {
      channel,
      destination:
        channel === "email" ? maskEmail(destination) : maskPhone(destination),
      delivered,
    };

    // Surface the OTP for local testing only when explicitly enabled.
    if (process.env.OTP_DEBUG === "true") {
      response.devOtp = otp;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({ message: "Unable to send OTP." });
  }
};

export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ message: "User id and OTP are required." });
  }

  try {
    const record = await otps
      .findOne({ userId, used: false })
      .sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ message: "No active OTP. Please request a new one." });
    }

    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (record.otp !== String(otp).trim()) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    record.used = true;
    await record.save();

    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ message: "OTP verified.", user });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Unable to verify OTP." });
  }
};
