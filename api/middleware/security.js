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
  if (!origin) return false; // block all server-to-server / curl requests by default
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Replit dev domain for local preview
  if (process.env.REPLIT_DEV_DOMAIN && origin.includes(process.env.REPLIT_DEV_DOMAIN)) return true;
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/localhost(:\d+)?$/i.test(origin)) return true;
  return false;
}

/**
 * Origin guard — runs before all routes.
 * Allows a request if:
 *   1. Browser request from an approved origin, OR
 *   2. Roblox / internal bot request carrying the shared JWT secret as Bearer token, OR
 *   3. Discord-bot announce request carrying the correct x-announce-secret header.
 * Everything else gets a hard 403.
 */
function originGuard(req, res, next) {
  const origin = req.headers.origin;

  // Approved browser origin
  if (origin && isAllowedOrigin(origin)) return next();

  // Discord bot → /bot-announce with the announce secret
  const announceSecret = process.env.ANNOUNCE_SECRET;
  if (
    announceSecret &&
    req.headers["x-announce-secret"] === announceSecret &&
    req.path === "/bot-announce"
  ) return next();

  // Roblox game scripts → any route, authenticated with the shared JWT secret
  const { jwt_secret } = require("../config.js");
  const auth = req.headers.authorization || "";
  if (auth === `Bearer ${jwt_secret}`) return next();

  return res.status(403).json({ message: "Forbidden" });
}

const corsOptions = {
  origin(origin, callback) {
    // Pass false (not an Error) for disallowed origins so Express doesn't
    // convert it into a 500. The originGuard middleware that runs after CORS
    // will return a clean 403 for anything that shouldn't be here.
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

// Generous global ceiling — catches anything not covered by a more specific
// limiter below and stops a single IP from hammering the whole API.
const globalLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 100,
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
  max: 30,
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

// ── Progressive slow-down ────────────────────────────────────────────────
// Adds increasing latency to an IP once it crosses a threshold, before the
// hard rate-limit kicks in. This blunts automated flooders without
// inconveniencing normal bursts of legitimate traffic.
const speedLimiter = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 60,
  delayMs: (hits) => hits * 100,
  maxDelayMs: 5000,
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
  speedLimiter,
};
