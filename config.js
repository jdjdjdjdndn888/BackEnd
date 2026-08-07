// The same Cloudflare Worker serves the SPA, D1 API, and Durable Object
// realtime endpoint. Keeping these relative makes preview and production use
// the same origin without a Node API or a proxy.
export const api = "/api";
export const realtimePath = "/realtime";
export const realtimeUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${realtimePath}`;
};

const DISCORD_CLIENT_ID    = "1522604409669025793";
const DISCORD_REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI ||
  "https://gemtide.win/discord/linked";

export const discordOAuthURL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;

export const alert = (msg) => window.alert(msg);
