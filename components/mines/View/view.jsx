import React, { useContext, useState } from "react";
import toast from "react-hot-toast";
import { useModal } from "../../../utils/ModalContext";
import UserContext from "../../../utils/user.js";
import { getauth } from "../../../utils/getauth.js";
import { api } from "../../../config.js";
import { formatLargeNumber } from "@/utils/value";

const GRID_SIZE = 25;

export default function MinesView({ game, onClose }) {
  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const [acting, setActing] = useState(false);
  const [localGame, setLocalGame] = useState(game);

  const isJoiner = userData?.userid === localGame.PlayerTwo?.id;
  const isCreator = userData?.userid === localGame.PlayerOne?.id;
  const canAct = isJoiner && localGame.state === "playing";
  const finished = localGame.state === "finished";

  const winnerName = localGame.winner
    ? (localGame.PlayerOne.id === localGame.winner ? localGame.PlayerOne.username : localGame.PlayerTwo?.username)
    : null;

  const revealTile = async (idx) => {
    if (!canAct || acting) return;
    if (localGame.revealed?.includes(idx)) return;
    setActing(true);
    try {
      const res = await fetch(`${api}/mines/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ gameid: localGame._id, tileIndex: idx }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalGame(data.data);
        if (data.isBomb) toast.error("💥 You hit a bomb! Creator wins.");
        else toast.success("💎 Safe! Keep going or cash out.");
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch { toast.error("Something went wrong"); }
    setActing(false);
  };

  const cashOut = async () => {
    if (!canAct || acting) return;
    if (!localGame.revealed?.length) return toast.error("Reveal at least one tile first!");
    setActing(true);
    try {
      const res = await fetch(`${api}/mines/cashout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ gameid: localGame._id }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocalGame(data.data);
        toast.success("💰 Cashed out! You win!");
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch { toast.error("Something went wrong"); }
    setActing(false);
  };

  const handleCancel = async () => {
    if (!isCreator || localGame.state !== "waiting") return;
    setActing(true);
    try {
      const res = await fetch(`${api}/mines/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ gameid: localGame._id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Game cancelled!");
        onClose?.();
        setModalState(null);
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch { toast.error("Something went wrong"); }
    setActing(false);
  };

  const getTileState = (idx) => {
    if (finished && localGame.grid?.includes(idx)) return "bomb";
    if (localGame.revealed?.includes(idx)) {
      return localGame.grid?.includes(idx) ? "bomb" : "gem";
    }
    return "hidden";
  };

  const safeCount = GRID_SIZE - (localGame.minesCount || 5);
  const revealedSafe = (localGame.revealed || []).filter((i) => !localGame.grid?.includes(i)).length;
  const progress = safeCount > 0 ? Math.round((revealedSafe / safeCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={() => { onClose?.(); setModalState(null); }}>
      <div className="relative w-full max-w-xl rounded-2xl bg-[#131520] border border-[#252839] shadow-2xl overflow-hidden p-5"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src="/mines-gem.png" alt="Mines" className="w-6 h-6 object-contain" />
            <h2 className="text-white font-bold text-base">Mines 1v1</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#68749C]">
              {localGame.minesCount} Mines
            </span>
          </div>
          <button className="text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer"
            onClick={() => { onClose?.(); setModalState(null); }}>✕</button>
        </div>

        {/* Players */}
        <div className="flex items-center justify-between mb-4">
          <PlayerChip player={localGame.PlayerOne} label="Creator" isWinner={finished && localGame.winner === localGame.PlayerOne.id} />
          <div className="flex flex-col items-center gap-1">
            <span className="text-white font-black text-lg">VS</span>
            <span className="text-xs text-[#68749C]">
              <img src="/mines-gem.png" alt="gem" className="w-3 h-3 inline object-contain mr-0.5" />
              {formatLargeNumber(localGame.requirements.static)}
            </span>
          </div>
          {localGame.PlayerTwo
            ? <PlayerChip player={localGame.PlayerTwo} label="Joiner" isWinner={finished && localGame.winner === localGame.PlayerTwo.id} />
            : <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#252839] flex items-center justify-center text-[#42496B] text-xl">?</div>
                <span className="text-xs text-[#42496B]">Waiting…</span>
              </div>
          }
        </div>

        {/* Progress bar (only when playing) */}
        {localGame.state === "playing" && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-[#68749C] mb-1">
              <span>Safe tiles: {revealedSafe}/{safeCount}</span>
              <span>{progress}% cleared</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#252839] overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Grid */}
        {localGame.state === "waiting" ? (
          <div className="text-center py-8 text-[#68749C] text-sm">
            <img src="/mines-bomb.png" alt="bomb" className="w-12 h-12 object-contain mx-auto mb-3 opacity-50" />
            Waiting for an opponent to join…
          </div>
        ) : (
          <div className="grid gap-1.5 mb-4" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
            {Array.from({ length: GRID_SIZE }).map((_, idx) => {
              const state = getTileState(idx);
              const clickable = canAct && state === "hidden";
              return (
                <button
                  key={idx}
                  onClick={() => revealTile(idx)}
                  disabled={!clickable || acting}
                  className={`
                    aspect-square rounded-lg border flex items-center justify-center transition-all
                    ${state === "hidden" ? `border-[#252839] bg-[#1a1d2b] ${clickable ? "hover:border-white/30 hover:bg-[#252839] cursor-pointer" : "cursor-default"}` : ""}
                    ${state === "gem" ? "border-green-500/50 bg-green-500/10" : ""}
                    ${state === "bomb" ? "border-red-500/50 bg-red-500/10" : ""}
                  `}
                >
                  {state === "gem" && <img src="/mines-gem.png" alt="gem" className="w-5 h-5 object-contain" />}
                  {state === "bomb" && <img src="/mines-bomb.png" alt="bomb" className="w-5 h-5 object-contain" />}
                  {state === "hidden" && <span className="text-[#2F3347] text-xs">·</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Actions */}
        {canAct && !finished && (
          <div className="flex gap-2">
            <button
              onClick={cashOut}
              disabled={acting || !localGame.revealed?.length}
              className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold text-sm transition-colors"
            >
              💰 Cash Out
            </button>
          </div>
        )}

        {/* Creator cancel button */}
        {isCreator && localGame.state === "waiting" && (
          <button
            onClick={handleCancel}
            disabled={acting}
            className="w-full mt-2 py-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-colors bg-transparent disabled:opacity-40"
          >
            Cancel Game
          </button>
        )}

        {/* Game result */}
        {finished && (
          <div className="mt-3 text-center">
            <p className="text-lg font-bold" style={{ color: "#8B5CF6" }}>
              🏆 {winnerName} wins!
              {localGame.PlayerTwo?.cashedOut && <span className="text-sm font-normal text-[#68749C] ml-2">(Cash Out)</span>}
            </p>
          </div>
        )}

        {/* Opponent game state message */}
        {localGame.state === "playing" && !isJoiner && !finished && (
          <p className="mt-3 text-center text-sm text-[#68749C] animate-pulse">
            Waiting for {localGame.PlayerTwo?.username} to play…
          </p>
        )}
      </div>
    </div>
  );
}

const PlayerChip = ({ player, label, isWinner }) => (
  <div className="flex flex-col items-center gap-1">
    <img src={player.thumbnail} alt={player.username}
      className="w-10 h-10 rounded-full object-cover border-2 transition-all"
      style={{ borderColor: isWinner ? "#8B5CF6" : "#252839" }} />
    <span className="text-xs font-semibold text-white max-w-[80px] truncate">{player.username}</span>
    <span className="text-[10px] text-[#42496B] uppercase">{label}</span>
    {isWinner && <span className="text-[10px] font-bold text-[#8B5CF6]">🏆 Winner</span>}
  </div>
);
