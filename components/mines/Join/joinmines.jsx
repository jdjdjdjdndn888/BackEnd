import React, { useState, useContext } from "react";
import toast from "react-hot-toast";
import { useModal } from "../../../utils/ModalContext";
import UserContext from "../../../utils/user.js";
import { getauth } from "../../../utils/getauth.js";
import { api } from "../../../config.js";
import { formatLargeNumber } from "@/utils/value";

export default function JoinMines({ game, onClose }) {
  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inventory = userData?.inventory || [];

  const min = game.requirements.min;
  const max = game.requirements.max;
  const target = game.requirements.static;

  const toggleItem = (item) => {
    setSelectedItems((prev) =>
      prev.find((i) => i.inventoryid === item._id)
        ? prev.filter((i) => i.inventoryid !== item._id)
        : [...prev, { inventoryid: item._id, itemid: item.itemid }]
    );
  };

  const totalValue = selectedItems.reduce((sum, si) => {
    const inv = inventory.find((i) => i._id === si.inventoryid);
    return sum + (inv?.itemvalue || 0);
  }, 0);

  const inRange = totalValue >= min && totalValue <= max;

  const handleJoin = async () => {
    if (!selectedItems.length) return toast.error("Select at least one item!");
    if (!inRange) return toast.error(`Value must be between ${formatLargeNumber(min)} and ${formatLargeNumber(max)}`);
    setLoading(true);
    try {
      const res = await fetch(`${api}/mines/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ items: selectedItems, gameid: game._id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Joined! Good luck!");
        onClose?.();
        setModalState(null);
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch { toast.error("Something went wrong"); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => { onClose?.(); setModalState(null); }}>
      <div className="relative w-full max-w-lg rounded-2xl bg-[#131520] border border-[#252839] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#252839]">
          <div className="flex items-center gap-3">
            <img src="/mines-gem.png" alt="Mines" className="w-6 h-6 object-contain" />
            <div>
              <h2 className="text-white font-bold text-base">Join Mines Game</h2>
              <p className="text-[#68749C] text-xs mt-0.5">vs {game.PlayerOne.username} · {game.minesCount} mines</p>
            </div>
          </div>
          <button className="text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer"
            onClick={() => { onClose?.(); setModalState(null); }}>✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div className="rounded-lg bg-[#1a1d2b] border border-[#252839] p-3 text-sm">
            <span className="text-[#68749C]">Required value: </span>
            <span className="text-white font-bold">
              <img src="/mines-gem.png" alt="gem" className="w-3 h-3 inline object-contain mr-1" />
              {formatLargeNumber(min)} – {formatLargeNumber(max)}
            </span>
          </div>

          <div>
            <label className="block text-xs text-[#68749C] uppercase tracking-wider mb-2">Your Inventory</label>
            {!inventory.length ? (
              <p className="text-[#42496B] text-sm text-center py-8">No items in inventory</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {inventory.map((item) => {
                  const sel = selectedItems.find((i) => i.inventoryid === item._id);
                  return (
                    <button key={item._id}
                      onClick={() => toggleItem(item)}
                      className={`rounded-lg border p-2 flex flex-col items-center gap-1 cursor-pointer transition-all ${sel ? "border-white bg-white/10" : "border-[#252839] bg-[#1a1d2b] hover:border-white/30"}`}>
                      <img src={item.itemimage} alt={item.itemname} className="w-10 h-10 object-contain" />
                      <span className="text-[10px] text-white font-medium text-center leading-tight line-clamp-2">{item.itemname}</span>
                      <span className="text-[10px] text-[#68749C]">
                        <img src="/mines-gem.png" alt="gem" className="w-2.5 h-2.5 inline object-contain mr-0.5" />
                        {formatLargeNumber(item.itemvalue)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-[#252839] flex items-center justify-between gap-4">
          <div className="text-sm">
            <span className="text-[#68749C]">Total: </span>
            <span className={`font-bold ${inRange ? "text-white" : totalValue > 0 ? "text-red-400" : "text-white"}`}>
              <img src="/mines-gem.png" alt="gem" className="w-3.5 h-3.5 inline object-contain mr-1" />
              {formatLargeNumber(totalValue)}
            </span>
          </div>
          <button
            onClick={handleJoin}
            disabled={loading || !selectedItems.length || !inRange}
            className="bg-white text-black font-bold text-sm px-6 py-2 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors"
          >
            {loading ? "Joining…" : "Join Game"}
          </button>
        </div>
      </div>
    </div>
  );
}
