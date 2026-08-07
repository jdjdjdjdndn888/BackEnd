const isDev = import.meta.env.DEV;

// In dev, Vite proxies /api to localhost:3001 via vite.config.js.
// In production, API calls stay same-origin and are expected to be routed by
// the Cloudflare worker/page host.
export const api = import.meta.env.VITE_API_URL || (isDev ? "/api" : "/api");

export const realtimePath =
  import.meta.env.VITE_REALTIME_PATH || "/realtime";
export const realtimeUrl =
  import.meta.env.VITE_REALTIME_URL || (isDev ? "ws://localhost:3001/realtime" : realtimePath);

const DISCORD_CLIENT_ID    = "1522604409669025793";
const DISCORD_REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI ||
  "https://gemtide.win/discord/linked";

export const discordOAuthURL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;

export const alert = (msg) => window.alert(msg);
