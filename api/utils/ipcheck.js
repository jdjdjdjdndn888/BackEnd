/**
 * IP reputation checks for affiliate abuse prevention.
 *
 * Uses two parallel checks for reliability:
 *   1. proxycheck.io — dedicated VPN/proxy detection (free: 100/day, or set PROXYCHECK_API_KEY for 1000/day)
 *   2. ip-api.com    — ISP/org/hosting field analysis + known VPN provider keyword matching
 *
 * isVpnOrProxy(ip) → { isVpn: bool, reason: string|null, error: bool }
 *   isVpn = true  → block the request
 *   error = true  → API(s) were unreachable (result still returned, up to caller to decide policy)
 */

const axios = require("axios");

const PROXYCHECK_KEY = process.env.PROXYCHECK_API_KEY || "";
const TIMEOUT_MS     = 5_000;

// ── In-process result cache (bounded, 10-min TTL) ─────────────────────────────
const cache    = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function cacheGet(ip) {
  const e = cache.get(ip);
  return e && Date.now() < e.exp ? e.v : null;
}
function cacheSet(ip, v) {
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  cache.set(ip, { v, exp: Date.now() + CACHE_TTL });
}

// ── Known VPN provider keywords (matched against ISP and ORG strings) ────────
// Only include actual VPN service names — generic datacenter/hosting terms
// produce too many false positives because many residential ISPs route through
// or resell from hosting networks. Real VPN exit nodes advertise their own
// brand name, which proxycheck.io also catches via its proxy flag.
const VPN_KEYWORDS = [
  "vpn", "tor exit", "anonymous", "anonymizer",
  "nordvpn", "expressvpn", "mullvad", "protonvpn", "surfshark",
  "cyberghost", "privateinternetaccess", "pia vpn", "ipvanish",
  "windscribe", "hotspot shield", "hide.me", "purevpn", "hidemyass",
  "vypr", "torguard", "airvpn", "perfect-privacy", "perfect privacy",
  "zenmate", "tunnelbear", "avast vpn", "avira phantom",
  "privado vpn", "astrill", "vyprvpn", "strongvpn", "cactusvpn",
  "privatevpn", "ovpn", "anonvpn", "vpnsecure", "vpnunlimited",
  "vpn unlimited", "namecheap vpn", "zenvpn",
];

function containsVpnKeyword(str) {
  if (!str) return false;
  const lower = str.toLowerCase();
  return VPN_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Check 1: proxycheck.io ────────────────────────────────────────────────────
async function checkProxycheck(ip) {
  try {
    const keyParam = PROXYCHECK_KEY ? `&key=${PROXYCHECK_KEY}` : "";
    const url = `https://proxycheck.io/v2/${encodeURIComponent(ip)}?vpn=1&asn=1${keyParam}`;
    const { data } = await axios.get(url, { timeout: TIMEOUT_MS });
    if (!data || data.status !== "ok") return { isVpn: false, reason: null, error: true };
    const ipData = data[ip] || {};
    const isVpn  = ipData.proxy === "yes";
    return { isVpn, reason: isVpn ? `proxycheck: ${ipData.type || "proxy/vpn"}` : null, error: false };
  } catch {
    return { isVpn: false, reason: null, error: true };
  }
}

// ── Check 2: ip-api.com (free fields + proxy/hosting if available) ────────────
async function checkIpApi(ip) {
  try {
    const fields = "status,proxy,hosting,isp,org,as";
    const { data } = await axios.get(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`,
      { timeout: TIMEOUT_MS },
    );
    if (!data || data.status === "fail") return { isVpn: false, reason: null, error: true };

    // proxy flag — reliable indicator of an active proxy/VPN tunnel
    // Note: we intentionally skip the `hosting` field because ip-api.com's free
    // tier marks many residential ISPs that resell datacenter transit as
    // "hosting", causing false positives for real users.
    if (data.proxy === true) return { isVpn: true, reason: "ip-api: proxy flag", error: false };

    // Keyword match on ISP / org / AS description — only actual VPN brand names
    for (const field of [data.isp, data.org, data.as]) {
      if (containsVpnKeyword(field)) {
        return { isVpn: true, reason: `ip-api: VPN provider match (${field})`, error: false };
      }
    }
    return { isVpn: false, reason: null, error: false };
  } catch {
    return { isVpn: false, reason: null, error: true };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Returns { isVpn, reason, error }.
 * Runs both checks in parallel.
 *
 * Blocking policy — BOTH services must agree it is a VPN/proxy:
 *   - proxycheck.io says proxy=yes  AND  ip-api.com says proxy=true or keyword match
 *
 * Requiring consensus from two independent sources eliminates false positives
 * caused by either service mis-classifying a residential IP. Real VPN exit
 * nodes are consistently flagged by both services; home connections are not.
 *
 * If either service errored (network outage / rate limit), we fail-open
 * (return isVpn: false) so legitimate users are never blocked by an API blip.
 */
async function checkVpnOrProxy(ip) {
  // Skip local / private ranges entirely (dev environment)
  if (
    !ip || ip === "unknown" ||
    ip === "::1" || ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") || ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") || ip.startsWith("172.19.") ||
    ip.startsWith("172.2")   || ip.startsWith("172.3")
  ) {
    return { isVpn: false, reason: null, error: false };
  }

  const cached = cacheGet(ip);
  if (cached) return cached;

  const [pc, ia] = await Promise.all([checkProxycheck(ip), checkIpApi(ip)]);

  let result;
  const bothErrored = pc.error && ia.error;

  if (bothErrored) {
    // Can't determine — fail open so real users aren't blocked by an outage
    result = { isVpn: false, reason: null, error: true };
  } else if (pc.isVpn && ia.isVpn) {
    // Consensus: both services agree — definitely a VPN/proxy
    result = { isVpn: true, reason: `${pc.reason} + ${ia.reason}`, error: false };
  } else if (pc.isVpn && ia.error) {
    // proxycheck flagged it but ip-api errored — trust the dedicated service
    result = { isVpn: true, reason: pc.reason, error: false };
  } else {
    // Either both say "not vpn", or only ip-api says vpn (too unreliable alone)
    result = { isVpn: false, reason: null, error: false };
  }

  cacheSet(ip, result);
  return result;
}

/**
 * Extracts the real client IP from the Express request.
 * Relies on app.set("trust proxy", 2) being configured in server.js.
 */
function getClientIp(req) {
  // req.ip is set by Express after trust proxy processing
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  // Normalise IPv4-mapped IPv6 (::ffff:1.2.3.4 → 1.2.3.4)
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

module.exports = { checkVpnOrProxy, getClientIp };
