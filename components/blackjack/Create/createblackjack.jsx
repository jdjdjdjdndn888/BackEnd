import React, { useContext, useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import UserContext from "../../../utils/user.js";
import { useModal } from "../../../utils/ModalContext";
import { getauth } from "../../../utils/getauth.js";
import Deposit from "../../popup/deposit.jsx";
import { api } from "../../../config.js";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { formatLargeNumber } from "@/utils/value";

export default function CreateBlackjack({ onCreate, onClose }) {
  const { userData } = useContext(UserContext);
  const { setModalState } = useModal();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedValue, setSelectedValue] = useState(0);
  const [sortOrder, setSortOrder] = useState("highest");
  const [selectedGame, setSelectedGame] = useState("all");
  const [crazyMode, setCrazyMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const loadInventory = async () => {
    if (!userData) { toast.error("Not logged in!"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${api}/me/inventory`, {
        method: "POST",
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const data = await res.json();
      if (res.ok) {
        setInventory(data.data);
        setTotalValue(data.data.reduce((s, i) => s + (i.itemvalue || 0), 0));
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Failed to load inventory."); }
    setLoading(false);
  };

  useEffect(() => { loadInventory(); }, []);

  const toggleItem = (item) => {
    if (item.locked) { toast.error("Cannot select locked items!"); return; }
    if (item.itemvalue === 0) { toast.error("Cannot select zero-value items!"); return; }
    const isSelected = selectedItems.some((s) => s.inventoryid === item.inventoryid);
    if (isSelected) {
      setSelectedItems((p) => p.filter((s) => s.inventoryid !== item.inventoryid));
      setSelectedValue((p) => p - item.itemvalue);
    } else {
      setSelectedItems((p) => [...p, item]);
      setSelectedValue((p) => p + item.itemvalue);
    }
  };

  const filteredInventory = useMemo(() => {
    let f = inventory.filter((i) =>
      i.itemname?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedGame === "all" || i.game === selectedGame)
    );
    const sel = new Set(selectedItems.map((i) => i.inventoryid));
    const selFirst = f.filter((i) => sel.has(i.inventoryid));
    const rest = f.filter((i) => !sel.has(i.inventoryid));
    const sortFn = sortOrder === "lowest" ? (a, b) => a.itemvalue - b.itemvalue : (a, b) => b.itemvalue - a.itemvalue;
    return [...selFirst.sort(sortFn), ...rest.sort(sortFn)];
  }, [inventory, searchTerm, selectedGame, sortOrder, selectedItems]);

  const createGame = async () => {
    if (!selectedItems.length) { toast.error("Select items!"); return; }
    setCreating(true);
    try {
      const res = await fetch(`${api}/blackjack/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ items: selectedItems.map((i) => ({ inventoryid: i.inventoryid })), crazyMode }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Blackjack game created!");
        onCreate?.(data.data);
        closeModal();
      } else {
        toast.error(data.message);
      }
    } catch { toast.error("Something went wrong."); }
    setCreating(false);
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => setModalState(null), 200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={closeModal}
    >
      <div
        className={`relative w-full max-w-2xl rounded-2xl bg-[#131520] border border-[#252839] shadow-2xl overflow-hidden transition-all ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute right-4 top-4 text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer z-10" onClick={closeModal}>✕</button>

        <div className="p-5 border-b border-[#252839] flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">🃏 Create Blackjack 1v1</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-[#252839]">
          <div className="relative flex-1 min-w-[160px]">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[#252839] bg-[#1C1F2E] px-3 py-2 text-sm text-white placeholder-[#42496B] outline-none"
            />
          </div>
          <Select onValueChange={setSortOrder} value={sortOrder}>
            <SelectTrigger className="h-9 w-40 rounded-lg border border-[#252839] bg-[#1C1F2E] px-3 text-sm text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1C1F2D] border border-[#252839] rounded-lg p-1 mt-1">
              <SelectItem className="text-white px-3 py-2 cursor-pointer" value="highest">High → Low</SelectItem>
              <SelectItem className="text-white px-3 py-2 cursor-pointer" value="lowest">Low → High</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={setSelectedGame} value={selectedGame}>
            <SelectTrigger className="h-9 w-32 rounded-lg border border-[#252839] bg-[#1C1F2E] px-3 text-sm text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1C1F2D] border border-[#252839] rounded-lg p-1 mt-1">
              {["all", "Sab", "PS99"].map((g) => (
                <SelectItem key={g} className="text-white px-3 py-2 cursor-pointer" value={g}>{g === "all" ? "All Games" : g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4 px-5 py-2 border-b border-[#252839] text-sm text-[#68749C]">
          <span>💰 R${formatLargeNumber(totalValue)}</span>
          <span>📦 {inventory.length} items</span>
          <button className="ml-auto text-[#8B5CF6] font-semibold hover:underline text-xs" onClick={() => setModalState(<Deposit />)}>+ Deposit</button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-5 max-h-64 overflow-y-auto">
          {loading && <div className="col-span-full text-center text-[#68749C] py-8">Loading...</div>}
          {!loading && filteredInventory.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-[#68749C]">No items found</p>
              <button className="text-[#8B5CF6] text-sm font-semibold hover:underline" onClick={() => setModalState(<Deposit />)}>Deposit items</button>
            </div>
          )}
          {filteredInventory.map((item) => {
            const isSelected = selectedItems.some((s) => s.inventoryid === item.inventoryid);
            return (
              <div
                key={item.inventoryid}
                onClick={() => toggleItem(item)}
                className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all p-1.5 ${isSelected ? "border-[#8B5CF6] bg-[#8B5CF620]" : "border-[#252839] bg-[#1C1F2E] hover:border-[#3A3F5C]"}`}
              >
                <img src={item.itemimage} alt={item.itemname} className="w-full aspect-square object-contain" />
                <p className="text-[10px] text-center text-[#68749C] mt-1 truncate">{item.itemname}</p>
                <p className="text-[10px] text-center text-[#8B5CF6] font-bold">R${formatLargeNumber(item.itemvalue)}</p>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#252839]">
          {/* Crazy Mode toggle */}
          <div className="px-5 pt-4">
            <button
              type="button"
              onClick={() => setCrazyMode((c) => !c)}
              className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                crazyMode ? "border-red-500/60 bg-red-500/10" : "border-[#252839] bg-[#1a1d2b] hover:border-white/20"
              }`}
            >
              <div>
                <p className={`text-sm font-bold flex items-center gap-1.5 ${crazyMode ? "text-red-400" : "text-white"}`}>
                  <img src="/crazy-mode.png" alt="crazy" className="w-5 h-5 object-contain inline-block" />
                  Crazy Mode {crazyMode ? "ON" : "OFF"}
                </p>
                <p className="text-[11px] text-[#68749C] mt-0.5">
                  Flips the rules — whoever normally loses wins instead.
                </p>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ml-2 ${crazyMode ? "bg-red-500" : "bg-[#252839]"}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${crazyMode ? "translate-x-4" : ""}`} />
              </div>
            </button>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm text-[#68749C]">{selectedItems.length} items selected</p>
              <p className="text-lg font-bold text-white">R${formatLargeNumber(selectedValue)}</p>
            </div>
            <button
              onClick={createGame}
              disabled={creating || !selectedItems.length}
              className="rounded-xl px-6 py-2.5 text-sm font-bold text-white border-none cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}
            >
              {creating ? "Creating..." : `Create R${formatLargeNumber(selectedValue)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
