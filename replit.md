# GemTide

GemTide is a React frontend and Cloudflare Worker application for PS99
item-backed games. The Worker serves the frontend, D1-backed API, and
Durable Object realtime channel.

## Current feature notes

- `/blackjack` remains the existing PS99 item 1v1 game.
- `/normal-blackjack` is the standalone dealer game with an item-funded normal wallet.
- Normal-wallet item exchanges are taxed at 8%; wallet exchange and redemption
  operations are implemented in the Worker/D1 backend.

## User preferences

- Keep item ownership and currency settlement atomic.
- Preserve existing game flows when adding new game modes.
- Use the provided visual assets and keep the GemTide purple/black visual language.