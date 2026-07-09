import React from "react";
import { formatLargeNumber } from "@/utils/value";
import { useModal } from "../../utils/ModalContext";
import MinesView from "./View/view.jsx";
import JoinMines from "./Join/joinmines.jsx";
import LoginModal from "../popup/login.jsx";

const STATE_BADGE = {
  waiting: { label: "Open", color: "#22c55e" },
  playing: { label: "In Progress", color: "#f59e0b" },
  finished: { label: "Finished", color: "#6b7280" },
};

export default function MinesRow({ game, userData, onView }) {
  const { setModalState } = useModal();
  const badge = STATE_BADGE[game.state] || STATE_BADGE.waiting;
  const isCreator = userData?.userid === game.PlayerOne.id;
  const isJoiner = userData?.userid === game.PlayerTwo?.id;
  const canJoin = !game.PlayerTwo && !isCreator && game.state === "waiting";

  const handleClick = () => {
    if (game.PlayerTwo || isCreator || isJoiner) {
      onView(game);
    } else if (canJoin) {
      if (!userData) { setModalState(<LoginModal />); return; }
      setModalState(<JoinMines game={game} onClose={() => setModalState(null)} />);
    } else {
      onView(game);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
        borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)", cursor: "pointer",
        transition: "background 0.15s",
      }}
      className="hover:!bg-[rgba(255,255,255,0.04)]"
    >
      {/* Creator avatar */}
      <img src={game.PlayerOne.thumbnail} alt={game.PlayerOne.username}
        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />

      {/* Name + mines count */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {game.PlayerOne.username}
        </div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
          <img src="/mines-bomb.png" alt="bombs" style={{ width: 12, height: 12, objectFit: "contain" }} />
          {game.minesCount} mines · {game.PlayerOne.items.length} items
        </div>
      </div>

      {/* VS / Joiner */}
      {game.PlayerTwo ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>VS</span>
          <img src={game.PlayerTwo.thumbnail} alt={game.PlayerTwo.username}
            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
        </div>
      ) : (
        <span style={{ fontSize: 11, color: "#444", fontStyle: "italic" }}>Waiting...</span>
      )}

      {/* Value */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
          <img src="/mines-gem.png" alt="gem" style={{ width: 14, height: 14, objectFit: "contain", verticalAlign: "middle", marginRight: 3 }} />
          {formatLargeNumber(game.requirements.static)}
        </div>
        <div style={{ fontSize: 10, marginTop: 2, fontWeight: 600, color: badge.color }}>{badge.label}</div>
      </div>
    </div>
  );
}
