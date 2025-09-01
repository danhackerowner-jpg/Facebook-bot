// Facebook Page Bot Runner with Gemini 2.0 Flash
// Works on Render.com
//
// Env vars needed (set in Render dashboard or .env file):
//   FACEBOOK_PAGE_ACCESS_TOKEN
//   FACEBOOK_VERIFY_TOKEN
//   GEMINI_API_KEY
//
// Build: npm install
// Start: npm start

const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const APP_PORT = process.env.PORT || 3000;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || "verify-token";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const app = express();
app.use(bodyParser.json());

// Health check
app.get("/", (req, res) => res.send("Facebook Gemini Bot is running."));

// Verify webhook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Handle messages
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object === "page") {
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          const senderId = event.sender?.id;
          if (!senderId) continue;

          if (event.message?.text) {
            const text = event.message.text.trim().toLowerCase();
            console.log("Message from", senderId, ":", text);

            if (text === "start chat") {
              await sendTextMessage(senderId, "Starting chat...");

              if (GEMINI_API_KEY) {
                const reply = await generateWithGemini(
                  "The user said 'start chat'. Greet them and ask how you can help."
                );
                await sendTextMessage(senderId, reply);
              } else {
                await sendTextMessage(
                  senderId,
                  "Gemini API not configured. Add GEMINI_API_KEY to enable AI replies."
                );
              }
            } else {
              await sendTextMessage(senderId, "I got: " + event.message.text);
            }
          }
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    }
    res.sendStatus(404);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

// Send text message using Facebook Send API
async function sendTextMessage(recipientId, text) {
  const fetch = (await import("node-fetch")).default;
  const url = `https://graph.facebook.com/v15.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  const body = {
    recipient: { id: recipientId },
    message: { text },
  };
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (!resp.ok) console.error("Send API error:", data);
  } catch (err) {
    console.error("Send API request failed:", err);
  }
}

// Call Gemini API
async function generateWithGemini(prompt) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini error:", err);
    return "AI error: " + err.message;
  }
}

app.listen(APP_PORT, () => {
  console.log("Server running on port", APP_PORT);
});
  
