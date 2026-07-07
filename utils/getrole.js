/**
 * Level-to-rank progression system.
 * Each tier has: min level, name, color, perks, nextTierLevel, nextTierName.
 */
export const LEVEL_TIERS = [
  {
    minLevel: 0,
    name: "User",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.25)",
    nextLevel: 5,
    nextName: "Bronze",
    perks: ["Access to all basic games", "Standard chat access", "Join giveaways"],
  },
  {
    minLevel: 5,
    name: "Bronze",
    color: "#cd7f32",
    bg: "rgba(205,127,50,0.12)",
    border: "rgba(205,127,50,0.25)",
    nextLevel: 10,
    nextName: "Silver",
    perks: ["Bronze badge in chat", "Priority giveaway entries", "Early event access"],
  },
  {
    minLevel: 10,
    name: "Silver",
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.12)",
    border: "rgba(156,163,175,0.25)",
    nextLevel: 20,
    nextName: "Gold",
    perks: ["Silver badge in chat", "Bonus multipliers on wins", "VIP chat access"],
  },
  {
    minLevel: 20,
    name: "Gold",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
    nextLevel: 30,
    nextName: "HighRoller",
    perks: ["Gold badge in chat", "Exclusive Gold giveaways", "VIP support"],
  },
  {
    minLevel: 30,
    name: "HighRoller",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.25)",
    nextLevel: 50,
    nextName: "Whale",
    perks: ["HighRoller badge", "Exclusive HighRoller giveaways", "Custom chat color", "2% cashback on losses"],
  },
  {
    minLevel: 50,
    name: "Whale",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    border: "rgba(236,72,153,0.25)",
    nextLevel: 75,
    nextName: "Diamond",
    perks: ["Whale badge", "Custom avatar frame", "5% cashback on losses", "Dedicated support"],
  },
  {
    minLevel: 75,
    name: "Diamond",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    border: "rgba(6,182,212,0.25)",
    nextLevel: 100,
    nextName: "Legend",
    perks: ["Diamond badge", "Exclusive Diamond giveaways", "7% cashback on losses", "Featured profile"],
  },
  {
    minLevel: 100,
    name: "Legend",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.25)",
    nextLevel: null,
    nextName: null,
    perks: ["Legend badge", "10% cashback on losses", "Max giveaway priority", "Dedicated account manager"],
  },
];

/** Special admin/mod/owner ranks */
const SPECIAL_RANKS = {
  OWNER: { name: "Owner", color: "#FF4757", bg: "rgba(255,71,87,0.12)", border: "rgba(255,71,87,0.25)", nextLevel: null, nextName: null, perks: [] },
  ADMIN: { name: "Admin", color: "#FF6B35", bg: "rgba(255,107,53,0.12)", border: "rgba(255,107,53,0.25)", nextLevel: null, nextName: null, perks: [] },
  MODERATOR: { name: "Moderator", color: "#3AFF4E", bg: "rgba(58,255,78,0.12)", border: "rgba(58,255,78,0.25)", nextLevel: null, nextName: null, perks: [] },
};

/**
 * Get the tier info for a given level.
 * @param {number} level
 * @returns {(typeof LEVEL_TIERS)[number]}
 */
export function getTierForLevel(level) {
  const lvl = typeof level === "number" ? level : 0;
  let current = LEVEL_TIERS[0];
  for (const tier of LEVEL_TIERS) {
    if (lvl >= tier.minLevel) current = tier;
    else break;
  }
  return current;
}

/**
 * Get progress percentage within the current tier.
 * @param {number} level
 * @returns {{ pct: number, tier: object }}
 */
export function getLevelProgress(level) {
  const lvl = typeof level === "number" ? level : 0;
  const tier = getTierForLevel(lvl);
  if (!tier.nextLevel) return { pct: 100, tier };
  const pct = Math.min(100, Math.round(((lvl - tier.minLevel) / (tier.nextLevel - tier.minLevel)) * 100));
  return { pct, tier };
}

/**
 * @param {string} rank - backend rank string ("OWNER","ADMIN","MODERATOR", or anything else)
 * @param {number} level - numeric level from userData
 * @returns {{ name: string, color: string, bg: string, border: string, image: string|null, nextLevel: number|null, nextName: string|null, perks: string[] }}
 */
export function getrole(rank, level) {
  // Special overrides for staff
  if (rank && SPECIAL_RANKS[rank]) {
    const s = SPECIAL_RANKS[rank];
    return { ...s, image: null };
  }

  const lvl = typeof level === "number" ? level : 0;
  const tier = getTierForLevel(lvl);
  return {
    name: tier.name,
    color: tier.color,
    bg: tier.bg,
    border: tier.border,
    image: null,
    nextLevel: tier.nextLevel,
    nextName: tier.nextName,
    perks: tier.perks,
  };
}
