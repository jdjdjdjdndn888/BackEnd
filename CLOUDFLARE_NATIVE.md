# Cloudflare native backend notes

This repository now includes a native Cloudflare Worker backend under `workers/native-api/` with a D1 schema in `migrations/0001_initial.sql`.

## What is covered

- Basic Worker routing, CORS, and `no-store` responses
- D1-backed users/sessions/items/chat/support/trade/game tables
- Durable Object `RealtimeHub` for WebSocket subscriptions and broadcast events
- Authentication via bearer token lookup against hashed D1 sessions
- Clean-start login that can create a user without any hardcoded admin account

## Limitations

- The new backend currently returns minimal compatibility payloads for many game/read endpoints.
- Full parity with the legacy MongoDB backend is not complete yet; some endpoints are stubs or simplified.
- Balance, inventory, and game rules still need project-specific business logic to match the old API exactly.
- The existing `api/` code is intentionally left in place for now, per request.
- No smoke test harness is wired into package scripts yet.

## Deployment reminder

Update the Wrangler D1 database id before deploying. The current config contains a placeholder value.
