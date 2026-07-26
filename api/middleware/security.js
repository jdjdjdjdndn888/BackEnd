const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");

// ── IP blocklist ─────────────────────────────────────────────────────────
// Comma-separated list of IPs to hard-block at the edge of the app.
// Useful for quickly cutting off an IP that's actively attacking without a
// redeploy of anything else.
const BLOCKED_IPS = (process.env.BLOCKED_IPS || "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

function ipBlocklist(req, res, next) {
  if (BLOCKED_IPS.length && BLOCKED_IPS.includes(req.ip)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  next();
}

// ── CORS allowlist ───────────────────────────────────────────────────────
// Restricts which origins may call the API/sockets. Defaults cover the
// production frontend + common preview domains; add more via ALLOWED_ORIGINS
// (comma-separated) without touching code.
const DEFAULT_ORIGINS = [
  "https://gemtide.win",
  "https://www.gemtide.win",
];

const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = [...DEFAULT_ORIGINS, ...EXTRA_ORIGINS];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Replit dev domain for local preview
  if (process.env.REPLIT_DEV_DOMAIN && origin.includes(process.env.REPLIT_DEV_DOMAIN)) return true;
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/localhost(:\d+)?$/i.test(origin)) return true;
  return false;
}

/**
 * Extract the trusted origin from available headers.
 * Browser requests from the frontend (Cloudflare Pages → api.gemtide.win) are
 * cross-origin and always carry an Origin header.  The Referer fallback covers
 * edge cases where Origin is stripped (e.g. same-origin navigations, some
 * server-side health-check clients).
 */
function resolveRequestOrigin(req) {
  const origin = req.headers.origin;
  if (origin) return origin;

  // Referer fallback — covers requests where Origin is absent.
  const referer = req.headers.referer || req.headers.referrer;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {}
  }
  return null;
}

/**
 * Origin guard — runs before all routes.
 * Allows a request if:
 *   1. Browser request from an approved origin (checked via Origin or Referer), OR
 *   2. Roblox / internal bot request carrying the shared JWT secret as Bearer token, OR
 *   3. Discord-bot announce request carrying the correct x-announce-secret header.
 * Everything else gets a hard 403.
 */
function originGuard(req, res, next) {
  const effectiveOrigin = resolveRequestOrigin(req);

  // Approved browser origin (direct or via Vercel proxy with Referer)
  if (effectiveOrigin && isAllowedOrigin(effectiveOrigin)) return next();

  // Discord bot → /bot-announce with the announce secret
  const announceSecret = process.env.ANNOUNCE_SECRET;
  if (
    announceSecret &&
    req.headers["x-announce-secret"] === announceSecret &&
    req.path === "/bot-announce"
  ) return next();

  // Roblox game scripts → any route, authenticated with the shared JWT secret
  // Accept both "Bearer <token>" (standard) and raw "<token>" (Lua executor format)
  const { jwt_secret } = require("../config.js");
  const auth = req.headers.authorization || "";
  if (auth === `Bearer ${jwt_secret}` || auth === jwt_secret) return next();

  return res.status(403).json({ message: "Forbidden" });
}

const corsOptions = {
  origin(origin, callback) {
    // Pass false (not an Error) for disallowed origins so Express doesn't
    // convert it into a 500. The originGuard middleware that runs after CORS
    // will return a clean 403 for anything that shouldn't be here.
    // When origin is absent (same-origin Vercel proxy) treat it as the
    // allowed gemtide.win origin so CORS headers are still emitted correctly.
    if (!origin) return callback(null, true);
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
};

// ── Rate limiters ────────────────────────────────────────────────────────
// Layered so cheap/public reads stay generous while expensive or sensitive
// mutations get squeezed hard. Every limiter uses standard RateLimit-* headers
// and returns 429 with Retry-After so well-behaved clients back off cleanly.
function makeLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: message || "Too many requests, slow down." },
  });
}

// Global ceiling — catches anything not covered by a more specific limiter.
// Tightened to 60/min to blunt volumetric floods before they reach route handlers.
const globalLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests. Please wait a moment and try again.",
});

// Login/auth is the highest-value brute-force target — keep it tight.
const authLimiter = makeLimiter({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: "Too many login attempts. Please wait a few minutes and try again.",
});

// Game creation/joining/cancelling — real money-ish actions that touch the
// DB and can be spammed to grief matchmaking or exhaust inventory locks.
const mutationLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: "You're doing that too often. Please slow down.",
});

// Withdrawals/deposits/tips — lower ceiling, these are the most sensitive
// balance-changing actions.
const sensitiveLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many requests to a sensitive endpoint. Please wait and try again.",
});

// Admin panel — already behind auth + isAdmin, but still rate-limit in case
// an admin token leaks or is brute-forced.
const adminLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many admin requests. Please slow down.",
});

// Public read-only endpoints (game lists, leaderboard, stats). Generous enough
// for normal browser polling but stops scrapers from hammering constantly.
const readLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests. Please slow down.",
});

// ── Progressive slow-down ────────────────────────────────────────────────
// Adds increasing latency to an IP once it crosses a threshold, before the
// hard rate-limit kicks in. Lower threshold (40→) means automated flooders
// feel back-pressure sooner without hurting normal users who burst briefly.
const speedLimiter = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 40,
  delayMs: (hits) => hits * 120,
  maxDelayMs: 8000,
});

module.exports = {
  ipBlocklist,
  corsOptions,
  isAllowedOrigin,
  originGuard,
  globalLimiter,
  authLimiter,
  mutationLimiter,
  sensitiveLimiter,
  adminLimiter,
  readLimiter,
  speedLimiter,
};
