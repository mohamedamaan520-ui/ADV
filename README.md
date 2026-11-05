# AMMU WhatsApp Bot

This repository replaces the old ADV advertising display with a WhatsApp Cloud API dashboard and Node.js webhook backend.

## Architecture
- GitHub Pages serves `index.html` (admin dashboard).
- Render runs `server.js` (webhook + WhatsApp Cloud API backend).
- WhatsApp connection uses Meta's official WhatsApp Cloud API.

## Deploy
1. Push this repository to GitHub (branch: main).
2. In Render choose **New > Blueprint**, connect this repository, and deploy the `render.yaml` blueprint.
3. In Render environment variables set:
   - `VERIFY_TOKEN`: create a long random string.
   - `ADMIN_KEY`: create a different long random secret.
   - `WHATSAPP_TOKEN`: Meta WhatsApp Cloud API access token.
   - `PHONE_NUMBER_ID`: Meta phone number ID.
   - `META_APP_SECRET`: optional but recommended, for webhook signature validation.
   - `WHATSAPP_API_VERSION`: supported Graph API version for your Meta app.
4. In Meta Developer Dashboard > WhatsApp > Configuration set Callback URL to `https://YOUR-RENDER-HOST/webhook`, Verify Token to the exact `VERIFY_TOKEN`, verify, then subscribe to `messages`.
5. Open GitHub Pages: `https://mohamedamaan520-ui.github.io/ADV/`. Enter Render backend URL and `ADMIN_KEY` on the connect screen.
6. Send a message to the WhatsApp test/business number and test `hi`, `menu`, and options 1–4.

## GitHub Pages
Enable Pages in repository Settings > Pages, source: Deploy from a branch, branch `main`, folder `/(root)`.

## Important
- Never commit access tokens, admin keys, app secrets, or `.env` files.
- Use WhatsApp opt-in contacts and follow Meta's messaging rules. Outside the 24-hour customer service window, approved templates are generally required for business-initiated messages.
- The free Render plan may sleep and is not guaranteed 24/7. Use an always-on plan for continuous business service.
- This initial release includes dashboard, webhook, welcome/menu/keyword auto replies, manual text sending, contact list and recent message history. Data is held in backend memory and resets when the service restarts. AI, media, templates, campaigns, scheduling, and durable database history are not yet included.
- This is a starter foundation; test with Meta's test number before production.
