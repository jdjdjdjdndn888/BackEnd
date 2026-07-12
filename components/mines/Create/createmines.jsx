import React, { useState, useContext, useEffect } from "react";
import toast from "react-hot-toast";
import { useModal } from "../../../utils/ModalContext";
import UserContext from "../../../utils/user.js";
import { getauth } from "../../../utils/getauth.js";
import { api } from "../../../config.js";
import { formatLargeNumber } from "@/utils/value";

export default function CreateMines({ onCreate, onClose }) {
  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const [inventory, setInventory] = useState([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [minesCount, setMinesCount] = useState(5);
  const [crazyMode, setCrazyMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("high");

  // Fetch inventory the same way coinflip does — from /me/inventory
  useEffect(() => {
    if (!userData) return;
    setLoadingInv(true);
    fetch(`${api}/me/inventory`, {
      method: "POST",
      headers: { authorization: `Bearer ${getauth()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setInventory(d.data || []);
      })
      .catch(() => toast.error("Failed to load inventory."))
      .finally(() => setLoadingInv(false));
  }, [userData]);

  const toggleItem = (item) => {
    setSelectedItems((prev) =>
      prev.find((i) => i.inventoryid === item.inventoryid)
        ? prev.filter((i) => i.inventoryid !== item.inventoryid)
        : [...prev, { inventoryid: item.inventoryid, itemid: item.itemid }]
    );
  };

  const totalValue = selectedItems.reduce((sum, si) => {
    const inv = inventory.find((i) => i.inventoryid === si.inventoryid);
    return sum + (inv?.itemvalue || 0);
  }, 0);

  const filteredInventory = inventory
    .filter((i) => !searchTerm || i.itemname?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) =>
      sortOrder === "high" ? b.itemvalue - a.itemvalue : a.itemvalue - b.itemvalue
    );

  const handleCreate = async () => {
    if (!selectedItems.length) return toast.error("Select at least one item!");
    setLoading(true);
    try {
      const res = await fetch(`${api}/mines/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ items: selectedItems, minesCount, crazyMode }),
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

  const selectAll = () => {
    if (selectedItems.length === filteredInventory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredInventory.map((i) => ({ inventoryid: i.inventoryid, itemid: i.itemid })));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={() => { onClose?.(); setModalState(null); }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#131520] border border-[#252839] shadow-2xl overflow-hidden"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#252839] flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src="/mines-gem.png" alt="Mines" className="w-6 h-6 object-contain" />
            <h2 className="text-white font-bold text-base">Create Mines Game</h2>
          </div>
          <button
            className="text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer"
            onClick={() => { onClose?.(); setModalState(null); }}
          >✕</button>
        </div>

        {/* Body — scrollable */}
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          {/* Mines count slider */}
          <div>
            <label className="block text-xs text-[#68749C] uppercase tracking-wider mb-2 flex items-center gap-1">
              <img src="/mines-bomb.png" alt="bomb" className="w-3 h-3 object-contain" />
              Number of Mines: <span className="text-white font-bold ml-1">{minesCount}</span>
            </label>
            <input
              type="range" min={1} max={20} value={minesCount}
              onChange={(e) => setMinesCount(Number(e.target.value))}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-[10px] text-[#42496B] mt-1">
              <span>1 (Easy)</span><span>10</span><span>20 (Hard)</span>
            </div>
          </div>

          {/* Crazy Mode toggle */}
          <button
            type="button"
            onClick={() => setCrazyMode((c) => !c)}
            className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
              crazyMode
                ? "border-red-500/60 bg-red-500/10"
                : "border-[#252839] bg-[#1a1d2b] hover:border-white/20"
            }`}
          >
            <div>
              <p className={`text-sm font-bold ${crazyMode ? "text-red-400" : "text-white"}`}>
                🔥 Crazy Mode {crazyMode ? "ON" : "OFF"}
              </p>
              <p className="text-[11px] text-[#68749C] mt-0.5">
                Flips the rules — whoever hits the mine WINS instead of losing.
              </p>
            </div>
            <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${crazyMode ? "bg-red-500" : "bg-[#252839]"}`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${crazyMode ? "translate-x-4" : ""}`} />
            </div>
          </button>

          {/* Search + sort */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search items…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-[#1a1d2b] border border-[#252839] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#42496B] outline-none focus:border-white/20"
            />
            <button
              onClick={() => setSortOrder((s) => s === "high" ? "low" : "high")}
              className="px-3 py-1.5 rounded-lg border border-[#252839] bg-[#1a1d2b] text-xs text-[#68749C] hover:text-white transition-colors"
            >
              {sortOrder === "high" ? "High → Low" : "Low → High"}
            </button>
          </div>

          {/* Inventory label + select all */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-[#68749C] uppercase tracking-wider">
              Your Inventory
              {!loadingInv && inventory.length > 0 && (
                <span className="ml-2 text-[#42496B] normal-case not-italic">({inventory.length} items)</span>
              )}
            </label>
            {!loadingInv && filteredInventory.length > 0 && (
              <button
                onClick={selectAll}
                className="text-[10px] text-[#68749C] hover:text-white bg-transparent border-none cursor-pointer"
              >
                {selectedItems.length === filteredInventory.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>

          {/* Inventory grid */}
          {loadingInv ? (
            <div className="text-center text-[#42496B] text-sm py-8">Loading inventory…</div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center text-[#42496B] text-sm py-8">
              {inventory.length === 0 ? "No items in inventory" : "No items match your search"}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredInventory.map((item) => {
                const sel = selectedItems.find((i) => i.inventoryid === item.inventoryid);
                return (
                  <button
                    key={item.inventoryid}
                    onClick={() => toggleItem(item)}
                    className={`rounded-lg border p-2 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      sel
                        ? "border-white bg-white/10"
                        : "border-[#252839] bg-[#1a1d2b] hover:border-white/30"
                    }`}
                  >
                    <img
                      src={item.itemimage}
                      alt={item.itemname}
                      className="w-10 h-10 object-contain"
                      onError={(e) => { e.currentTarget.src = "/mines-gem.png"; }}
                    />
                    <span className="text-[10px] text-white font-medium text-center leading-tight line-clamp-2">
                      {item.itemname}
                    </span>
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

        {/* Footer */}
        <div className="p-5 border-t border-[#252839] flex items-center justify-between gap-4 flex-shrink-0">
          <div className="text-sm text-[#68749C]">
            Total:{" "}
            <span className="text-white font-bold">
              <img src="/mines-gem.png" alt="gem" className="w-3.5 h-3.5 inline object-contain mr-1" />
              {formatLargeNumber(totalValue)}
            </span>
            {selectedItems.length > 0 && (
              <span className="text-[#42496B] ml-2">({selectedItems.length} items)</span>
            )}
            {crazyMode && <span className="text-red-400 ml-2 font-bold">🔥 Crazy Mode</span>}
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
