# Facebook Page Bot Runner (Node.js)

This small project provides a Facebook Page webhook bot that:
- Verifies Facebook webhook GET requests
- Receives messages via POST /webhook
- Responds to the message "start chat" with an acknowledgement and (optionally) an AI reply via Google Gemini

Key files:
- `index.js` - Express server, webhook handler, Facebook Send API integration
- `package.json` - dependencies and start script
- `.env.example` - environment variable examples

Required environment variables (set these in Render.com or in a local `.env` file):
- `FACEBOOK_PAGE_ACCESS_TOKEN` — Facebook Page access token (Send API).
- `FACEBOOK_VERIFY_TOKEN` — Token used to verify webhook during setup.
- `GEMINI_API_KEY` — Optional. Google Gemini / GenAI API key for AI replies.

Deploying to Render.com
1. Create a new Web Service on Render (connect your repo or upload these files).
2. Build command: `npm install`
3. Start command: `npm start`
4. In Render's Environment settings, add the env vars from above.
5. Configure your Facebook App's Webhooks:
   - Callback URL: `https://<your-render-service>.onrender.com/webhook`
   - Verify Token: value of `FACEBOOK_VERIFY_TOKEN`
   - Subscribe the Page events `messages` and `messaging_postbacks` (or `messages` only to start).
   - Use your Page Access Token when prompted by Facebook to allow Send API calls.

About Gemini integration
- This repo includes a minimal `generateWithGemini` function that tries a simple REST POST to a Gemini model.
- Google provides official SDKs and a Node.js Gen AI SDK which are recommended for reliable integration:
  - Gemini docs & quickstart: https://ai.google.dev/gemini-api/docs/quickstart
  - Vertex AI / Gemini model docs: https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash
  - Node SDK: https://github.com/googleapis/js-genai
- If you want streaming or more advanced prompts, use the official SDK as shown in the links above.

Security notes
- NEVER commit secrets to git. Use Render environment variables.
- For production bots, validate and verify Facebook signatures on incoming requests (X-Hub-Signature) before trusting payloads.

Troubleshooting
- If Facebook returns errors when sending messages, ensure your PAGE_ACCESS_TOKEN is correct and that your app has the proper permissions.
- If Gemini calls fail, check that GEMINI_API_KEY is set and that the API is enabled for your Google project.

--- End
