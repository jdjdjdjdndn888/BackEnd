import { formatLargeNumber } from "@/utils/value";
import Profile from "../popup/profile";
import CoinflipStyles from "./coinfliplayout.module.css";
import { useModal } from "@/utils/ModalContext";
import LoginModal from "../popup/login";
import JoinMatch from "./Join/joincoinflip";
import View from "./View/view";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trails, Heads } from "../../assets/exports.jsx";
import QuestionMarkIcon from "@/assets/images/question-mark.svg";
import { useCallback, memo } from "react";
import { cn } from "@/lib/utils";

/** @type {import("react").FC<{value: string, min:string, max: string}>} */
const ValueCell = ({ max, min, value }) => (
  <div style={{ flexShrink: 0, textAlign: "center", minWidth: 90 }}>
    <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{formatLargeNumber(value)}</p>
    <p style={{ fontSize: 11, color: "#555", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
      {formatLargeNumber(min)} – {formatLargeNumber(max)}
    </p>
  </div>
);

/** @type {import("react").FC<{choice: "heads"|"tails", status: "winner"|"loser"|"pending", imgUrl: string, userid?: string}>} */
const Player = ({ choice, imgUrl, status, userid }) => {
  const { setModalState } = useModal();
  return (
    <div style={{
      position: "relative", width: 44, height: 44, flexShrink: 0, borderRadius: "50%",
      border: status === "winner" ? "2px solid rgba(255,255,255,0.6)" : "2px solid rgba(255,255,255,0.1)",
      background: "#111",
      opacity: status === "loser" ? 0.35 : 1,
      boxShadow: status === "winner" ? "0 0 12px rgba(255,255,255,0.2)" : "none",
      transition: "opacity 0.3s, border-color 0.3s",
      overflow: "visible",
    }}>
      <button
        onClick={() => userid && setModalState(<Profile userId={userid} />)}
        style={{ display: "block", width: "100%", height: "100%", overflow: "hidden", borderRadius: "50%", border: "none", background: "transparent", cursor: userid ? "pointer" : "default", padding: 0 }}
      >
        <img loading="lazy" src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </button>
      {/* Coin badge */}
      <div style={{ position: "absolute", top: -3, right: -3, width: 18, height: 18, borderRadius: "50%", overflow: "hidden", border: "1.5px solid #0c0c0c" }}>
        <img loading="lazy" src={choice === "heads" ? Heads : Trails} alt={choice} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
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
          <Tooltip key={item._id}>
            <TooltipTrigger style={{ position: "relative", display: "block", width: 36, height: 36, flexShrink: 0, overflow: "hidden", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.08)", background: "#111", marginLeft: index > 0 ? -10 : 0, cursor: "pointer", zIndex: sorted.length - index }}>
              <img src={item.itemimage} alt={item.itemname?.slice(0, 1)} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }} />
              {index === max - 1 && totalCount > max && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(12,12,12,0.82)", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>+{totalCount - max}</div>
              )}
            </TooltipTrigger>
            {(index < max - 1 || totalCount <= max) && (
              <TooltipContent className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#111] px-3 py-1.5">
                <p className="text-sm text-white">{item.itemname || "Unknown Item"}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
});

const CoinCountDown = ({ countdown, winner }) => {
  const show = typeof countdown === "number" || !!winner;
  if (!show) return <div style={{ width: 36, flexShrink: 0 }} />;
  return (
    <svg width="36" height="36" viewBox="-50 -50 100 100" fill="none" style={{ flexShrink: 0 }}>
      {typeof countdown === "number" ? (
        <g>
          <circle r="49" fill="#111" strokeWidth="2" stroke="rgba(255,255,255,0.2)" pathLength="100" strokeDasharray="100" transform="rotate(-90)" className={CoinflipStyles.countdown} />
          <text fill="white" textAnchor="middle" dominantBaseline="middle" fontSize="28" fontWeight="bold" fontFamily="system-ui">{countdown}</text>
        </g>
      ) : winner ? (
        <image x="-50" y="-50" width="100" height="100" href={winner === "heads" ? Heads : Trails} className={CoinflipStyles["winner-coin"]} />
      ) : null}
    </svg>
  );
};

export const CoinflipRow = ({ countdowns, flip, setSelectedFlip, userData }) => {
  const { setModalState } = useModal();

  const handleViewFlip = useCallback(() => {
    setTimeout(() => {
      setSelectedFlip(flip);
      setModalState(<View coinflip={flip} onClose={() => setSelectedFlip(null)} />);
    }, 0);
  }, [flip]);

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
        <Player imgUrl={flip.PlayerOne.thumbnail} userid={flip.PlayerOne.id} choice={flip.PlayerOne.coin}
          status={flip.PlayerTwo && !countdowns[flip._id] ? flip.winner === flip.PlayerOne.id ? "winner" : "loser" : "pending"} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "0.08em" }}>VS</span>
        <Player imgUrl={flip.PlayerTwo?.thumbnail ?? QuestionMarkIcon} choice={flip.PlayerOne.coin === "heads" ? "tails" : "heads"} userid={flip.PlayerTwo?.id}
          status={flip.PlayerTwo && !countdowns[flip._id] ? flip.winner === flip.PlayerTwo?.id ? "winner" : "loser" : "pending"} />
      </div>

      {/* Items */}
      <ItemsCell itemsA={flip.PlayerOne.items} itemsB={flip.PlayerTwo?.items ?? []} />

      {/* Value */}
      <ValueCell value={flip.requirements.static} min={flip.requirements.min} max={flip.requirements.max} />

      {/* Countdown coin */}
      <CoinCountDown countdown={countdowns[flip._id]} winner={flip.winnercoin} />

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, minWidth: 76 }}>
        {flip.active && (
          <button
            onClick={() => setModalState(userData
              ? <JoinMatch coinflip={flip} onJoin={setSelectedFlip} onClose={() => setSelectedFlip(null)} />
              : <LoginModal />
            )}
            disabled={!!flip.PlayerTwo || userData?.userid === flip.creatorid}
            style={{ width: "100%", padding: "6px 0", background: "#fff", color: "#000", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: (!!flip.PlayerTwo || userData?.userid === flip.creatorid) ? 0.35 : 1 }}
          >
            Join
          </button>
        )}
        <button
          onClick={handleViewFlip}
          style={{ width: "100%", padding: "6px 0", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          View
        </button>
      </div>
    </div>
  );
};
