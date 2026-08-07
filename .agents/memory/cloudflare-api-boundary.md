---
name: Cloudflare native backend
description: The application now runs on a Cloudflare Worker with D1 and a Durable Object
---

The application runtime is Cloudflare-only: the Worker serves the SPA assets,
D1-backed API routes, and Durable Object realtime channel. Node is retained
only as local build tooling for Vite and Wrangler.

**Why:** The requested cutover removed the Express/Mongoose/MongoDB origin and
the edge proxy rather than maintaining a hybrid deployment.

**How to apply:** Keep API URLs same-origin (`/api`) and realtime same-origin
(`ws(s)://<host>/realtime`). Before production deploy, bind a real remote D1
database ID in `wrangler.jsonc` and apply the migration remotely.