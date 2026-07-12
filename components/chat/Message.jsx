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
    setModalState(<DropClaim dropId={drop.id} itemname={drop.itemname} onClose={() => setModalState(null)} />);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(139,92,246,0.14), rgba(124,58,237,0.06))",
        border: claimed ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(139,92,246,0.45)",
        boxShadow: claimed ? "none" : "0 0 14px rgba(139,92,246,0.25)",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 46,
          height: 46,
          borderRadius: 8,
          background: "#12141f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {drop.itemimage ? (
          <img src={drop.itemimage} alt={drop.itemname} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: 20 }}>🎁</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}>
          🎁 Drop: {drop.itemname || "Unknown Item"}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: "#8B5CF6" }}>
          R${(drop.itemvalue || 0).toLocaleString()}
        </p>

        {claimed ? (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6B7280" }}>
            ✅ Claimed by <span style={{ color: "#fff", fontWeight: 600 }}>{drop.claimedUsername || "someone"}</span>
          </p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#fff",
                background: "rgba(0,0,0,0.35)",
                border: "1px dashed rgba(139,92,246,0.6)",
                borderRadius: 6,
                padding: "3px 8px",
              }}
            >
              {drop.code}
            </span>
            <button
              onClick={openClaim}
              style={{
                border: "none",
                cursor: "pointer",
                borderRadius: 8,
                padding: "5px 14px",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              }}
            >
              Claim
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
