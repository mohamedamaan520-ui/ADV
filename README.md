# AMMU WHATSAPP BOT
GitHub Pages dashboard + Cloudflare Worker. Render and the old Express backend are retired.

## Four features
- Song Downloader/Search: returns official listening links and previews; no unauthorized copyrighted full-track downloads.
- Message Saver: saves text in D1 and image/video files in R2 when delivered to the bot.
- Image to Sticker: dashboard converts a selected image to WebP in the browser and sends it as a WhatsApp sticker.
- Auto Reaction: reacts to incoming messages using the selected emoji.

## Cloudflare setup
1. Create D1 database `ammu-whatsapp-db`, then run `schema.sql` in its SQL console.
2. Create R2 bucket `ammu-whatsapp-media`.
3. Replace D1 `database_id` in `wrangler.toml`.
4. Install Wrangler: `npm install -g wrangler`; sign in with `wrangler login`; deploy with `wrangler deploy`.
5. Add secrets: `wrangler secret put VERIFY_TOKEN`, `ADMIN_KEY`, `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`.
6. In Meta WhatsApp Configuration, set webhook URL to `https://YOUR-WORKER.workers.dev/webhook`, same verify token, subscribe to `messages`.
7. Open GitHub Pages and connect using Worker URL and ADMIN_KEY.

## Limitations
The bot can save only messages delivered to it after webhook activation; it cannot recover old/deleted messages it never received. Song search returns official links and previews, not unauthorized MP3 downloads. WhatsApp opt-in rules and Meta fees may apply. Keep secrets out of GitHub.
