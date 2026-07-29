import React, { useContext } from "react";
import { useModal } from "../../utils/ModalContext";
import LoginModal from "../popup/login.jsx";
import { formatLargeNumber } from "@/utils/value";
import { COLOR_MAP } from "./colors.js";
import { ColorDots } from "./layout.jsx";
import JoinColordice from "./Join/index.jsx";
import ViewColordice from "./View/index.jsx";

function Avatar({ thumbnail, username, size = 32 }) {
  return thumbnail ? (
    <img src={thumbnail} alt={username} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,.08)" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#1e2030", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#555", flexShrink: 0 }}>
      {(username || "?")[0].toUpperCase()}
    </div>
  );
}

export default function ColordiceRow({ game, userData }) {
  const { setModalState } = useModal();

  const isMyGame   = userData && String(userData.userid) === String(game.creatorId);
  const isOpen     = game.active && !game.joinerId;
  const isComplete = !game.active;

  const winnerColor = isComplete && game.winningColor ? COLOR_MAP[game.winningColor] : null;
  const creatorWon  = isComplete && game.winner === "creator";
  const joinerWon   = isComplete && game.winner === "joiner";

  const openJoin = () => {
    setModalState(null);
    setTimeout(() =>
      setModalState(userData
        ? <JoinColordice game={game} onClose={() => setModalState(null)} />
        : <LoginModal />)
    );
  };

  const openView = () => {
    setModalState(<ViewColordice game={game} onClose={() => setModalState(null)} />);
  };

  return (
    <div onClick={isComplete ? openView : undefined}
      style={{
        background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)",
        borderRadius: 10, padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: isComplete ? "pointer" : "default",
        transition: "background .15s",
        ...(isComplete ? {} : {}),
      }}
      className={isComplete ? "hover:!bg-[rgba(255,255,255,.04)]" : ""}
    >
      {/* Creator side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <Avatar thumbnail={game.creatorThumbnail} username={game.creatorUsername} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: creatorWon ? "#22c55e" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {game.creatorUsername}
            {creatorWon && <span style={{ marginLeft: 6, fontSize: 10, color: "#22c55e" }}>WON</span>}
          </div>
          <ColorDots colors={game.creatorColors} size={12} />
        </div>
      </div>

      {/* Center — bet + vs */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{formatLargeNumber(game.betAmount)}</span>
        <span style={{ fontSize: 10, color: "#444", letterSpacing: ".08em", textTransform: "uppercase" }}>gems</span>
        {isComplete && winnerColor && (
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            background: winnerColor.hex,
            boxShadow: `0 0 10px ${winnerColor.hex}`,
            marginTop: 2,
          }} title={`Winning color: ${winnerColor.label}`} />
        )}
        {isOpen && <span style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: ".1em" }}>vs</span>}
      </div>

      {/* Joiner side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1, justifyContent: "flex-end" }}>
        {isOpen ? (
          isMyGame ? (
            <span style={{ fontSize: 12, color: "#555" }}>Waiting for joiner…</span>
          ) : (
            <button onClick={openJoin} style={{
              background: "linear-gradient(135deg,#a855f7,#6d28d9)",
              color: "#fff", border: "none", borderRadius: 7,
              padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Join
            </button>
          )
        ) : (
          <>
            <div style={{ textAlign: "right", minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: joinerWon ? "#22c55e" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {game.joinerUsername}
                {joinerWon && <span style={{ marginLeft: 6, fontSize: 10, color: "#22c55e" }}>WON</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <ColorDots colors={game.joinerColors || []} size={12} />
              </div>
            </div>
            <Avatar thumbnail={game.joinerThumbnail} username={game.joinerUsername} />
          </>
        )}
      </div>
    </div>
  );
}
