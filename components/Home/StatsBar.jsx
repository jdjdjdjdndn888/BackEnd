import { Users, Trophy, Zap, TrendingUp } from "lucide-react";

const STATS = [
  { key: "online",  label: "Online Now",    icon: Users,      color: "#3AFF4E" },
  { key: "games",   label: "Games Played",  icon: Zap,        color: "#8B5CF6" },
  { key: "winners", label: "Total Winners", icon: Trophy,     color: "#f59e0b" },
  { key: "wagered", label: "Total Wagered", icon: TrendingUp, color: "#60a5fa" },
];

function formatStat(value, key) {
  if (key === "wagered") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
    if (value >= 1_000)    return `${(value / 1_000).toFixed(0)}K+`;
  }
  return value != null ? `${value.toLocaleString()}+` : "—";
}

/**
 * @param {{ onlineCount: number }} props
 */
export function StatsBar({ onlineCount = 0 }) {
  const stats = {
    online:  onlineCount,
    games:   14287,
    winners: 3941,
    wagered: 2480000,
  };

  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STATS.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="flex items-center gap-3 rounded-xl border border-[#1e2035] bg-[#12141f] px-4 py-3"
        >
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight text-white">
              {key === "online" ? onlineCount : formatStat(stats[key], key)}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase leading-tight tracking-widest text-[#42496B]">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
