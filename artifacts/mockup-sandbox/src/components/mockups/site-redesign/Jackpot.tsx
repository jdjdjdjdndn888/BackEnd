import { Timer, TrendingUp } from "lucide-react";

const rbx = (userId: number) =>
  `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;

const RbxAvatar = ({ userId, size = 30, color }: { userId: number; size?: number; color: string }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: `2px solid ${color}`, flexShrink: 0 }}>
    <img src={rbx(userId)} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  </div>
);

const PLAYERS = [
  { name: "DragonSlayer99", userId: 156,      color: "#e74c3c", items: "14 items", pct: "33.6%" },
  { name: "HugeCatKing",    userId: 4178,     color: "#3498db", items: "9 items",  pct: "26.0%" },
  { name: "TitanicCorgi",   userId: 261,      color: "#2ecc71", items: "6 items",  pct: "16.8%" },
  { name: "PS99Master",     userId: 2470023,  color: "#f39c12", items: "4 items",  pct: "11.9%" },
  { name: "GemHunter",      userId: 55549240, color: "#9b59b6", items: "3 items",  pct: "7.6%"  },
  { name: "LuckyPet007",    userId: 1,        color: "#1abc9c", items: "2 items",  pct: "4.1%"  },
];

const TOTAL_ITEMS = "38 items";
const COUNTDOWN = "0:18";

export function Jackpot() {
  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0c", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Jackpot</span>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 13, color: "#888" }}>Round #1,247</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "7px 14px" }}>
          <Timer size={13} color="#888" />
          <span style={{ fontSize: 13, color: "#fff", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>Draws in {COUNTDOWN}</span>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 65px)" }}>

        {/* LEFT — Wheel + Bet */}
        <div style={{ flex: "0 0 58%", padding: "40px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center", borderRight: "1px solid rgba(255,255,255,0.07)" }}>

          {/* Wheel */}
          <div style={{ position: "relative", width: 260, height: 260, marginBottom: 32 }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: `conic-gradient(
                ${PLAYERS[0].color}55 0% 33.6%,
                ${PLAYERS[1].color}55 33.6% 59.6%,
                ${PLAYERS[2].color}55 59.6% 76.4%,
                ${PLAYERS[3].color}55 76.4% 88.3%,
                ${PLAYERS[4].color}55 88.3% 95.9%,
                ${PLAYERS[5].color}55 95.9% 100%
              )`,
              border: "5px solid rgba(255,255,255,0.06)"
            }} />
            <div style={{
              position: "absolute", inset: 22, borderRadius: "50%",
              background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
            }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", marginBottom: 6 }}>Total Pot</div>
              <div style={{ fontSize: 34, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{TOTAL_ITEMS}</div>
            </div>
            {/* Arrow */}
            <div style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "14px solid #fff" }} />
          </div>

          {/* Bet button */}
          <button style={{ width: "100%", maxWidth: 320, height: 52, background: "#fff", color: "#000", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em" }}>
            Place a Bet
          </button>
          <div style={{ marginTop: 10, fontSize: 12, color: "#444" }}>
            Min 1 item · No value cap
          </div>

          {/* Quick stats */}
          <div style={{ marginTop: 32, display: "flex", gap: 32, width: "100%", maxWidth: 320 }}>
            {[["Players", "6"], ["Items", "38"], ["Rounds", "1,247"]].map(([label, val], i) => (
              <>
                {i > 0 && <div key={`d${i}`} style={{ width: 1, background: "rgba(255,255,255,0.07)" }} />}
                <div key={label} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{val}</div>
                </div>
              </>
            ))}
          </div>
        </div>

        {/* RIGHT — Entries */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Entries (6)</span>
            <TrendingUp size={13} color="#555" />
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {PLAYERS.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 20px",
                borderLeft: `3px solid ${p.color}`,
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <RbxAvatar userId={p.userId} color={p.color} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{p.items}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: p.color, fontVariantNumeric: "tabular-nums" }}>{p.pct}</div>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: p.pct, background: p.color, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#444" }}>Your Win Chance</span>
            <span style={{ fontSize: 12, color: "#444" }}>— Login to bet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
