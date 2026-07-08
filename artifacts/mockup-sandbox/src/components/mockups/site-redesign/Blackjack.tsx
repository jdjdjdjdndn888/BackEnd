import { Plus, Eye } from "lucide-react";

const rbx = (userId: number) =>
  `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;

const RbxAvatar = ({ userId, size = 32, color }: { userId: number; size?: number; color: string }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: `2px solid ${color}`, flexShrink: 0 }}>
    <img src={rbx(userId)} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
  </div>
);

// Playing card component
const Card = ({ rank, suit, faceDown = false }: { rank: string; suit: string; faceDown?: boolean }) => {
  const isRed = suit === "♥" || suit === "♦";
  return (
    <div style={{
      width: 36, height: 50, borderRadius: 5,
      background: faceDown ? "#1a1a2e" : "#fff",
      border: faceDown ? "1px solid rgba(255,255,255,0.08)" : "none",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
    }}>
      {!faceDown && (
        <>
          <span style={{ fontSize: 11, fontWeight: 800, color: isRed ? "#e74c3c" : "#111", lineHeight: 1 }}>{rank}</span>
          <span style={{ fontSize: 14, color: isRed ? "#e74c3c" : "#111", lineHeight: 1 }}>{suit}</span>
        </>
      )}
      {faceDown && (
        <div style={{ width: 24, height: 36, borderRadius: 3, background: "repeating-linear-gradient(45deg, #252540, #252540 2px, #1a1a2e 2px, #1a1a2e 8px)" }} />
      )}
    </div>
  );
};

const ROOMS = [
  {
    id: 1,
    dealer: { name: "DragonSlayer99", userId: 156,      color: "#e74c3c" },
    player: { name: "HugeCatKing",    userId: 4178,     color: "#3498db" },
    dealerCards: [{ rank: "A", suit: "♠" }, { rank: "K", suit: "♥" }],
    playerCards: [{ rank: "9", suit: "♦" }, { rank: "7", suit: "♣" }],
    dealerTotal: 21, playerTotal: 16,
    status: "in-progress", items: 8, value: "4,200",
  },
  {
    id: 2,
    dealer: { name: "PS99Master",     userId: 261,      color: "#2ecc71" },
    player: { name: "GemHunter",      userId: 2470023,  color: "#f59e0b" },
    dealerCards: [{ rank: "Q", suit: "♥" }, { rank: "J", suit: "♠" }],
    playerCards: [{ rank: "8", suit: "♣" }, { rank: "8", suit: "♦" }],
    dealerTotal: 20, playerTotal: 16,
    status: "in-progress", items: 5, value: "1,850",
  },
  {
    id: 3,
    dealer: { name: "TitanicCorgi",   userId: 55549240, color: "#9b59b6" },
    player: { name: "LuckyPet007",    userId: 1,        color: "#1abc9c" },
    dealerCards: [{ rank: "7", suit: "♣" }, { rank: "5", suit: "♦" }, { rank: "3", suit: "♠" }],
    playerCards: [{ rank: "K", suit: "♥" }, { rank: "6", suit: "♣" }],
    dealerTotal: 15, playerTotal: 16,
    status: "in-progress", items: 11, value: "6,000",
  },
  {
    id: 4,
    dealer: { name: "Roblox",         userId: 1,        color: "#e74c3c" },
    player: null,
    dealerCards: [{ rank: "J", suit: "♦" }, { rank: "4", suit: "♣" }],
    playerCards: [],
    dealerTotal: 14, playerTotal: null,
    status: "waiting", items: 3, value: "750",
  },
];

const DIVIDER = <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)" }} />;

export function Blackjack() {
  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0c", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Blackjack</span>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 13, color: "#888" }}>4 Active Rooms</span>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={14} /> Create Room
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 24, padding: "0 24px", height: 48 }}>
        <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#fff", fontWeight: 600 }}>4</span> Rooms</span>
        {DIVIDER}
        <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#fff", fontWeight: 600 }}>27</span> Items</span>
        {DIVIDER}
        <span style={{ fontSize: 13, color: "#888" }}>≈ <span style={{ color: "#fff", fontWeight: 600 }}>12,800</span> Value</span>
      </div>

      {/* ── Filters ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["All", "PS99", "MM2"].map((f, i) => (
            <button key={f} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: i === 0 ? "rgba(255,255,255,0.1)" : "transparent", color: i === 0 ? "#fff" : "#666", cursor: "pointer" }}>{f}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["In Progress", "Waiting"].map((f, i) => (
            <button key={f} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#555", cursor: "pointer" }}>{f}</button>
          ))}
        </div>
      </div>

      {/* ── Room List ── */}
      <div style={{ padding: "0 24px" }}>
        {ROOMS.map((room, i) => (
          <div key={room.id} style={{ display: "flex", alignItems: "center", gap: 0, padding: "18px 0", borderBottom: i < ROOMS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>

            {/* DEALER side */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
              <RbxAvatar userId={room.dealer.userId} color={room.dealer.color} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 2 }}>Dealer</div>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{room.dealer.name}</div>
              </div>
              {/* Dealer cards */}
              <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
                {room.dealerCards.map((c, ci) => <Card key={ci} {...c} />)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: room.dealerTotal === 21 ? "#4ade80" : "#fff", marginLeft: 6, minWidth: 24 }}>{room.dealerTotal}</div>
            </div>

            {/* CENTER divider */}
            <div style={{ width: 52, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "0.05em" }}>VS</div>
              <div style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: room.status === "waiting" ? "rgba(250,204,21,0.12)" : "rgba(74,222,128,0.1)", color: room.status === "waiting" ? "#facc15" : "#4ade80", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                {room.status === "waiting" ? "Open" : "Live"}
              </div>
            </div>

            {/* PLAYER side */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
              {room.player ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: room.playerTotal === 21 ? "#4ade80" : "#fff", minWidth: 24, textAlign: "right" }}>{room.playerTotal}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {room.playerCards.map((c, ci) => <Card key={ci} {...c} />)}
                  </div>
                  <div style={{ textAlign: "right", minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 2 }}>Player</div>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{room.player.name}</div>
                  </div>
                  <RbxAvatar userId={room.player.userId} color={room.player.color} />
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "#333" }}>Waiting for player</div>
                    <div style={{ fontSize: 12, color: "#555" }}>{room.items} items · {room.value} val</div>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "rgba(255,255,255,0.15)" }}>?</div>
                </div>
              )}
            </div>

            {/* Action button */}
            <div style={{ marginLeft: 20, flexShrink: 0 }}>
              {room.status === "waiting" ? (
                <button style={{ fontSize: 12, fontWeight: 600, padding: "7px 18px", border: "none", borderRadius: 6, background: "#fff", color: "#000", cursor: "pointer" }}>
                  Join
                </button>
              ) : (
                <button style={{ fontSize: 12, fontWeight: 600, padding: "7px 16px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, background: "transparent", color: "#888", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                  <Eye size={12} /> Watch
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
