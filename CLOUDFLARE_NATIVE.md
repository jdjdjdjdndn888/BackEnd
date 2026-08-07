# Cloudflare native backend notes

This repository uses a native Cloudflare Worker backend under `workers/native-api/`
with a D1 schema in `migrations/0001_initial.sql`. The legacy Node/Express API
and edge proxy are no longer part of the application runtime.

## What is covered

- Basic Worker routing, CORS, and `no-store` responses
- D1-backed users/sessions/items/chat/support/trade/game tables
- Durable Object `RealtimeHub` for WebSocket subscriptions and broadcast events
- Authentication via bearer token lookup against hashed D1 sessions
- Clean-start login that can create a user without any hardcoded admin account

## Current scope

- The default deployment is the backend Worker only; it does not upload or
  serve the React frontend.
- Local preview uses `wrangler dev` with `wrangler.jsonc`, so it exercises the
  Worker/D1/Durable Object runtime instead of a separate application server.
- The optional full-stack config is `wrangler.frontend.jsonc`; use it only
  when the Worker should also serve a built `dist/` directory.
- The native backend currently provides compatibility implementations for the
  migrated routes; game rules and settlement logic should be expanded in this
  Worker as additional Cloudflare-native functionality is required.

## Deployment reminder

Create the production D1 database and apply the schema before deploying:

```bash
npx wrangler d1 create gemtide-native
npx wrangler d1 migrations apply gemtide-native --remote
pnpm run cf:deploy
```

After creating the database, copy its generated `database_id` into
`wrangler.jsonc`. Cloudflare requires that ID for a remote deployment.
