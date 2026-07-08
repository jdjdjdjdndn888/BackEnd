import { Plus, ChevronDown, Clock, RotateCcw } from "lucide-react";

const rooms = [
  { id: 1, player: { name: "DragonSlayer99", color: "#e74c3c", value: "4,200" }, age: "2m ago", total: "4,200", items: 12 },
  { id: 2, player: { name: "HugeCatKing", color: "#3498db", value: "1,850" }, age: "5m ago", total: "1,850", items: 6 },
  { id: 3, player: { name: "PS99Master", color: "#2ecc71", value: "12,500" }, age: "1m ago", total: "12,500", items: 31 },
  { id: 4, player: { name: "GemHunter", color: "#f39c12", value: "750" }, age: "8m ago", total: "750", items: 4 },
  { id: 5, player: { name: "TitanicCorgi", color: "#9b59b6", value: "6,000" }, age: "12m ago", total: "6,000", items: 18 },
];

const STAT_DIVIDER = <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)" }} />;

export function Coinflip() {
  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0c", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Coinflip</span>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 13, color: "#888" }}>5 Active Rooms</span>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={14} />
          Create Room
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 24, padding: "0 24px", height: 48, background: "#0c0c0c" }}>
        <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#fff", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>5</span> Rooms</span>
        {STAT_DIVIDER}
        <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#fff", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>25,300</span> Gems Total</span>
        {STAT_DIVIDER}
        <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#fff", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>71</span> Items</span>
      </div>

      {/* ── Filters ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["All", "PS99", "MM2", "Adopt Me"].map((f, i) => (
            <button key={f} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: i === 0 ? "rgba(255,255,255,0.1)" : "transparent", color: i === 0 ? "#fff" : "#666", cursor: "pointer" }}>{f}</button>
          ))}
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#666", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "5px 10px", cursor: "pointer" }}>
          Value <ChevronDown size={12} />
        </button>
      </div>

      {/* ── Room List ── */}
      <div style={{ padding: "0 24px" }}>
        {rooms.map((room, i) => (
          <div key={room.id} style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "16px 0",
            borderBottom: i < rooms.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none"
          }}>
            {/* Player slots */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              {/* Filled slot */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: room.player.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {room.player.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{room.player.name}</div>
                  <div style={{ fontSize: 12, color: "#888", fontVariantNumeric: "tabular-nums" }}>{room.player.value} gems</div>
                </div>
              </div>

              {/* VS */}
              <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.05em" }}>VS</div>
              </div>

              {/* Empty slot */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>?</div>
                <div>
                  <div style={{ fontSize: 13, color: "#444" }}>Waiting...</div>
                  <div style={{ fontSize: 12, color: "#333" }}>Any value</div>
                </div>
              </div>
            </div>

            {/* Center info */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 80 }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{room.total}</div>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>gems</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#555" }}>
                <Clock size={11} />
                {room.age}
              </div>
            </div>

            {/* Join button */}
            <button style={{ fontSize: 12, fontWeight: 600, padding: "8px 18px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, background: "transparent", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
              Join
            </button>
          </div>
        ))}
      </div>

      {/* ── Empty hint ── */}
      <div style={{ padding: "24px", textAlign: "center" }}>
        <span style={{ fontSize: 12, color: "#333" }}>Showing 5 active rooms · <span style={{ color: "#555", cursor: "pointer" }}>Load more</span></span>
      </div>

      {/* ── History row ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 8 }}>
        <RotateCcw size={12} color="#555" />
        <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>Recent Results</span>
        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          {["W","L","W","W","L","W","L","L","W","W"].map((r, i) => (
            <div key={i} style={{ width: 20, height: 20, borderRadius: 3, background: r === "W" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: r === "W" ? "#4ade80" : "#f87171" }}>{r}</div>
          ))}
        </div>
      </div>

    </div>
  );
}
