# Cloudflare API deployment

## What is deployed

The API has two parts:

1. `api/server.js` is the database-backed Node origin. It owns Express,
   Mongoose, MongoDB transactions, scheduled game state, and Socket.IO.
2. `workers/api-proxy.js` is a Cloudflare Worker edge adapter. It forwards
   HTTP requests and Socket.IO upgrade requests to the Node origin, so the API
   can be served through Cloudflare without rewriting the MongoDB data layer.

Cloudflare Workers cannot directly run this backend as written because
Mongoose/MongoDB use a Node TCP connection and several controllers rely on
MongoDB transactions. A full Workers-native migration would require replacing
the database layer and the long-lived realtime/scheduler services.

## Deploy the edge adapter

1. Keep the Node API running on its existing host.
2. Edit `wrangler.api.jsonc` and set `API_ORIGIN` to that host. Do not point it
   at the Cloudflare Worker hostname or the Worker will proxy to itself.
3. From the project root, run:

   ```bash
   npx wrangler deploy --config wrangler.api.jsonc
   ```

4. Attach the Worker to the API hostname in Cloudflare:
   `api.your-domain.example/*`.
5. Verify:

   ```bash
   curl https://api.your-domain.example/__cloudflare/health
   ```

The Worker intentionally uses `Cache-Control: no-store` for API responses so
authenticated balances, inventories, game state, and admin responses are not
cached at the edge.

## Discord bot

Discord is no longer loaded by `api/server.js`, and the Discord Bot workflow is
removed from `.replit`. The bot remains available as an explicitly launched
process when needed:

```bash
cd api
node run-bot.js
```

It is not part of the API or Cloudflare startup path.