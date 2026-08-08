---
name: Cloudflare native backend
description: The default Cloudflare deployment is an API-only Worker with D1 and a Durable Object
---

The default Cloudflare runtime is an API-only Worker: it serves D1-backed API
routes and the Durable Object realtime channel. The React frontend is excluded
from the default deployment; a separate explicit config is required for a
full-stack Worker. Node is retained only as local build tooling for Vite and
Wrangler.

**Why:** The backend repository must not deploy the frontend accidentally when
Cloudflare auto-detects its default Wrangler configuration.

**How to apply:** Keep API URLs same-origin (`/api`) and realtime same-origin
(`ws(s)://<host>/realtime`). Keep the default Wrangler config API-only; use the
explicit frontend config only for an intentional full-stack deployment. Before
production deploy, bind a real remote D1 database ID in `wrangler.jsonc` and
apply the migration remotely.