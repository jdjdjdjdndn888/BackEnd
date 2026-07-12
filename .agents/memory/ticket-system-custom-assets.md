---
name: Ticket system custom assets
description: How custom images replace built-in emoji/banners in the support ticket system (site + Discord bot)
---

The support ticket system (website `components/support/SupportPage.jsx`,
`api/controllers/support/index.js`, and the Discord bot ticket flow in
`api/bot.js`) uses only custom-generated images, never built-in Unicode
emoji — assets live in `public/ticket-icon.png`, `public/ticket-banner.png`,
and `public/ticket-icons/*.png`.

**Why:** the user explicitly asked for all emojis/banners in the ticket
system to be actual custom images instead of platform emoji or generic
banners; this was scoped to the ticket system only, not the whole
site/bot (games, giveaways, etc. still use Unicode emoji intentionally).

**How to apply:** Discord buttons/embeds can't inline an arbitrary image
URL as an emoji — only a real Discord emoji (unicode or custom) works for
`ButtonBuilder.setEmoji()`. The bot uploads the PNGs in `public/` as
**application emojis** on `clientReady` (`ensureTicketEmojis()` in
`api/bot.js`, using `client.application.emojis.create({ name, attachment: url })`),
caches `{id, name, mention}` per key, and reuses them everywhere
(buttons via `{id,name}`, embed text via `<:name:id>` mention strings).
Frontend surfaces (SupportPage, NotificationsPanel ticket-related
notification types) just render `<img src="/ticket-icon.png" ...>` etc.
directly. If more ticket-related custom icons are added, follow the same
two patterns depending on surface (Discord vs React).
