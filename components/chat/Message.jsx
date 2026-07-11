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
