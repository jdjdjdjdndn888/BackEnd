import { Search, ChevronDown, RefreshCw } from "lucide-react";

// Mock inventory items (user's items to bet)
const INVENTORY = [
  { name: "Huge Cat",       value: 3200, img: "🐱" },
  { name: "Titanic Corgi",  value: 800,  img: "🐶" },
  { name: "Massive Eagle",  value: 950,  img: "🦅" },
  { name: "Golden Panda",   value: 450,  img: "🐼" },
  { name: "Huge Dragon",    value: 2100, img: "🐉" },
  { name: "Huge Bunny",     value: 1400, img: "🐰" },
];

// Mock target items (what they can upgrade to)
const TARGETS = [
  { name: "Titanic Dog",    value: 12000, img: "🐕" },
  { name: "Huge Elephant",  value: 6800,  img: "🐘" },
  { name: "Massive Lion",   value: 4900,  img: "🦁" },
  { name: "Huge Whale",     value: 3800,  img: "🐳" },
  { name: "Titanic Parrot", value: 9200,  img: "🦜" },
  { name: "Huge Penguin",   value: 2800,  img: "🐧" },
];

const selectedItem = INVENTORY[0]; // Huge Cat selected
const targetItem = TARGETS[0];     // Titanic Dog selected
const winChance = Math.min(90, Math.round((selectedItem.value / targetItem.value) * 100)); // 26%

// Arc SVG helper
const WinArc = ({ pct }: { pct: number }) => {
  const r = 72;
  const stroke = 8;
  const cx = 90, cy = 90;
  const circumference = 2 * Math.PI * r;
  const filled = (pct / 100) * circumference;
  const color = pct >= 70 ? "#4ade80" : pct >= 40 ? "#facc15" : "#f87171";
  return (
    <svg width={180} height={180} viewBox="0 0 180 180">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      {/* Fill */}
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      {/* Center text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#fff" fontSize="28" fontWeight="800" fontFamily="system-ui">{pct}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#555" fontSize="11" fontFamily="system-ui" letterSpacing="1">WIN CHANCE</text>
    </svg>
  );
};

const ItemCard = ({ item, selected, winPct }: { item: typeof INVENTORY[0]; selected?: boolean; winPct?: number }) => (
  <div style={{
    background: selected ? "#1a1a1a" : "#111",
    border: `1px solid ${selected ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.07)"}`,
    borderRadius: 8, padding: "10px 8px", cursor: "pointer", textAlign: "center",
    transition: "border-color 0.15s",
    outline: selected ? "1px solid rgba(255,255,255,0.15)" : "none",
    outlineOffset: 2,
  }}>
    <div style={{ fontSize: 28, marginBottom: 4 }}>{item.img}</div>
    <div style={{ fontSize: 11, fontWeight: 600, color: selected ? "#fff" : "#ccc", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
    {winPct !== undefined
      ? <div style={{ fontSize: 10, color: winPct >= 70 ? "#4ade80" : winPct >= 40 ? "#facc15" : "#f87171", fontWeight: 700 }}>{winPct}% win</div>
      : <div style={{ fontSize: 10, color: "#555", fontVariantNumeric: "tabular-nums" }}>{item.value.toLocaleString()}</div>
    }
  </div>
);

export function Upgrader() {
  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0c", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Upgrader</span>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
        {[["Your Items", "6"], ["Bet Value", "3,200"], ["Targets", "6"]].map(([label, val], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span style={{ color: "#555" }}>{label}</span>
            <span style={{ color: "#fff", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{val}</span>
            {i < 2 && <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.07)", marginLeft: 6 }} />}
          </div>
        ))}
      </div>

      {/* ── Three-column layout ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 200px 1fr", minHeight: 0 }}>

        {/* LEFT — Your inventory */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 10 }}>Your Items</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 10px" }}>
              <Search size={13} color="#555" />
              <input placeholder="Search..." style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 12, outline: "none" }} />
            </div>
          </div>
          <div style={{ flex: 1, padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, alignContent: "start" }}>
            {INVENTORY.map((item, i) => (
              <ItemCard key={i} item={item} selected={i === 0} />
            ))}
          </div>
        </div>

        {/* CENTER — Arc + button */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", gap: 20, borderRight: "1px solid rgba(255,255,255,0.07)" }}>
          <WinArc pct={winChance} />

          {/* Selected summary */}
          <div style={{ width: "100%", background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Betting</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>{selectedItem.img}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{selectedItem.name}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{selectedItem.value.toLocaleString()} val</div>
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />
            <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>For</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>{targetItem.img}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{targetItem.name}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{targetItem.value.toLocaleString()} val</div>
              </div>
            </div>
          </div>

          <button style={{ width: "100%", height: 44, background: "#fff", color: "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <RefreshCw size={15} />
            Upgrade!
          </button>
          <div style={{ fontSize: 11, color: "#444", textAlign: "center" }}>Provably fair · Max 90%</div>
        </div>

        {/* RIGHT — Target items */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 10 }}>Targets</div>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 10px" }}>
                <Search size={13} color="#555" />
                <input placeholder="Search..." style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 12, outline: "none" }} />
              </div>
              <button style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#666", background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
                Val <ChevronDown size={11} />
              </button>
            </div>
          </div>
          <div style={{ flex: 1, padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, alignContent: "start" }}>
            {TARGETS.map((item, i) => {
              const pct = Math.min(90, Math.round((selectedItem.value / item.value) * 100));
              return <ItemCard key={i} item={item} selected={i === 0} winPct={pct} />;
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
