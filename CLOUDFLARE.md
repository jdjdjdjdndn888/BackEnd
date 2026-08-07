# Cloudflare-only deployment

The backend is a Cloudflare Worker under
`workers/native-api/index.js`. The default deployment serves:

- the D1-backed `/api/*` routes
- realtime WebSockets through the `RealtimeHub` Durable Object

The default backend deployment does not include the React frontend. The
optional `wrangler.frontend.jsonc` config can be used for a deliberate
full-stack Worker deployment.

## First-time Cloudflare setup

Create a D1 database in the Cloudflare account and put its generated ID in
`wrangler.jsonc`:

```bash
npx wrangler d1 create gemtide-native
npx wrangler d1 migrations apply gemtide-native --remote
pnpm run cf:deploy
```

The local backend Worker can be tested without Cloudflare credentials:

```bash
pnpm run cf:dev
```

API responses use `Cache-Control: no-store` because balances, inventories,
authentication, and game state must not be cached.