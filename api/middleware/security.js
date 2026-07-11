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
  if (!origin) return true; // non-browser clients (curl, bots, server-to-server)
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // allow Vercel preview deployments for this project (*.vercel.app)
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/localhost(:\d+)?$/i.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
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
  globalLimiter,
  authLimiter,
  mutationLimiter,
  sensitiveLimiter,
  adminLimiter,
  speedLimiter,
};
