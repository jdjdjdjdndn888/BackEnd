// These are the only game routes currently available on the Cloudflare backend.
// Keep navigation and direct-route handling aligned with the Worker allowlist.
export const ENABLED_GAME_ROUTES = [
  { label: "Coinflip", href: "/coinflip", img: "/nav-coinflip.png" },
  { label: "Dice", href: "/dice", img: "/nav-dice.png" },
  { label: "Jackpot", href: "/jackpot", img: "/nav-jackpot.png" },
  { label: "Color Dice", href: "/colordice", img: "/nav-colordice.svg", badge: "NEW" },
  { label: "RPS", href: "/rps", img: "/nav-rps.png" },
];

export const DISABLED_GAME_ROUTES = [
  { label: "Blackjack", href: "/blackjack", img: "/nav-blackjack-1v1.svg" },
  { label: "Upgrader", href: "/upgrader", img: "/nav-upgrader.png" },
  { label: "Trades", href: "/trades", img: "/nav-trades.png" },
  { label: "Mines", href: "/mines", img: "/mines-gem.png" },
];