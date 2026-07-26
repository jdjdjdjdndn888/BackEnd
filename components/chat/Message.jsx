import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar } from "../ui/avatar";
import { useModal } from "@/utils/ModalContext";
import Profile from "../popup/profile";
import Tip from "../tip/tip.jsx";
import DropClaim from "./DropClaim.jsx";

/**
 * @typedef {Object} ChatMessage
 * @property {string} thumbnail
 * @property {string} timestamp
 * @property {string} [rankImage]
 * @property {string} [roleName]
 * @property {string} [usernameColor]
 * @property {string} userid
 */

/** @type {import("react").FC<{msg: ChatMessage}>} */
export const Message = ({ msg }) => {
  const { setModalState } = useModal();

  const openTip = (e) => {
    e.stopPropagation();
    setModalState(<Tip userId={msg?.userid} onClose={() => setModalState(null)} />);
  };

  if (msg.type === "drop") {
    return <DropMessage msg={msg} />;
  }

  return (
    <div style={{
      display: "flex", gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      background: "#111",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ flexShrink: 0 }}>
        <Avatar
          imgUrl={msg?.thumbnail}
          level={msg.level}
          className="cursor-pointer h-9 w-9"
          onClick={() => setModalState(<Profile userId={msg?.userid} />)}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", lineHeight: "24px" }}>
          <button
            style={{ color: msg.usernameColor || "#888", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: 12, fontWeight: 700 }}
            onClick={openTip}
            title="Send tip"
            className="hover:underline w-max"
          >
            <span style={{ fontWeight: 500 }}>@</span>{msg.username || "Unknown User"}
          </button>

          {msg.rankImage && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <img
                    src={msg.rankImage}
                    alt={msg.roleName || "Rank"}
                    style={{ width: 34, height: 34, objectFit: "contain", flexShrink: 0, marginLeft: 5, cursor: "default", display: "inline-block", verticalAlign: "middle" }}
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1">
                  <p className="text-white text-xs">{msg.roleName || "User"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <span style={{ marginLeft: "auto", fontSize: 10, color: "#444" }}>{msg.timestamp}</span>
        </div>

        <p style={{ fontSize: 12, color: "#aaa", overflowWrap: "anywhere", marginTop: 2, lineHeight: 1.5 }}>
          {msg.content}
        </p>
      </div>
    </div>
  );
};

/* ── Confetti pieces that fall forever ────────────────────────────────────── */
const CONFETTI_COLORS = [
  "#8B5CF6","#A78BFA","#C4B5FD",
  "#60A5FA","#34D399","#F59E0B",
  "#F87171","#EC4899","#fff",
];

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const left  = `${((i * 37) % 96) + 2}%`;
    const delay = `${((i * 0.19) % 2.8).toFixed(2)}s`;
    const dur   = `${(1.6 + (i % 6) * 0.25).toFixed(2)}s`;
    const size  = [5, 4, 6, 4, 5][i % 5];
    const round = i % 3 === 0 ? "50%" : "2px";
    return { color, left, delay, dur, size, round };
  });

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      borderRadius: "inherit", pointerEvents: "none", zIndex: 0,
    }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          top: "-8px",
          left: p.left,
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: p.round,
          animation: `confettiFall ${p.dur} ${p.delay} infinite ease-in`,
        }} />
      ))}
    </div>
  );
}

/* ── Tiny sparkles floating up while drop is unclaimed ────────────────────── */
function Sparkles() {
  const dots = Array.from({ length: 10 }, (_, i) => ({
    left:  `${8 + i * 9}%`,
    delay: `${(i * 0.38).toFixed(2)}s`,
    dur:   `${(2.0 + (i % 4) * 0.45).toFixed(2)}s`,
    size:  i % 2 === 0 ? 3 : 4,
    color: i % 3 === 0 ? "#c4b5fd" : i % 3 === 1 ? "#a78bfa" : "#8B5CF6",
  }));

  return (
    <div style={{
      position: "absolute", inset: 0, overflow: "hidden",
      borderRadius: "inherit", pointerEvents: "none", zIndex: 0,
    }}>
      {dots.map((d, i) => (
        <div key={i} style={{
          position: "absolute",
          bottom: "6px",
          left: d.left,
          width: d.size,
          height: d.size,
          borderRadius: "50%",
          background: d.color,
          animation: `sparkleRise ${d.dur} ${d.delay} infinite ease-out`,
          opacity: 0,
        }} />
      ))}
    </div>
  );
}

// Renders a claimable item drop inline in the chat feed. Shows the code
// right on the card (that's the point — everyone sees it, but only one
// person can actually redeem it) plus a Claim button that opens the
// code-entry modal.
const DropMessage = ({ msg }) => {
  const { setModalState } = useModal();
  const drop = msg.drop || {};
  const claimed = drop.claimed;

  const openClaim = (e) => {
    e.stopPropagation();
    setModalState(<DropClaim dropId={drop.id} itemname={drop.itemname} dropCode={drop.code} onClose={() => setModalState(null)} />);
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: 12,
        padding: "14px 14px",
        borderRadius: 14,
        overflow: "hidden",
        background: claimed
          ? "linear-gradient(135deg, rgba(74,222,128,0.10), rgba(16,185,129,0.05))"
          : "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(124,58,237,0.08))",
        border: claimed
          ? "1px solid rgba(74,222,128,0.35)"
          : "1px solid rgba(139,92,246,0.55)",
      }}
      className={!claimed ? "drop-msg-animate" : ""}
    >
      {/* Particles layer */}
      {claimed ? <Confetti /> : <Sparkles />}

      {/* Item thumbnail */}
      <div style={{
        flexShrink: 0, width: 52, height: 52, borderRadius: 10,
        background: "#12141f", display: "flex", alignItems: "center",
        justifyContent: "center", overflow: "hidden", position: "relative", zIndex: 1,
        border: claimed ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(139,92,246,0.3)",
      }}>
        {drop.itemimage ? (
          <img src={drop.itemimage} alt={drop.itemname} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <img src="/logo-gemtide.png" alt="drop" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15 }}>{claimed ? "🎁" : "🎰"}</span>
          {claimed ? "Drop Claimed" : "Drop: " + (drop.itemname || "Unknown Item")}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: claimed ? "#4ade80" : "#a78bfa" }}>
          {claimed ? `Won by ${drop.claimedUsername || "someone"} 🏆` : `R$${(drop.itemvalue || 0).toLocaleString()}`}
        </p>

        {!claimed && (
          <p style={{ margin: "1px 0 0", fontSize: 11, color: "#94a3b8" }}>
            {drop.itemname || ""}
          </p>
        )}

        {claimed ? (
          <p className="drop-claim-pop" style={{ margin: "8px 0 0", fontSize: 11, color: "#4ade80", fontWeight: 600 }}>
            ✅ R${(drop.itemvalue || 0).toLocaleString()} · {drop.itemname}
          </p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 12, fontWeight: 800, letterSpacing: "0.18em",
              color: "#fff", background: "rgba(0,0,0,0.45)",
              border: "1px dashed rgba(139,92,246,0.7)",
              borderRadius: 6, padding: "4px 10px",
              textShadow: "0 0 8px rgba(139,92,246,0.8)",
            }}>
              {drop.code}
            </span>
            <button
              onClick={openClaim}
              style={{
                border: "1px solid rgba(139,92,246,0.6)",
                cursor: "pointer", borderRadius: 8,
                padding: "5px 16px", fontSize: 12, fontWeight: 800,
                color: "#fff",
                background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                boxShadow: "0 0 12px rgba(139,92,246,0.4)",
                transition: "opacity 0.15s",
              }}
            >
              🎯 Claim
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
