import React, { useContext, useEffect, useState } from "react";
import { useModal } from "../../../utils/ModalContext";
import UserContext from "../../../utils/user.js";
import { getauth } from "../../../utils/getauth.js";
import { api } from "../../../config.js";
import { formatLargeNumber } from "@/utils/value";

export default function MinesHistory() {
  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${api}/mines/history/me`, {
      method: "POST",
      headers: { authorization: `Bearer ${getauth()}` },
    })
      .then((r) => r.json())
      .then((d) => { setHistory(d.history || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={() => setModalState(null)}>
      <div className="relative w-full max-w-lg rounded-2xl bg-[#131520] border border-[#252839] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#252839]">
          <div className="flex items-center gap-2">
            <img src="/mines-gem.png" alt="Mines" className="w-5 h-5 object-contain" />
            <h2 className="text-white font-bold">Mines History</h2>
          </div>
          <button className="text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer"
            onClick={() => setModalState(null)}>✕</button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-2">
          {loading ? (
            <div className="text-center text-[#68749C] py-10">Loading…</div>
          ) : history.length === 0 ? (
            <div className="text-center text-[#42496B] py-10 text-sm">No games yet</div>
          ) : history.map((g) => {
            const won = g.winner === userData?.userid;
            const opponent = g.PlayerOne.id === userData?.userid ? g.PlayerTwo : g.PlayerOne;
            return (
              <div key={g._id} className="flex items-center gap-3 p-3 rounded-xl border border-[#252839] bg-[#1a1d2b]">
                <img src={opponent?.thumbnail} alt={opponent?.username}
                  className="w-9 h-9 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">vs {opponent?.username}</p>
                  <p className="text-[10px] text-[#42496B]">
                    {g.minesCount} mines · {new Date(g.end).toLocaleDateString()}
                    {g.crazyMode && <span className="text-red-400 font-bold"> · 🔥 Crazy</span>}
                  </p>
                </div>
                <div className={`text-sm font-bold ${won ? "text-green-400" : "text-red-400"}`}>
                  {won ? "+" : "-"}{formatLargeNumber(g.requirements.static)}
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${won ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {won ? "WIN" : "LOSS"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
