import { Timer, Plus } from "lucide-react";

const rbx = (userId: number) =>
  `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;

const PLAYERS = [
  { name: "DragonSlayer99", userId: 156,      color: "#e85d4a", items: 14, pct: 33.6 },
  { name: "HugeCatKing",    userId: 4178,     color: "#4a9eff", items: 9,  pct: 26.0 },
  { name: "TitanicCorgi",   userId: 261,      color: "#34c77b", items: 6,  pct: 16.8 },
  { name: "PS99Master",     userId: 2470023,  color: "#f5a623", items: 4,  pct: 11.9 },
  { name: "GemHunter",      userId: 55549240, color: "#b57bee", items: 3,  pct:  7.6 },
  { name: "LuckyPet007",    userId: 1,        color: "#4ecdc4", items: 2,  pct:  4.1 },
];

const TOTAL_ITEMS = PLAYERS.reduce((s, p) => s + p.items, 0);

export function Jackpot() {
  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0c", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ══════════════════════════════════════════
          TOP HERO — pot + countdown
      ══════════════════════════════════════════ */}
      <div style={{ padding: "36px 32px 28px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Left: label + round */}
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>Jackpot</div>
          <div style={{ fontSize: 13, color: "#444" }}>Round #1,247</div>
        </div>

        {/* Center: big pot */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", marginBottom: 8 }}>Current Pot</div>
          <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {TOTAL_ITEMS}
          </div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>items across 6 players</div>
        </div>

        {/* Right: countdown */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", marginBottom: 8 }}>Draws In</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            <Timer size={16} color="#888" />
            <span style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums", fontFamily: "monospace" }}>0:18</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PROBABILITY BAR — horizontal colour split
      ══════════════════════════════════════════ */}
      <div style={{ padding: "0 32px" }}>
        {/* Bar */}
        <div style={{ display: "flex", height: 6, overflow: "hidden", borderRadius: "0 0 3px 3px" }}>
          {PLAYERS.map((p) => (
            <div key={p.name} style={{ flex: p.pct, background: p.color, transition: "flex 0.4s ease" }} />
          ))}
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, paddingTop: 10, paddingBottom: 20, flexWrap: "wrap" }}>
          {PLAYERS.map((p) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#666" }}>{p.name.split(/(?=[A-Z])/)[0]}</span>
              <span style={{ fontSize: 11, color: p.color, fontWeight: 700 }}>{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ENTRIES GRID
      ══════════════════════════════════════════ */}
      <div style={{ flex: 1, padding: "0 32px 24px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>Entries</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {PLAYERS.map((p, i) => (
            <div key={i} style={{ background: "#111", padding: "18px 16px", borderLeft: `3px solid ${p.color}`, display: "flex", alignItems: "center", gap: 12 }}>
              {/* Avatar */}
              <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", border: `2px solid ${p.color}`, flexShrink: 0 }}>
                <img src={rbx(p.userId)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{p.items} items</div>
              </div>

              {/* Win % badge */}
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: p.color, fontVariantNumeric: "tabular-nums" }}>{p.pct}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          BET CTA — sticky bottom strip
      ══════════════════════════════════════════ */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <button style={{ flex: 1, height: 48, background: "#fff", color: "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: "0.01em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Plus size={16} />
          Place a Bet
        </button>
        <div style={{ fontSize: 12, color: "#444", flexShrink: 0 }}>Min 1 item · No cap</div>
        <div style={{ fontSize: 12, color: "#444", flexShrink: 0 }}>Your chance: —</div>
      </div>

    </div>
  );
}
