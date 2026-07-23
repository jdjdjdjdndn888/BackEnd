---
name: Normal blackjack wallet
description: Separate item-backed currency and dealer blackjack settlement rules
---

The normal blackjack mode must remain separate from the existing item 1v1 blackjack. Item exchanges move verified, unlocked inventory records to the house account and credit a dedicated wallet after the fixed 8% fee; redemptions atomically move house items back and debit that wallet.

**Why:** Mixing the normal table wallet with the site balance or item-game settlement would allow cross-mode balance leakage and make duplicate recovery ambiguous.

**How to apply:** Keep exchange, stock-backed partial redemption, equal-value item swapping, bet debit, game action, payout, and idempotency recording inside MongoDB transactions guarded by the shared per-user lock. Redemption may only move owner stock that exists; leave any wallet shortfall for a later withdrawal. Item breaking must swap verified user and house inventory directly without touching wallet credits. Use the six-deck shoe with dealer hits soft 17, 6:5 natural payout, and no post-deal refund path. Never trust client item values, ownership, game state, or payout.