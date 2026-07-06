---
name: Mongo withTransaction side-effect ordering
description: Why res.json/io.emit/manual commits must never live inside session.withTransaction() callbacks
---

`session.withTransaction(async () => {...})` (Mongoose/MongoDB driver) will silently retry or abort the callback on transient errors (e.g. write conflicts, transient transaction errors). Any code inside the callback can run more than once or not persist even though it appeared to succeed.

**Why:** If `res.json(...)`, `io.emit(...)`, or other side effects (history logging, stat updates, webhooks) run inside the callback, the client/socket can receive a "success" response for a transaction that is later retried or rolled back — producing exactly the symptom "shows created but disappears on refresh" or "not found" on a subsequent action. Manually calling `session.commitTransaction()` inside the callback is also wrong: `withTransaction` owns commit/retry lifecycle itself and will try to commit again after the callback returns, which can throw since the transaction is already committed/ended.

**How to apply:** Inside `withTransaction()`, only do DB reads/writes and `throw httpError(status, msg)` for validation failures (never `return res.status(...).json(...)` or `return` a response). Capture any data needed outside via outer-scoped `let` variables. After `await session.withTransaction(...)` resolves, then send `res.json`, emit sockets, and run other side effects. In the outer `catch`, check `err.statusCode` first (from validation), then fall back to generic 500. Never call `commitTransaction`/`abortTransaction` manually when using `withTransaction`.
