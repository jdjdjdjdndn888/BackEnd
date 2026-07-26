// In dev, Vite proxies "" (empty string relative) → localhost:3001 via vite.config.js.
// In prod (Cloudflare Pages / any static host), calls go directly to api.gemtide.win.
// Override either with VITE_API_URL at build time.
export const api = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "" : "https://api.gemtide.win");

const DISCORD_CLIENT_ID    = "1522604409669025793";
const DISCORD_REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI ||
  "https://gemtide.win/discord/linked";

export const discordOAuthURL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;

export const alert = (msg) => window.alert(msg);
