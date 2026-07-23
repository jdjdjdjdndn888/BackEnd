---
name: Normal blackjack wallet
description: Separate item-backed currency and dealer blackjack settlement rules
---

The normal blackjack mode must remain separate from the existing item 1v1 blackjack. Item exchanges move verified, unlocked inventory records to the house account and credit a dedicated wallet after the fixed 8% fee; redemptions atomically move house items back and debit that wallet.

**Why:** Mixing the normal table wallet with the site balance or item-game settlement would allow cross-mode balance leakage and make duplicate recovery ambiguous.

**How to apply:** Keep exchange, redemption, bet debit, game action, payout, cancellation, and idempotency recording inside MongoDB transactions guarded by the shared per-user lock. Never trust client item values, ownership, game state, or payout.