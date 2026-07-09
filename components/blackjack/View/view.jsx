import React, { useContext, useState } from "react";
import toast from "react-hot-toast";
import { useModal } from "../../../utils/ModalContext";
import Profile from "../../popup/profile";
import UserContext from "../../../utils/user.js";
import { getauth } from "../../../utils/getauth.js";
import { api } from "../../../config.js";
import { cn } from "@/lib/utils";

const SUIT_COLOR = { "♥": "#EF4444", "♦": "#EF4444", "♠": "#E5E7EB", "♣": "#E5E7EB" };

export const CardFace = ({ card, size = "md" }) => {
  const sizes = { xs: "w-6 h-8 text-[10px]", sm: "w-9 h-12 text-xs", md: "w-14 h-20 text-lg" };
  if (!card) {
    return (
      <div className={cn("rounded-md border-2 border-dashed border-[#3A3F5C] bg-[#1a1d2b] flex items-center justify-center font-bold text-[#3A3F5C]", sizes[size])}>?</div>
    );
  }
  return (
    <div
      className={cn("rounded-md border-2 border-[#8B5CF6] bg-white flex flex-col items-center justify-center font-bold leading-none", sizes[size])}
      style={{ color: SUIT_COLOR[card.suit] || "#111" }}
    >
      <span>{card.rank}</span>
      <span>{card.suit}</span>
    </div>
  );
};

export default function BlackjackView({ game, onClose }) {
  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const [acting, setActing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isCreator = userData?.userid === game.PlayerOne?.id;
  const canCancel = isCreator && !game.PlayerTwo && game.active;

  const dealerKey = game.PlayerOne.isDealer ? "PlayerOne" : "PlayerTwo";
  const playerKey = dealerKey === "PlayerOne" ? "PlayerTwo" : "PlayerOne";
  const dealer = game[dealerKey];
  const player = game[playerKey];
  const finished = game.turn === "finished";
  const isMyTurn = game.turn === "player" && player?.id === userData?.userid && !player.busted && !player.stood;

  const act = async (action) => {
    setActing(true);
    try {
      const res = await fetch(`${api}/blackjack/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ gameid: game._id }),
      });
      const data = await res.json();
      if (res.ok) {
        setModalState(<BlackjackView game={data.data} onClose={onClose} />);
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Something went wrong."); }
    setActing(false);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`${api}/blackjack/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ gameid: game._id }),
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
    setCancelling(false);
  };

  const winnerKey = game.winner === game.PlayerOne.id ? "PlayerOne" : game.winner === game.PlayerTwo?.id ? "PlayerTwo" : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => { onClose?.(); setModalState(null); }}>
      <div className="relative w-full max-w-lg rounded-2xl bg-[#131520] border border-[#252839] shadow-2xl overflow-hidden p-6"
        onClick={(e) => e.stopPropagation()}>

        <button className="absolute right-4 top-4 text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer z-10"
          onClick={() => { onClose?.(); setModalState(null); }}>✕</button>

        <h2 className="text-center text-lg font-bold text-white mb-6">🃏 Blackjack 1v1</h2>

        {/* Cancel button for creator before anyone joined */}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full mb-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-colors bg-transparent disabled:opacity-40"
          >
            {cancelling ? "Cancelling…" : "Cancel Game"}
          </button>
        )}

        {!game.PlayerTwo ? (
          <p className="text-center text-sm text-[#68749C] py-8">Waiting for an opponent to join…</p>
        ) : (
          <div className="flex flex-col gap-5">
            <PlayerHandPanel
              label="Dealer"
              player={dealer}
              won={finished && winnerKey === dealerKey}
              lost={finished && winnerKey && winnerKey !== dealerKey}
              showAll
              onClick={() => setModalState(<Profile userId={dealer.id} />)}
            />
            <div className="flex items-center justify-center">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#8B5CF622", color: "#8B5CF6" }}>VS</span>
            </div>
            <PlayerHandPanel
              label="Player"
              player={player}
              won={finished && winnerKey === playerKey}
              lost={finished && winnerKey && winnerKey !== playerKey}
              showAll
              onClick={() => setModalState(<Profile userId={player.id} />)}
            />
          </div>
        )}

        {game.PlayerTwo && !finished && (
          <div className="mt-6 flex flex-col items-center gap-2">
            {isMyTurn ? (
              <div className="flex gap-3">
                <button disabled={acting} onClick={() => act("hit")}
                  className="min-w-24 rounded-lg border-none bg-[#8B5CF6] py-2 text-sm font-bold text-white transition-colors hover:bg-[#7C3AED] disabled:opacity-60">
                  Hit
                </button>
                <button disabled={acting} onClick={() => act("stand")}
                  className="min-w-24 rounded-lg border-none bg-[#2A2E44] py-2 text-sm font-bold text-white transition-colors hover:opacity-80 disabled:opacity-60">
                  Stand
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#8B5CF6] font-semibold animate-pulse">
                {game.turn === "player" ? `Waiting for ${player.username} to act…` : "Dealer is playing…"}
              </p>
            )}
          </div>
        )}

        {finished && (
          <div className="mt-6 text-center">
            <p className="text-lg font-bold" style={{ color: "#8B5CF6" }}>
              🏆 {game[winnerKey]?.username} wins!
            </p>
            <p className="text-sm text-[#68749C] mt-1">R${(game.requirements.static || 0).toLocaleString()} pot</p>
          </div>
        )}
      </div>
    </div>
  );
}

const PlayerHandPanel = ({ label, player, won, lost, onClick }) => {
  if (!player) return null;
  return (
    <div className="flex items-center gap-3">
      <button
        className="w-12 h-12 flex-shrink-0 rounded-full overflow-hidden border-2 cursor-pointer border-none p-0 transition-all"
        style={{ borderColor: won ? "#8B5CF6" : lost ? "#374151" : "#2F3347", opacity: lost ? 0.5 : 1 }}
        onClick={onClick}
      >
        <img src={player.thumbnail} alt={player.username} className="w-full h-full object-cover" />
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-white truncate">{player.username}</span>
          <span className="text-[10px] uppercase font-bold text-[#42496B]">{label}{player.isDealer ? " 🎩" : ""}</span>
          {player.busted && <span className="text-[10px] font-bold text-red-400">BUST</span>}
          {player.blackjack && <span className="text-[10px] font-bold text-[#8B5CF6]">BLACKJACK</span>}
        </div>
        <div className="flex gap-1">
          {(player.hand || []).map((c, i) => <CardFace key={i} card={c} size="sm" />)}
        </div>
      </div>
      <span className="text-xl font-black flex-shrink-0" style={{ color: won ? "#8B5CF6" : "#6B7280" }}>
        {player.total}
        {won && " 🏆"}
      </span>
    </div>
  );
};
