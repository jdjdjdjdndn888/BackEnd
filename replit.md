# GemTide

GemTide is a React/Vite frontend with a Node/Express/MongoDB API for PS99 item-backed games.

## Current feature notes

- `/blackjack` remains the existing PS99 item 1v1 game.
- `/normal-blackjack` is the standalone dealer game with an item-funded normal wallet.
- Normal-wallet item exchanges are taxed at 8%; wallet exchange and redemption operations use server-side idempotency and MongoDB transactions.

## User preferences

- Keep item ownership and currency settlement atomic.
- Preserve existing game flows when adding new game modes.
- Use the provided visual assets and keep the GemTide purple/black visual language.