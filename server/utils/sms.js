import axios from "axios";

const BASE_URL = "https://cpaas.messagecentral.com";

let cachedToken = null;
let cachedTokenExpiry = 0;

export const isSmsConfigured = () =>
  Boolean(
    process.env.MESSAGECENTRAL_CUSTOMER_ID &&
      process.env.MESSAGECENTRAL_PASSWORD &&
      process.env.MESSAGECENTRAL_EMAIL
  );

// Message Central requires a short-lived auth token before sending any OTP.
// Cache it in memory and only refresh once it's close to expiry (~24h validity).
const getAuthToken = async () => {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry) {
    return cachedToken;
  }

  const customerId = process.env.MESSAGECENTRAL_CUSTOMER_ID;
  const password = process.env.MESSAGECENTRAL_PASSWORD;
  const email = process.env.MESSAGECENTRAL_EMAIL;

  const key = Buffer.from(password).toString("base64");

  const { data } = await axios.get(`${BASE_URL}/auth/v1/authentication/token`, {
    params: {
      customerId,
      key,
      scope: "NEW",
      country: "91",
      email,
    },
    headers: { accept: "*/*" },
  });

  cachedToken = data.token;
  // Tokens are valid ~24h; refresh a little early to be safe.
  cachedTokenExpiry = now + 23 * 60 * 60 * 1000;
  return cachedToken;
};

// Message Central generates and delivers the OTP itself — it returns a
// verificationId, which must be stored and later passed to verifySmsOtp()
// along with the code the user enters. This differs from the email flow,
// where we generate and check our own OTP.
export const sendSms = async ({ to }) => {
  if (!isSmsConfigured()) {
    console.warn("SMS not sent: Message Central is not configured.");
    return { delivered: false };
  }

  try {
    const authToken = await getAuthToken();
    const mobileNumber = to.replace(/^\+?91/, "").replace(/\D/g, "");

    const { data } = await axios.post(
      `${BASE_URL}/verification/v3/send`,
      {},
      {
        params: {
          countryCode: "91",
          flowType: "SMS",
          mobileNumber,
        },
        headers: { authToken },
      }
    );

    if (data?.responseCode !== 200) {
      console.error("Message Central send error:", data);
      return { delivered: false };
    }

    return { delivered: true, verificationId: data.data.verificationId };
  } catch (err) {
    console.error("Message Central send failed:", err?.response?.data || err.message);
    return { delivered: false };
  }
};

// Validates the OTP against Message Central directly — there is no local
// OTP to compare against for the SMS channel.
export const verifySmsOtp = async ({ verificationId, code }) => {
  if (!isSmsConfigured()) {
    return { success: false, message: "SMS verification not configured." };
  }

  try {
    const authToken = await getAuthToken();

    const { data } = await axios.get(`${BASE_URL}/verification/v3/validateOtp`, {
      params: { verificationId, code },
      headers: { authToken },
    });

    const status = data?.data?.verificationStatus;
    if (status === "VERIFICATION_COMPLETED") {
      return { success: true };
    }
    return { success: false, message: "Invalid or expired OTP." };
  } catch (err) {
    console.error("Message Central validate failed:", err?.response?.data || err.message);
    return { success: false, message: "Unable to verify OTP." };
  }
};
// EOF
// echo "sms.js rewritten for Message Central"