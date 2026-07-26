/**
 * Cloudflare Pages Function — /api/* proxy
 *
 * Mirrors the Vercel rewrite that was removed when the frontend moved to
 * Cloudflare Pages:
 *   { "src": "/api/(.*)", "dest": "https://api.gemtide.win/$1" }
 *
 * Every request to /api/<anything> on the Cloudflare Pages site is forwarded
 * to https://api.gemtide.win/<anything> with the same method, headers, and
 * body. This lets the frontend keep VITE_API_URL=/api and have it work
 * identically to the old Vercel setup.
 */
export async function onRequest({ request, params }) {
  const url = new URL(request.url);

  // params.path is the [[path]] catch-all — an array of path segments.
  // Join them and append any query string.
  const downstream = `https://api.gemtide.win/${
    params.path ? params.path.join("/") : ""
  }${url.search}`;

  const proxyRequest = new Request(downstream, {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "follow",
  });

  return fetch(proxyRequest);
}
