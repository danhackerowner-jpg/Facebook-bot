// Simple Facebook Page Bot runner for Render.com
// - Verifies webhook
// - Handles messages and responds when user says "start chat"
// - Optional Gemini integration (see README links & env vars)
//
// IMPORTANT: Put your env vars in Render's dashboard or a .env file locally:
//   FACEBOOK_PAGE_ACCESS_TOKEN
//   FACEBOOK_VERIFY_TOKEN
//   GEMINI_API_KEY  (optional)
//
// Start: npm install && npm start
const express = require('express');
const bodyParser = require('body-parser');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
require('dotenv').config();

const APP_PORT = process.env.PORT || 3000;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'verify-token';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!PAGE_ACCESS_TOKEN) {
  console.warn('Warning: FACEBOOK_PAGE_ACCESS_TOKEN not set. The bot can still respond locally to verification and will acknowledge "start chat" but sending messages to Facebook will fail until you set PAGE_ACCESS_TOKEN.');
}

const app = express();
app.use(bodyParser.json());

// Health
app.get('/', (req, res) => res.send('Facebook Gemini Bot is running.'));

// Facebook webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// Webhook to receive messages from Facebook
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    // Check this is an event from a page subscription
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          const senderId = event.sender && event.sender.id;
          if (!senderId) continue;

          // Message text
          if (event.message && event.message.text) {
            const text = event.message.text.trim().toLowerCase();
            console.log('Received message:', text, 'from', senderId);

            if (text === 'start chat') {
              // Immediate acknowledgement
              await sendTextMessage(senderId, 'Starting chat... connecting to AI (if configured).');

              // If GEMINI_API_KEY is set, call Gemini and send the response
              if (GEMINI_API_KEY) {
                const aiReply = await generateWithGemini('User started a chat. Say hi and ask how you can help.');
                await sendTextMessage(senderId, aiReply);
              } else {
                await sendTextMessage(senderId, "Gemini API not configured. To enable AI replies, set GEMINI_API_KEY in your environment. See README for details.");
              }
            } else {
              // Generic reply
              await sendTextMessage(senderId, "I received: " + event.message.text);
            }
          }

          // Postbacks and other events could be handled here...
        }
      }
      // Return a '200 OK' to Facebook
      res.status(200).send('EVENT_RECEIVED');
    } else {
      // Return a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.sendStatus(500);
  }
});

// Helper: send message to Facebook Send API
async function sendTextMessage(recipientId, text) {
  if (!PAGE_ACCESS_TOKEN) {
    console.log('[sendTextMessage] (skipped) Would send to', recipientId, 'text:', text);
    return;
  }
  const url = `https://graph.facebook.com/v15.0/me/messages?access_token=${encodeURIComponent(PAGE_ACCESS_TOKEN)}`;
  const body = {
    recipient: { id: recipientId },
    message: { text }
  };
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('Facebook Send API error', data);
    }
  } catch (err) {
    console.error('Failed to call Facebook Send API', err);
  }
}

// Helper: call Gemini (basic example using REST; for production prefer official SDK)
async function generateWithGemini(prompt) {
  // This function attempts a simple REST call to Google GenAI / Gemini.
  // Official SDKs are recommended (see README links).
  try {
    // NOTE: endpoint, headers, and request shape may vary by provider/version.
    // This is a minimal example. If it fails, the function returns a fallback string.
    const model = 'gemini-2.0-flash';
    const endpoint = `https://api.generativeai.google/v1/models/${model}:generate`;
    const body = {
      prompt: prompt,
      // many Gemini endpoints use different param names; adjust if you use the official SDK
    };
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMINI_API_KEY}`
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      console.warn('Gemini call failed, status', resp.status);
      const text = await resp.text();
      console.warn(text);
      return 'AI service returned an error. Check server logs and your GEMINI_API_KEY.';
    }
    const data = await resp.json();
    // Try multiple possible response shapes
    if (data.output && data.output[0] && data.output[0].content) {
      return data.output[0].content[0].text || JSON.stringify(data.output);
    } else if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.map(p=>p.text||'').join('\n') || JSON.stringify(data);
    } else if (data.text) {
      return data.text;
    } else {
      return 'AI returned an unexpected shape. Check logs.';
    }
  } catch (err) {
    console.error('generateWithGemini error', err);
    return 'AI service error (see server logs).';
  }
}

app.listen(APP_PORT, () => {
  console.log('Server started on port', APP_PORT);
});
