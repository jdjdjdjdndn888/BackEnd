import React, { useEffect, useState, useContext } from "react";
import { useModal } from "../../../utils/ModalContext";
import UserContext from "../../../utils/user.js";
import { getauth } from "../../../utils/getauth.js";
import { api } from "../../../config.js";
import Profile from "../../popup/profile";
import toast from "react-hot-toast";

export default function DiceView({ game, onClose }) {
  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const [displayDice, setDisplayDice] = useState({ p1: [null, null, null], p2: [null, null, null] });
  const [rolling, setRolling] = useState(false);
  const [done, setDone] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isCreator = userData?.userid === game.PlayerOne.id;
  const canCancel = isCreator && !game.PlayerTwo && game.active;

  useEffect(() => {
    if (!game.PlayerTwo || game.active) {
      setDone(false);
      setDisplayDice({ p1: [null, null, null], p2: [null, null, null] });
      return;
    }
    setRolling(true);
    setDone(false);
    let frame = 0;
    const totalFrames = 25;
    const interval = setInterval(() => {
      frame++;
      setDisplayDice({ p1: [rand(), rand(), rand()], p2: [rand(), rand(), rand()] });
      if (frame >= totalFrames) {
        clearInterval(interval);
        setDisplayDice({ p1: game.PlayerOne.dice || [1, 1, 1], p2: game.PlayerTwo.dice || [1, 1, 1] });
        setRolling(false);
        setDone(true);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [game._id, game.PlayerTwo, game.active]);

  const rand = () => Math.floor(Math.random() * 6) + 1;
  const p1Won = game.winner === game.PlayerOne.id;
  const p2Won = game.winner === game.PlayerTwo?.id;

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`${api}/dice/cancel`, {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => { onClose?.(); setModalState(null); }}>
      <div className="relative w-full max-w-lg rounded-2xl bg-[#131520] border border-[#252839] shadow-2xl overflow-hidden p-6"
        onClick={(e) => e.stopPropagation()}>

        <button className="absolute right-4 top-4 text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer z-10"
          onClick={() => { onClose?.(); setModalState(null); }}>✕</button>

        <h2 className="text-center text-lg font-bold text-white mb-6">🎲 Dice Roll</h2>

        <div className="flex items-center justify-around gap-4">
          <PlayerDicePanel
            player={game.PlayerOne}
            dice={displayDice.p1}
            rolling={rolling}
            won={done && p1Won}
            lost={done && !p1Won}
            onClick={() => setModalState(<Profile userId={game.PlayerOne.id} />)}
          />

          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-black text-[#B0B8C1]">VS</span>
            {done && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#8B5CF622", color: "#8B5CF6" }}>
                {game.PlayerOne.total} : {game.PlayerTwo.total}
              </span>
            )}
          </div>

          {game.PlayerTwo ? (
            <PlayerDicePanel
              player={game.PlayerTwo}
              dice={displayDice.p2}
              rolling={rolling}
              won={done && p2Won}
              lost={done && !p2Won}
              onClick={() => setModalState(<Profile userId={game.PlayerTwo.id} />)}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#252839] flex items-center justify-center text-2xl text-[#42496B]">?</div>
              <span className="text-sm text-[#42496B]">Waiting...</span>
              <div className="flex gap-1">
                {[null, null, null].map((_, i) => <DieBox key={i} value={null} />)}
              </div>
            </div>
          )}
        </div>

        {done && (
          <div className="mt-6 text-center">
            <p className="text-lg font-bold" style={{ color: "#8B5CF6" }}>
              🏆 {p1Won ? game.PlayerOne.username : game.PlayerTwo?.username} wins!
            </p>
            <p className="text-sm text-[#68749C] mt-1">R${(game.requirements.static || 0).toLocaleString()} pot</p>
          </div>
        )}
        {!game.PlayerTwo && (
          <p className="mt-4 text-center text-sm text-[#68749C]">Waiting for an opponent to join…</p>
        )}
        {game.PlayerTwo && !done && (
          <p className="mt-4 text-center text-sm text-[#8B5CF6] font-semibold animate-pulse">Rolling dice…</p>
        )}

        {/* Cancel button for creator when no one joined */}
        {canCancel && (
          <div className="mt-4">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-colors bg-transparent disabled:opacity-40"
            >
              {cancelling ? "Cancelling…" : "Cancel Game"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const PlayerDicePanel = ({ player, dice, rolling, won, lost, onClick }) => (
  <div className="flex flex-col items-center gap-3">
    <button
      className="w-16 h-16 rounded-full overflow-hidden border-2 cursor-pointer border-none p-0 transition-all"
      style={{ borderColor: won ? "#8B5CF6" : lost ? "#374151" : "#2F3347", opacity: lost ? 0.5 : 1 }}
      onClick={onClick}
    >
      <img src={player.thumbnail} alt={player.username} className="w-full h-full object-cover" />
    </button>
    <span className="text-sm font-semibold text-white max-w-[100px] truncate">{player.username}</span>
    <div className="flex gap-2">
      {dice.map((v, i) => <DieBox key={i} value={v} rolling={rolling} />)}
    </div>
    {!rolling && dice[0] !== null && (
      <span className="text-xl font-black" style={{ color: won ? "#8B5CF6" : "#6B7280" }}>
        {dice.reduce((a, b) => a + (b || 0), 0)}
        {won && " 🏆"}
      </span>
    )}
  </div>
);

const DieBox = ({ value, rolling }) => (
  <div
    className="w-12 h-12 rounded-xl border-2 border-[#8B5CF6] bg-[#1a1d2b] flex items-center justify-center font-black text-xl text-white transition-all"
    style={{
      animation: rolling && value !== null ? "diceSpin 0.08s linear infinite" : "none",
      boxShadow: value !== null ? "0 0 12px #8B5CF640" : "none",
    }}
  >
    {value !== null ? value : "·"}
  </div>
);
