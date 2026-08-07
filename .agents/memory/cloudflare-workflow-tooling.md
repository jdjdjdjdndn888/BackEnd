---
name: Cloudflare workflow tooling
description: Cloudflare preview workflows need Wrangler available as a local project dependency
---

The main Cloudflare workflow should invoke a Wrangler version installed in the project rather than relying on `npx` to install it interactively.

**Why:** When Wrangler was missing locally, the workflow paused for install confirmation and never opened the preview port.

**How to apply:** Keep Wrangler in the project dependencies and use the checked-in package manager install before restarting or validating the Worker preview.