# Cloudflare-only deployment

The application is now a single Cloudflare Worker under
`workers/native-api/index.js`. It serves:

- the React/Vite build from `dist/`
- the D1-backed `/api/*` routes
- realtime WebSockets through the `RealtimeHub` Durable Object

There is no Node API origin, Express server, MongoDB connection, Render
service, or API proxy in the application runtime.

## First-time Cloudflare setup

Create a D1 database in the Cloudflare account and put its generated ID in
`wrangler.jsonc`:

```bash
npx wrangler d1 create gemtide-native
npx wrangler d1 migrations apply gemtide-native --remote
pnpm run cf:deploy
```

The local Worker can be tested without Cloudflare credentials:

```bash
pnpm run cf:dev
```

API responses use `Cache-Control: no-store` because balances, inventories,
authentication, and game state must not be cached.