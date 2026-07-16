// Always use the relative /api path so all HTTP calls are proxied through
// Vercel server-side — the backend URL never appears in the browser network tab.
// In dev, Vite proxies /api → localhost:3001.
// In prod, Vercel proxies /api → api.gemtide.win (via vercel.json routes).
export const api = import.meta.env.VITE_API_URL || "/api";

const DISCORD_CLIENT_ID    = "1522604409669025793";
const DISCORD_REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI ||
  "https://gemtide.win/discord/linked";

export const discordOAuthURL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;

export const alert = (msg) => window.alert(msg);
