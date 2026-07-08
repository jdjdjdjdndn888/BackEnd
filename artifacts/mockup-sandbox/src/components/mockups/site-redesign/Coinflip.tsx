import { Plus, ChevronDown, Clock, RotateCcw } from "lucide-react";

const rbx = (userId: number) =>
  `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;

const RbxAvatar = ({ userId, size = 36, color }: { userId: number; size?: number; color: string }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: `2px solid ${color}`, flexShrink: 0 }}>
    <img src={rbx(userId)} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  </div>
);

// Real coin images from the project
const HEADS_IMG = "/__mockup/images/coin-heads.png";
const TAILS_IMG = "/__mockup/images/coin-tails.png";

const Coin = ({ side, size = 26 }: { side: "heads" | "tails"; size?: number }) => (
  <img
    src={side === "heads" ? HEADS_IMG : TAILS_IMG}
    alt={side}
    style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
  />
);

const RECENT: Array<"heads" | "tails"> = ["heads","tails","heads","heads","tails","heads","tails","tails","heads","heads"];

const rooms = [
  { id: 1, player: { name: "DragonSlayer99", userId: 156,      color: "#e74c3c", items: 12 }, age: "2m ago"  },
  { id: 2, player: { name: "HugeCatKing",    userId: 4178,     color: "#3498db", items: 6  }, age: "5m ago"  },
  { id: 3, player: { name: "PS99Master",     userId: 261,      color: "#2ecc71", items: 31 }, age: "1m ago"  },
  { id: 4, player: { name: "GemHunter",      userId: 2470023,  color: "#f59e0b", items: 4  }, age: "8m ago"  },
  { id: 5, player: { name: "TitanicCorgi",   userId: 55549240, color: "#9b59b6", items: 18 }, age: "12m ago" },
];

const DIVIDER = <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)" }} />;

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
          <Plus size={14} /> Create Room
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 24, padding: "0 24px", height: 48 }}>
        <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#fff", fontWeight: 600 }}>5</span> Rooms</span>
        {DIVIDER}
        <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#fff", fontWeight: 600 }}>71</span> Items Total</span>
        {DIVIDER}
        <span style={{ fontSize: 13, color: "#888" }}>≈ <span style={{ color: "#fff", fontWeight: 600 }}>25,300</span> Value</span>
      </div>

      {/* ── Filters ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["All", "PS99", "MM2"].map((f, i) => (
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
          <div key={room.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: i < rooms.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>

            {/* Filled slot */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <RbxAvatar userId={room.player.userId} color={room.player.color} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{room.player.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{room.player.items} items</div>
              </div>
            </div>

            {/* VS */}
            <div style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#444", fontWeight: 700, flexShrink: 0 }}>VS</div>

            {/* Empty slot */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "rgba(255,255,255,0.15)", flexShrink: 0 }}>?</div>
              <div>
                <div style={{ fontSize: 13, color: "#333" }}>Waiting...</div>
                <div style={{ fontSize: 12, color: "#2a2a2a" }}>Any items</div>
              </div>
            </div>

            {/* Age + Join */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#555" }}>
                <Clock size={11} /> {room.age}
              </div>
              <button style={{ fontSize: 12, fontWeight: 600, padding: "7px 18px", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 6, background: "transparent", color: "#fff", cursor: "pointer" }}>
                Join
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent Results — real coin images ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <RotateCcw size={12} color="#555" />
          <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>Recent</span>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {RECENT.map((side, i) => (
            <Coin key={i} side={side} size={26} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: "#333", marginLeft: "auto" }}>Last 10 flips</span>
      </div>

    </div>
  );
}
