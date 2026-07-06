import React, { useEffect, useState } from "react";
import { useModal } from "../../../utils/ModalContext";
import { getauth } from "../../../utils/getauth.js";
import { api } from "../../../config.js";
import { formatLargeNumber } from "@/utils/value";
import toast from "react-hot-toast";
import { CardFace } from "../View/view.jsx";

export default function BlackjackHistory() {
  const { setModalState } = useModal();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${api}/blackjack/history/me`, {
      method: "POST",
      headers: { authorization: `Bearer ${getauth()}` },
    })
      .then((r) => r.json())
      .then((d) => { setHistory(d.history || []); setLoading(false); })
      .catch(() => { toast.error("Failed to load history"); setLoading(false); });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setModalState(null)}>
      <div className="relative w-full max-w-lg rounded-2xl bg-[#131520] border border-[#252839] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button className="absolute right-4 top-4 text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer" onClick={() => setModalState(null)}>✕</button>
        <div className="p-5 border-b border-[#252839]">
          <h2 className="text-lg font-bold text-white">🃏 Blackjack History</h2>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto flex flex-col gap-2">
          {loading && <p className="text-center text-[#68749C] py-8">Loading...</p>}
          {!loading && !history.length && <p className="text-center text-[#68749C] py-8">No games yet.</p>}
          {history.map((g) => (
            <div key={g._id} className="flex items-center gap-3 rounded-xl border border-[#252839] bg-[#1C1F2E] p-3">
              <div className="flex gap-1">
                {(g.PlayerOne.hand || []).slice(0, 2).map((c, i) => (
                  <CardFace key={i} card={c} size="xs" />
                ))}
              </div>
              <span className="text-[#68749C] text-sm">{g.PlayerOne.total} vs {g.PlayerTwo?.total}</span>
              <div className="ml-auto flex flex-col items-end gap-0.5">
                <span className={`text-sm font-bold ${g.winner === g.PlayerOne.id ? "text-green-400" : "text-red-400"}`}>
                  {g.winner === g.PlayerOne.id ? "Won" : "Lost"}
                </span>
                <span className="text-xs text-[#42496B]">R${formatLargeNumber(g.requirements.static)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
