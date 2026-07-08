import { Timer, TrendingUp, Gem } from "lucide-react";

const PLAYERS = [
  { name: "DragonSlayer99", color: "#e74c3c", gems: "6,200", pct: "33.6%" },
  { name: "HugeCatKing",    color: "#3498db", gems: "4,800", pct: "26.0%" },
  { name: "TitanicCorgi",   color: "#2ecc71", gems: "3,100", pct: "16.8%" },
  { name: "PS99Master",     color: "#f39c12", gems: "2,200", pct: "11.9%" },
  { name: "GemHunter",      color: "#9b59b6", gems: "1,400", pct: "7.6%" },
  { name: "LuckyPet007",    color: "#1abc9c", gems: "750",   pct: "4.1%" },
];

const TOTAL = "18,450";
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

      {/* ── Main two-column layout ── */}
      <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 65px)" }}>

        {/* LEFT — Wheel + Bet */}
        <div style={{ flex: "0 0 58%", padding: "40px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
          
          {/* Wheel */}
          <div style={{ position: "relative", width: 260, height: 260, marginBottom: 32 }}>
            {/* Outer ring segments (decorative arcs using conic-gradient) */}
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
            {/* Inner dark circle */}
            <div style={{
              position: "absolute", inset: 22, borderRadius: "50%",
              background: "#0c0c0c",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
            }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", marginBottom: 6 }}>Total Pot</div>
              <div style={{ fontSize: 38, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{TOTAL}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>GEMS</div>
            </div>
            {/* Arrow indicator */}
            <div style={{
              position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
              width: 0, height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "14px solid #fff"
            }} />
          </div>

          {/* Bet button */}
          <button style={{ width: "100%", maxWidth: 320, height: 52, background: "#fff", color: "#000", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em" }}>
            Place a Bet
          </button>
          <div style={{ marginTop: 10, fontSize: 12, color: "#444", display: "flex", alignItems: "center", gap: 6 }}>
            <Gem size={11} />
            Min 10 gems · Max 10,000 gems
          </div>

          {/* Quick stats */}
          <div style={{ marginTop: 32, display: "flex", gap: 32, width: "100%", maxWidth: 320 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 4 }}>Players</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>6</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.07)" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 4 }}>Entries</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>18</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.07)" }} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 4 }}>Rounds</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>1,247</div>
            </div>
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
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {p.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "#888", fontVariantNumeric: "tabular-nums" }}>{p.gems} gems</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: p.color, fontVariantNumeric: "tabular-nums" }}>{p.pct}</div>
                  {/* Win chance bar */}
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: p.pct, background: p.color, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Your chance row */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#444" }}>Your Win Chance</span>
            <span style={{ fontSize: 12, color: "#444" }}>— Login to bet</span>
          </div>
        </div>

      </div>
    </div>
  );
}
