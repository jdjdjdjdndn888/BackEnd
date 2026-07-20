/**
 * IP reputation checks for affiliate abuse prevention.
 *
 * Uses proxycheck.io (free tier — 100 queries/day without a key).
 * Set PROXYCHECK_API_KEY in environment for 1 000 queries/day on the free plan.
 *
 * checkVpnOrProxy(ip) → { isVpn: bool, type: string|null, error: bool }
 */

const axios = require("axios");

const PROXYCHECK_KEY = process.env.PROXYCHECK_API_KEY || "";
const TIMEOUT_MS     = 4_000; // don't hold up the user for more than 4 s

// Simple in-process cache so repeated checks for the same IP within the same
// server process don't burn extra quota.
const cache = new Map(); // ip → { result, expiresAt }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheGet(ip) {
  const entry = cache.get(ip);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.result;
}
function cacheSet(ip, result) {
  // Keep the map bounded
  if (cache.size > 2_000) {
    const first = cache.keys().next().value;
    cache.delete(first);
  }
  cache.set(ip, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Checks whether an IP address is a known VPN, proxy, or hosting provider.
 * @param {string} ip - The client IP address.
 * @returns {Promise<{ isVpn: boolean, type: string|null, error: boolean }>}
 */
async function checkVpnOrProxy(ip) {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    // Local / private range — never flag as VPN in dev
    return { isVpn: false, type: null, error: false };
  }

  const cached = cacheGet(ip);
  if (cached) return cached;

  try {
    const keyParam = PROXYCHECK_KEY ? `&key=${PROXYCHECK_KEY}` : "";
    const url      = `https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=1&asn=1${keyParam}`;
    const { data } = await axios.get(url, { timeout: TIMEOUT_MS });

    if (!data || data.status !== "ok") {
      // Treat API failures as "unknown" — don't hard-block on API outages
      const err = { isVpn: false, type: null, error: true };
      cacheSet(ip, err);
      return err;
    }

    const ipData = data[ip] || {};
    const isVpn  = ipData.proxy === "yes";
    const type   = ipData.type   || null; // "VPN", "Tor", "SOCKS4/5", "HTTP", etc.
    const result = { isVpn, type, error: false };
    cacheSet(ip, result);
    return result;
  } catch (err) {
    // Network timeout or any other error — fail open so legit users aren't blocked
    const fallback = { isVpn: false, type: null, error: true };
    cacheSet(ip, fallback);
    return fallback;
  }
}

/**
 * Extracts the real client IP from the Express request object.
 * Works with trust-proxy set to 2 (our current setting).
 */
function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

module.exports = { checkVpnOrProxy, getClientIp };
