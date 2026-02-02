require("dotenv").config();

const to = process.argv[2] || "+916305480792";
const {
  SMS_TWILIO_ACCOUNTSID,
  SMS_TWILIO_AUTHTOKEN,
  TWILIO_FROM,
  SMS_TWILIO_MESSAGINGSERVICESID,
} = process.env;

async function run() {
  if (!SMS_TWILIO_ACCOUNTSID || !SMS_TWILIO_AUTHTOKEN) {
    console.error("Twilio creds missing in environment.");
    process.exit(2);
  }

  const client = require("twilio")(SMS_TWILIO_ACCOUNTSID, SMS_TWILIO_AUTHTOKEN);
  const payload = {
    to,
    body: `SmartSafety diagnostic: this is a test message. Reply STOP to unsubscribe.`,
  };
  if (SMS_TWILIO_MESSAGINGSERVICESID)
    payload.messagingServiceSid = SMS_TWILIO_MESSAGINGSERVICESID;
  else if (TWILIO_FROM) payload.from = TWILIO_FROM;

  try {
    const res = await client.messages.create(payload);
    console.log("Twilio response:", {
      sid: res.sid,
      status: res.status,
      to: res.to,
    });
  } catch (err) {
    // Print detailed Twilio error object if present
    if (err && err.code) {
      console.error("Twilio error:", {
        code: err.code,
        message: err.message,
        more: err.more,
      });
    } else {
      console.error(
        "Twilio send failed:",
        err && err.message ? err.message : err,
      );
    }
    process.exit(3);
  }
}

run();
