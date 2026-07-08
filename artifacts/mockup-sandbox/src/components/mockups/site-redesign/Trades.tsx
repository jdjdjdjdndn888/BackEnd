import { Search, ChevronDown, Plus, ArrowLeftRight } from "lucide-react";

const LISTINGS = [
  {
    owner: "DragonSlayer99",
    ownerColor: "#e74c3c",
    listed: "3h ago",
    offering: [
      { name: "Huge Cat",      value: "3,200" },
      { name: "Titanic Corgi", value: "800"   },
    ],
    lookingFor: "Any Titanic pet or 4,500+ gem equivalent",
    total: "4,000",
    status: null,
  },
  {
    owner: "PS99Master",
    ownerColor: "#3498db",
    listed: "6h ago",
    offering: [
      { name: "Huge Dragon",   value: "2,100" },
      { name: "Massive Eagle", value: "950"   },
      { name: "Golden Panda",  value: "450"   },
    ],
    lookingFor: "Huge Cat or better",
    total: "3,500",
    status: "pending",
  },
  {
    owner: "GemHunter",
    ownerColor: "#2ecc71",
    listed: "1d ago",
    offering: [
      { name: "Titanic Dog",   value: "12,000" },
    ],
    lookingFor: "Best offer — DM me",
    total: "12,000",
    status: null,
  },
  {
    owner: "LuckyPet007",
    ownerColor: "#f39c12",
    listed: "2d ago",
    offering: [
      { name: "Huge Bunny",    value: "1,400" },
      { name: "Massive Fox",   value: "600"   },
    ],
    lookingFor: "Any huge pet + gems",
    total: "2,000",
    status: null,
  },
];

export function Trades() {
  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0c", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600, marginRight: 20 }}>Trades</span>
          {/* Tabs */}
          {["Browse", "My Trades"].map((tab, i) => (
            <button key={tab} style={{
              fontSize: 13, fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? "#fff" : "#555",
              background: "transparent", border: "none",
              borderBottom: i === 0 ? "2px solid #fff" : "2px solid transparent",
              padding: "4px 16px 14px",
              cursor: "pointer",
              marginBottom: -21,
            }}>{tab}</button>
          ))}
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={14} />
          List Items
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "7px 12px" }}>
          <Search size={13} color="#555" />
          <input placeholder="Search listings..." style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 13, outline: "none" }} />
        </div>
        {["Value ↓", "Game"].map(label => (
          <button key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#666", background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>
            {label} <ChevronDown size={11} />
          </button>
        ))}
      </div>

      {/* ── Listings Grid ── */}
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {LISTINGS.map((l, i) => (
            <div key={i} style={{ background: "#111", padding: "18px 18px 16px", position: "relative" }}>

              {/* Status badge */}
              {l.status === "pending" && (
                <div style={{ position: "absolute", top: 14, right: 14, fontSize: 10, padding: "2px 8px", background: "rgba(250,204,21,0.1)", color: "#facc15", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, border: "1px solid rgba(250,204,21,0.2)" }}>Pending</div>
              )}

              {/* Owner row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: l.ownerColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {l.owner[0]}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{l.owner}</span>
                <span style={{ fontSize: 12, color: "#444", marginLeft: "auto" }}>Listed {l.listed}</span>
              </div>

              {/* Offering */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 7 }}>Offering</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {l.offering.map((item, j) => (
                    <div key={j} style={{ fontSize: 12, padding: "4px 10px", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, color: "#ccc", display: "flex", gap: 6, alignItems: "center" }}>
                      {item.name}
                      <span style={{ color: "#555" }}>·</span>
                      <span style={{ color: "#888", fontVariantNumeric: "tabular-nums" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Looking For */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 5 }}>Looking For</div>
                <div style={{ fontSize: 13, color: "#888" }}>{l.lookingFor}</div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 14 }} />

              {/* Footer row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>≈ {l.total}</span>
                  <span style={{ fontSize: 12, color: "#555", marginLeft: 5 }}>gems</span>
                </div>
                <button style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "7px 14px", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 6, background: "transparent", color: "#fff", cursor: "pointer" }}>
                  <ArrowLeftRight size={12} />
                  Request Trade
                </button>
              </div>

            </div>
          ))}
        </div>

        {/* Count hint */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#333", marginTop: 16 }}>
          Showing 4 of 47 listings
        </div>
      </div>

    </div>
  );
}
