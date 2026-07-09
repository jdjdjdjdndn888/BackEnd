import { formatLargeNumber } from "@/utils/value";
import Profile from "../popup/profile";
import { useModal } from "@/utils/ModalContext";
import LoginModal from "../popup/login";
import JoinDice from "./Join/joindice.jsx";
import DiceView from "./View/view.jsx";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import QuestionMarkIcon from "@/assets/images/question-mark.svg";
import { useCallback, memo } from "react";
import { Eye } from "lucide-react";

const PlayerAvatar = ({ imgUrl, userid, status }) => {
  const { setModalState } = useModal();
  return (
    <div style={{
      position: "relative", width: 44, height: 44, flexShrink: 0, borderRadius: "50%",
      border: status === "winner" ? "2px solid rgba(255,255,255,0.6)" : "2px solid rgba(255,255,255,0.08)",
      background: "#111",
      opacity: status === "loser" ? 0.35 : 1,
      boxShadow: status === "winner" ? "0 0 10px rgba(255,255,255,0.15)" : "none",
      overflow: "visible",
    }}>
      <button
        onClick={() => userid && setModalState(<Profile userId={userid} />)}
        style={{ display: "block", width: "100%", height: "100%", overflow: "hidden", borderRadius: "50%", border: "none", background: "transparent", cursor: userid ? "pointer" : "default", padding: 0 }}
      >
        <img loading="lazy" src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </button>
      <div style={{ position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
        🎲
      </div>
    </div>
  );
};

const ItemsCell = memo(({ itemsA, itemsB }) => {
  const max = 5;
  const totalCount = itemsA.length + itemsB.length;
  const sorted = [...itemsA, ...itemsB].sort((a, b) => b.itemvalue - a.itemvalue).slice(0, max);
  return (
    <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
      <TooltipProvider delayDuration={0}>
        {sorted.map((item, index) => (
          <Tooltip key={item._id || index}>
            <TooltipTrigger style={{ position: "relative", display: "block", width: 40, height: 40, flexShrink: 0, overflow: "hidden", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.08)", background: "#111", marginLeft: index > 0 ? -12 : 0, cursor: "pointer", zIndex: sorted.length - index }}>
              <img src={item.itemimage} alt={item.itemname?.slice(0, 1)} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }} />
              {index === max - 1 && totalCount > max && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(12,12,12,0.82)", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>+{totalCount - max}</div>
              )}
            </TooltipTrigger>
            {(index < max - 1 || totalCount <= max) && (
              <TooltipContent className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111] px-3 py-1.5">
                <p className="text-sm text-white">{item.itemname || "Unknown"}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
});

const DiceCountDown = ({ countdown, game }) => {
  const hasResult = game.PlayerTwo && !game.active;
  if (!hasResult && typeof countdown !== "number") return <div style={{ width: 56, flexShrink: 0 }} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 56, flexShrink: 0, gap: 4 }}>
      {typeof countdown === "number" ? (
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>
          {countdown}
        </div>
      ) : hasResult ? (
        <>
          <div style={{ display: "flex", gap: 3 }}>
            {(game.PlayerOne.dice || []).map((d, i) => <DieFace key={i} value={d} size="sm" />)}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>{game.PlayerOne.total}</span>
        </>
      ) : null}
    </div>
  );
};

export const DieFace = ({ value, size = "md" }) => {
  const dim = size === "sm" ? 22 : 38;
  return (
    <div style={{ width: dim, height: dim, borderRadius: 5, border: "1.5px solid rgba(255,255,255,0.2)", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: size === "sm" ? 11 : 16 }}>
      {value}
    </div>
  );
};

export default function DiceRow({ game, countdowns, userData, setSelectedGame }) {
  const { setModalState } = useModal();

  const handleView = useCallback(() => {
    setTimeout(() => {
      setSelectedGame(game);
      setModalState(<DiceView game={game} onClose={() => setSelectedGame(null)} />);
    }, 0);
  }, [game, setSelectedGame]);

  const p1Status = game.PlayerTwo && !countdowns[game._id]
    ? game.winner === game.PlayerOne.id ? "winner" : "loser"
    : "pending";
  const p2Status = game.PlayerTwo && !countdowns[game._id]
    ? game.winner === game.PlayerTwo?.id ? "winner" : "loser"
    : "pending";

  const canJoin = game.active && !game.PlayerTwo && userData?.userid !== game.creatorid;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr auto auto auto",
      alignItems: "center",
      gap: 14,
      padding: "14px 16px",
      background: "#111",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 8,
      transition: "background 0.15s, border-color 0.15s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#161616"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#111"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
    >
      {/* Players */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <PlayerAvatar imgUrl={game.PlayerOne.thumbnail} userid={game.PlayerOne.id} status={p1Status} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "0.08em" }}>VS</span>
        <PlayerAvatar imgUrl={game.PlayerTwo?.thumbnail ?? QuestionMarkIcon} userid={game.PlayerTwo?.id} status={p2Status} />
      </div>

      {/* Items */}
      <ItemsCell itemsA={game.PlayerOne.items} itemsB={game.PlayerTwo?.items ?? []} />

      {/* Value */}
      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 90 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{formatLargeNumber(game.requirements.static)}</p>
        <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{formatLargeNumber(game.requirements.min)} – {formatLargeNumber(game.requirements.max)}</p>
      </div>

      {/* Countdown / result */}
      <DiceCountDown countdown={countdowns[game._id]} game={game} />

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, minWidth: 76 }}>
        {game.active && (
          <button
            onClick={() => setModalState(userData
              ? <JoinDice game={game} onJoin={setSelectedGame} onClose={() => setSelectedGame(null)} />
              : <LoginModal />
            )}
            disabled={!canJoin}
            style={{ width: "100%", padding: "6px 0", background: "#fff", color: "#000", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: canJoin ? "pointer" : "not-allowed", opacity: canJoin ? 1 : 0.35 }}
          >
            Join
          </button>
        )}
        <button
          onClick={handleView}
          style={{ width: "100%", padding: "6px 0", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
        >
          <Eye size={11} /> View
        </button>
      </div>
    </div>
  );
}
