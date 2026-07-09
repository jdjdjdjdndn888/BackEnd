import React, { useState, useContext } from "react";
import toast from "react-hot-toast";
import { useModal } from "../../../utils/ModalContext";
import UserContext from "../../../utils/user.js";
import { getauth } from "../../../utils/getauth.js";
import { api } from "../../../config.js";
import { formatLargeNumber } from "@/utils/value";
import { X, Bomb } from "lucide-react";

export default function CreateMines({ onCreate, onClose }) {
  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const [selectedItems, setSelectedItems] = useState([]);
  const [minesCount, setMinesCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const inventory = userData?.inventory || [];

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

  const handleCreate = async () => {
    if (!selectedItems.length) return toast.error("Select at least one item!");
    setLoading(true);
    try {
      const res = await fetch(`${api}/mines/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ items: selectedItems, minesCount }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Mines game created!");
        onCreate?.(data.data);
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
            <h2 className="text-white font-bold text-base">Create Mines Game</h2>
          </div>
          <button className="text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer"
            onClick={() => { onClose?.(); setModalState(null); }}>✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Mines count selector */}
          <div>
            <label className="block text-xs text-[#68749C] uppercase tracking-wider mb-2 flex items-center gap-1">
              <img src="/mines-bomb.png" alt="bomb" className="w-3 h-3 object-contain" />
              Number of Mines: <span className="text-white font-bold ml-1">{minesCount}</span>
            </label>
            <input type="range" min={1} max={20} value={minesCount}
              onChange={(e) => setMinesCount(Number(e.target.value))}
              className="w-full accent-white" />
            <div className="flex justify-between text-[10px] text-[#42496B] mt-1">
              <span>1 (Easy)</span><span>10</span><span>20 (Hard)</span>
            </div>
          </div>

          {/* Inventory */}
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
          <div className="text-sm text-[#68749C]">
            Total: <span className="text-white font-bold">
              <img src="/mines-gem.png" alt="gem" className="w-3.5 h-3.5 inline object-contain mr-1" />
              {formatLargeNumber(totalValue)}
            </span>
          </div>
          <button
            onClick={handleCreate}
            disabled={loading || !selectedItems.length}
            className="bg-white text-black font-bold text-sm px-6 py-2 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors"
          >
            {loading ? "Creating…" : "Create Game"}
          </button>
        </div>
      </div>
    </div>
  );
}
