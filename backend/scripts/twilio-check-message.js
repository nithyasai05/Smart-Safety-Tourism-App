require("dotenv").config();
const sid = process.argv[2];
if (!sid) {
  console.error("Usage: node twilio-check-message.js <MessageSid>");
  process.exit(2);
}

const client = require("twilio")(
  process.env.SMS_TWILIO_ACCOUNTSID,
  process.env.SMS_TWILIO_AUTHTOKEN,
);

(async () => {
  try {
    const msg = await client.messages(sid).fetch();
    // print selected fields useful for delivery troubleshooting
    const out = {
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
      errorCode: msg.errorCode || null,
      errorMessage: msg.errorMessage || null,
      numSegments: msg.numSegments,
      body:
        msg.body && msg.body.length > 160
          ? msg.body.slice(0, 160) + "..."
          : msg.body,
      uri: msg.uri,
      dateCreated: msg.dateCreated,
      dateSent: msg.dateSent,
      dateUpdated: msg.dateUpdated,
    };
    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error(
      "Failed to fetch message from Twilio:",
      err && err.message ? err.message : err,
    );
    if (err && err.code) console.error("Twilio error code:", err.code);
    process.exit(3);
  }
})();
