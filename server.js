require("dotenv").config();
const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Load Twilio only if credentials are set (optional for local dev without SMS)
let twilioClient = null;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (accountSid && authToken) {
  try {
    twilioClient = require("twilio")(accountSid, authToken);
  } catch (e) {
    console.warn("Twilio not configured:", e.message);
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Normalize Indian mobile to E.164: 10 digits -> +91xxxxxxxxxx
function toE164(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return "+91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return "+" + digits;
  if (digits.length >= 10) return "+" + digits;
  return null;
}

app.post("/api/send-sms", async (req, res) => {
  if (!twilioClient || !fromNumber) {
    return res.status(503).json({
      success: false,
      error: "SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.",
    });
  }

  const { to, body } = req.body || {};
  const phone = toE164(to);
  if (!phone) {
    return res.status(400).json({ success: false, error: "Invalid mobile number." });
  }
  if (!body || typeof body !== "string") {
    return res.status(400).json({ success: false, error: "Message body is required." });
  }

  try {
    const message = await twilioClient.messages.create({
      body: body,
      from: fromNumber,
      to: phone,
    });
    res.json({ success: true, sid: message.sid });
  } catch (err) {
    const code = err.code || err.status || 500;
    const msg = err.message || String(err);
    res.status(code >= 400 ? code : 500).json({ success: false, error: msg });
  }
});

app.listen(PORT, () => {
  console.log("Server at http://localhost:" + PORT);
  if (!twilioClient || !fromNumber) {
    console.log("SMS disabled: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to enable.");
  }
});
