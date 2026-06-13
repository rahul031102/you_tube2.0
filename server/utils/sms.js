import twilio from "twilio";

let cachedClient;

const getClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = twilio(sid, token);
  }
  return cachedClient;
};

export const isSmsConfigured = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );

export const sendSms = async ({ to, body }) => {
  const client = getClient();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!client || !from) {
    console.warn("SMS not sent: Twilio is not configured.");
    return false;
  }

  await client.messages.create({ to, from, body });
  return true;
};
