/**
 * Cloudflare Worker edge adapter for the GemTide API.
 *
 * The application still runs on the Node API origin because its game
 * controllers use Mongoose transactions and MongoDB's native TCP protocol.
 * Cloudflare Workers cannot open that TCP connection directly. This adapter
 * puts the API behind Cloudflare without changing the public API contract.
 *
 * Required Worker variable:
 *   API_ORIGIN = the existing Node API origin, for example:
 *   https://your-service.onrender.com
 *
 * Deploy this Worker on the API hostname, not on the frontend Pages hostname.
 */

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
]);

function getApiOrigin(env) {
  const configured = String(env.API_ORIGIN || "").trim().replace(/\/+$/, "");
  if (!configured) {
    throw new Error("API_ORIGIN is not configured");
  }

  const origin = new URL(configured);
  if (origin.protocol !== "https:" && origin.protocol !== "http:") {
    throw new Error("API_ORIGIN must use http or https");
  }
  return origin;
}

function copyRequestHeaders(request) {
  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);

  // Workers can proxy a WebSocket upgrade when the Upgrade header is kept.
  // Socket.IO falls back to HTTP polling if a client cannot upgrade, but
  // preserving this header lets existing realtime clients use WebSockets.
  if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
    headers.set("upgrade", "websocket");
  }

  // Cloudflare adds the real client address to the request automatically.
  // Keep a conventional forwarding header for Express/proxy-aware logging.
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  headers.set("x-forwarded-proto", "https");
  return headers;
}

function copyResponseHeaders(response) {
  const headers = new Headers(response.headers);
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);

  // Never let an intermediate cache store authenticated game responses.
  headers.set("Cache-Control", "no-store");
  return headers;
}

function originUrl(request, apiOrigin) {
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, apiOrigin);
  return target;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/__cloudflare/health") {
      return Response.json({
        ok: true,
        service: "gemtide-api-edge",
        timestamp: new Date().toISOString(),
      });
    }

    let apiOrigin;
    try {
      apiOrigin = getApiOrigin(env);
    } catch (error) {
      return Response.json(
        { ok: false, error: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    const target = originUrl(request, apiOrigin);
    const headers = copyRequestHeaders(request);
    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    // A Request body can only be consumed once. Passing the original request
    // through is supported by Workers and preserves streaming uploads.
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    try {
      const response = await fetch(new Request(target, init));
      // A WebSocket upgrade must be returned untouched. Reconstructing a
      // 101 response can discard the platform-managed WebSocket connection.
      if (response.status === 101) return response;

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: copyResponseHeaders(response),
      });
    } catch (error) {
      console.error("API origin request failed", error);
      return Response.json(
        { success: false, message: "API origin unavailable" },
        {
          status: 502,
          headers: {
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": url.origin,
          },
        },
      );
    }
  },
};