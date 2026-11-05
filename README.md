# AMMU WhatsApp Bot

GitHub Pages serves the admin dashboard. Render runs the Node.js WhatsApp Cloud API webhook.

## Deploy
1. In Render choose **New > Blueprint**, connect this repository and deploy the `render.yaml` blueprint.
2. Set Render environment variables: `VERIFY_TOKEN`, `ADMIN_KEY`, `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, and recommended `META_APP_SECRET`. Set `WHATSAPP_API_VERSION` to a version supported by your Meta app.
3. In Meta Developer Dashboard > WhatsApp > Configuration set callback URL to `https://YOUR-RENDER-HOST/webhook`, use the same `VERIFY_TOKEN`, verify and subscribe to `messages`.
4. Open https://mohamedamaan520-ui.github.io/ADV/ and connect using Render URL and `ADMIN_KEY`.

## Included features
- Dashboard, incoming/outgoing message history, contacts, manual text sending and editable auto replies.
- **Song search:** send `SONG <song name>`; the bot returns official iTunes listening and preview links. It does not fetch unauthorized copyrighted full tracks.
- **Sticker maker:** send an image with caption `STICKER`; the bot converts it to WebP and sends it back as a WhatsApp sticker.
- **Media saver:** send an image or video to the business number; the bot saves it and lists it in the dashboard's Saved Media page. Each received media file is limited to 16 MB.

## Important limitations
- Cloud API cannot recover media deleted from other people's chats or messages the bot never received.
- Current Render storage and message history are temporary/in-memory. Files/history can be lost on restart or redeploy. Add persistent storage or a database for long-term archives.
- WhatsApp Cloud API charges may apply depending on message category and destination. Render's free service may sleep.
- Use only music you own or are licensed to share. Song search provides official links/previews rather than unauthorized copyrighted downloads.
- Never commit access tokens, admin keys or app secrets. Use opted-in contacts and comply with Meta's WhatsApp policies.
