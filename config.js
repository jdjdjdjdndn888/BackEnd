export const api = import.meta.env.VITE_API_URL || "/api";

const DISCORD_CLIENT_ID    = "1522604409669025793";
const DISCORD_REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI ||
  "https://2f3bf731-3fb0-4d13-abaf-582016465d3e-00-2by5f5cwxr8ic.picard.replit.dev/discord/linked";

export const discordOAuthURL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;

export const alert = (msg) => window.alert(msg);
