/**
 * Creates an Error carrying an HTTP status code.
 *
 * IMPORTANT: This must be used (thrown) instead of calling `res.status().json()`
 * from *inside* a `session.withTransaction()` callback.
 *
 * Why: Mongoose/MongoDB automatically retries the ENTIRE withTransaction callback
 * when it hits a transient error (e.g. "Write conflict"), and it can also retry
 * the callback if the final commit itself fails transiently. If the callback has
 * already sent an HTTP response and/or emitted sockets before that retry/rollback
 * happens, the client ends up believing an action succeeded (e.g. "Match created!")
 * even though the transaction was rolled back and nothing was actually saved.
 *
 * The fix: only do reads/writes inside withTransaction. Throw httpError(...) for
 * validation failures instead of responding directly, and only call res.json/
 * io.emit/other side effects AFTER `await session.withTransaction(...)` resolves
 * successfully (meaning the transaction is actually committed).
 */
function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = { httpError };
