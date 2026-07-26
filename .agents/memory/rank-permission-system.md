---
name: Rank/permission system
description: How staff ranks, badges, and chat/admin permissions are wired, and a casing pitfall that silently breaks them
---

Canonical rank strings (uppercase, underscore-separated) are centralized in `api/utils/rankTiers.js`
(`ADMIN_PANEL_TIER`, `OWNER_TIER`, `FULL_STAFF_TIER`, `TRIAL_STAFF_TIER`, `ALL_RANKS`). Frontend badge/color
mapping for the same ranks lives in `utils/getrole.js` (`SPECIAL_RANKS`). Any new rank must be added in both
places with the exact same string, or it will silently fall through to the default "no special badge / no
staff permission" branch instead of erroring.

**Why:** before this was centralized, the admin panel's rank dropdown wrote lowercase `"mod"` while every
permission check (`utils/getrole.js`, chat staff gate) compared against uppercase `"MODERATOR"` — so any user
promoted to Moderator via the panel got no badge and no chat-mod permissions, with no error anywhere. This
class of bug (string literal drift between the write path and the read path) is easy to reintroduce if new
rank checks are added ad hoc instead of importing the shared tier lists/constants.

**How to apply:** when adding a new staff rank or changing permission gating, import from
`api/utils/rankTiers.js` (backend) rather than hardcoding rank strings, and add the matching entry to
`SPECIAL_RANKS` in `utils/getrole.js` (frontend) using the identical string.
