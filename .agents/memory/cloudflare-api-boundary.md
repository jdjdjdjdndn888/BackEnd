---
name: Cloudflare API boundary
description: The deployment boundary between the MongoDB-backed Node API and Cloudflare Workers
---

Cloudflare Workers should front this backend as an edge proxy rather than importing
the Express/Mongoose application directly. The game controllers depend on
MongoDB's Node TCP driver, Mongoose transactions, Socket.IO, and long-lived
startup/scheduler behavior; a Worker cannot provide those runtime guarantees.

**Why:** Replacing the data layer with a Workers-native database would be a
large behavioral migration with atomic settlement and realtime compatibility
risks. An edge proxy provides Cloudflare routing and protection without
changing the game API contract.

**How to apply:** Keep the Node API as the database origin, deploy the Worker
adapter on the public API hostname, set its `API_ORIGIN` to the non-Worker
origin, and preserve WebSocket upgrade responses for Socket.IO. Do not point
`API_ORIGIN` back at the Worker hostname.