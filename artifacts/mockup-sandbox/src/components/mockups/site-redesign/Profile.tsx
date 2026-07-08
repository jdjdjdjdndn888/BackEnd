import { MessageCircle, BarChart2, Clock, Edit2 } from "lucide-react";

const rbx = (userId: number) =>
  `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;

// The profile being viewed
const USER = { name: "DragonSlayer99", userId: 156, discordTag: "DragonSlayer#0001", rank: "Member", since: "July 2025", id: "7f3a92b1" };

const GAMES = [
  { name: "Coinflip",  wagered: "54 items", winRate: 0.61 },
  { name: "Jackpot",   wagered: "38 items", winRate: 0.44 },
  { name: "Upgrader",  wagered: "19 items", winRate: 0.52 },
  { name: "Dice",      wagered: "12 items", winRate: 0.38 },
];

const HISTORY = [
  { time: "2h ago",  game: "Coinflip", result: "won",  desc: "+Huge Cat"        },
  { time: "3h ago",  game: "Jackpot",  result: "lost", desc: "−3 Massive Eagles" },
  { time: "5h ago",  game: "Upgrader", result: "won",  desc: "+Titanic Corgi"    },
  { time: "8h ago",  game: "Dice",     result: "lost", desc: "−Golden Panda"     },
  { time: "12h ago", game: "Coinflip", result: "won",  desc: "+Huge Bunny"       },
];

const TABS = ["General", "Statistics", "History"];

export function Profile() {
  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0c", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* ── Profile Header Card ── */}
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "24px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Roblox avatar */}
            <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: "2px solid rgba(255,255,255,0.12)", flexShrink: 0 }}>
              <img src={rbx(USER.userId)} alt={USER.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>{USER.name}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#1e1e1e", color: "#888", border: "1px solid rgba(255,255,255,0.08)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{USER.rank}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#888" }}>
                <MessageCircle size={13} />
                {USER.discordTag}
              </div>
              <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>ID: {USER.id}</div>
            </div>

            <button style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "7px 14px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, background: "transparent", color: "#888", cursor: "pointer" }}>
              <Edit2 size={12} />
              Edit Profile
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 28 }}>
          {TABS.map((tab, i) => (
            <button key={tab} style={{
              fontSize: 13, fontWeight: i === 1 ? 600 : 400,
              color: i === 1 ? "#fff" : "#555",
              background: "transparent", border: "none",
              borderBottom: i === 1 ? "2px solid #fff" : "2px solid transparent",
              padding: "10px 18px", cursor: "pointer", marginBottom: -1
            }}>{tab}</button>
          ))}
        </div>

        {/* ── Stats Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
          {[
            { label: "Wagered", value: "123 items", color: "#fff"    },
            { label: "Won",     value: "74 items",  color: "#4ade80" },
            { label: "Lost",    value: "49 items",  color: "#f87171" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "22px 20px", background: "#111", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none", textAlign: "center" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── By Game ── */}
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart2 size={13} color="#555" />
            <span style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>By Game</span>
          </div>
          {GAMES.map((g, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px", borderBottom: i < GAMES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ width: 80, fontSize: 13, color: "#fff", fontWeight: 500 }}>{g.name}</div>
              <div style={{ fontSize: 13, color: "#888", minWidth: 72 }}>{g.wagered}</div>
              <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${g.winRate * 100}%`, background: "rgba(255,255,255,0.4)", borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 12, color: "#888", minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(g.winRate * 100)}%</div>
            </div>
          ))}
        </div>

        {/* ── Recent Activity ── */}
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", marginBottom: 32 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={13} color="#555" />
            <span style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Recent Activity</span>
          </div>
          {HISTORY.map((h, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "11px 20px",
              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              borderBottom: i < HISTORY.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none"
            }}>
              <div style={{ fontSize: 12, color: "#444", minWidth: 52 }}>{h.time}</div>
              <div style={{ fontSize: 13, color: "#888", flex: 1 }}>{h.game}</div>
              <div style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: h.result === "won" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", color: h.result === "won" ? "#4ade80" : "#f87171", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{h.result}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: h.result === "won" ? "#4ade80" : "#f87171", minWidth: 110, textAlign: "right" }}>{h.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: "#333" }}>Member since {USER.since}</div>
      </div>
    </div>
  );
}
