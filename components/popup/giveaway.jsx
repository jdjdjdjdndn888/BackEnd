import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import toast from "react-hot-toast";
import UserContext from "../../utils/user.js";
import { useModal } from "../../utils/ModalContext";
import { getauth } from "../../utils/getauth.js";
import Deposit from "./deposit.jsx";
import { api } from "../../config.js";
import { formatLargeNumber } from "@/utils/value";

export default function Giveaway() {
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
  const [submitting, setSubmitting] = useState(false);
  const [time, setTime] = useState(10);

  const loadInventory = useCallback(async () => {
    if (!userData) {
      toast.error("You are not logged in!");
      return;
    }
    setLoading(true);
    setInventory([]);
    try {
      const response = await fetch(`${api}/me/inventory`, {
        method: "POST",
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const data = await response.json();
      if (response.ok) {
        setInventory(data.data);
        setTotalValue(data.data.reduce((sum, item) => sum + (item.itemvalue || 0), 0));
      } else {
        toast.error(data.message || "Failed to load inventory.");
      }
    } catch {
      toast.error("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const toggleItem = useCallback((item) => {
    if (item.locked) {
      toast.error("Locked items cannot be selected.");
      return;
    }
    setSelectedItems((prev) => {
      const alreadySelected = prev.some(({ inventoryid }) => inventoryid === item.inventoryid);
      const next = alreadySelected
        ? prev.filter(({ inventoryid }) => inventoryid !== item.inventoryid)
        : [...prev, item];
      setSelectedValue(next.reduce((s, i) => s + (i.itemvalue || 0), 0));
      return next;
    });
  }, []);

  const filteredInventory = useMemo(() => {
    let filtered = inventory.filter(
      (item) =>
        item.itemname?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedGame === "all" || item.game === selectedGame)
    );
    const selectedSet = new Set(selectedItems.map(({ inventoryid }) => inventoryid));
    const sel = filtered.filter(({ inventoryid }) => selectedSet.has(inventoryid));
    const unsel = filtered.filter(({ inventoryid }) => !selectedSet.has(inventoryid));
    const sortFn = sortOrder === "lowest"
      ? (a, b) => a.itemvalue - b.itemvalue
      : (a, b) => b.itemvalue - a.itemvalue;
    return [...sel.sort(sortFn), ...unsel.sort(sortFn)];
  }, [inventory, searchTerm, selectedGame, sortOrder, selectedItems]);

  const handleTimeChange = (e) => {
    let v = e.target.value;
    if (v === "") { setTime(""); return; }
    v = Math.min(60, Math.max(1, Number(v)));
    setTime(v);
  };

  const giveawayItems = async () => {
    if (selectedItems.length === 0) { toast.error("Select items!"); return; }
    setSubmitting(true);
    try {
      const response = await fetch(`${api}/giveaways/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${getauth()}`,
        },
        body: JSON.stringify({
          items: selectedItems.map(({ inventoryid }) => ({ inventoryid })),
          time: Number(time) || 10,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || "Could not create the giveaway");
        return;
      }
      toast.success("Giveaway created successfully!");
      setModalState(null);
    } catch {
      toast.error("Something went wrong...");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={() => setModalState(null)}
    >
      <div
        className="relative flex flex-col w-[95vw] max-w-4xl max-h-[85vh] rounded-2xl bg-[#131520] border border-[#252839] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#252839]">
          <div>
            <h2 className="text-lg font-bold text-white">Create Giveaway</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {inventory.length} items · R${totalValue.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalState(<Deposit />)}
              className="cursor-pointer rounded-lg border-none bg-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7C3AED]"
            >
              + Deposit
            </button>
            <button
              className="text-gray-400 hover:text-white bg-transparent border-none text-2xl cursor-pointer leading-none"
              onClick={() => setModalState(null)}
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-[#252839]">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[140px] rounded-lg bg-[#1C1F2E] border border-[#252839] px-3 py-2 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]"
          />
          {["all", "Sab", "PS99"].map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGame(g)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors cursor-pointer ${
                selectedGame === g
                  ? "bg-[#8B5CF6] border-[#8B5CF6] text-white"
                  : "bg-transparent border-[#252839] text-[#6B7280] hover:text-white hover:border-[#6B7280]"
              }`}
            >
              {g === "all" ? "All" : g}
            </button>
          ))}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="rounded-lg bg-[#1C1F2E] border border-[#252839] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] cursor-pointer"
          >
            <option value="highest">Highest → Lowest</option>
            <option value="lowest">Lowest → Highest</option>
          </select>
        </div>

        {/* Item Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-[#6B7280]">Loading...</div>
          ) : filteredInventory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-[#6B7280]">
              <p className="text-base font-medium">No items found</p>
              <button
                onClick={() => setModalState(<Deposit />)}
                className="cursor-pointer rounded-lg border-none bg-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7C3AED]"
              >
                Deposit Items
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredInventory.map((item) => {
                const isSelected = selectedItems.some(
                  ({ inventoryid }) => inventoryid === item.inventoryid
                );
                return (
                  <div
                    key={item.inventoryid}
                    onClick={() => toggleItem(item)}
                    className={`relative flex flex-col rounded-xl bg-[#1C1F2E] border overflow-hidden cursor-pointer transition-all select-none ${
                      isSelected
                        ? "border-[#8B5CF6] ring-2 ring-[#8B5CF6]/50"
                        : "border-[#252839] hover:border-[#8B5CF6]/50"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center shadow">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    <div className="relative aspect-square bg-[#12141f] overflow-hidden">
                      {item.itemimage ? (
                        <>
                          <img src={item.itemimage} alt={item.itemname} className="absolute inset-0 w-full h-full object-contain p-2 z-10" />
                          <img src={item.itemimage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md scale-110" />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[#6B7280] text-xs">No image</div>
                      )}
                    </div>
                    <div className="px-2 py-2">
                      <p className="text-xs font-semibold text-white truncate">{item.itemname || "Unknown"}</p>
                      <p className="text-xs font-bold text-[#8B5CF6] mt-0.5">R${(item.itemvalue || 0).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[#252839] bg-[#0f1119]">
          <div className="flex items-center gap-3">
            <label className="text-sm text-[#6B7280] whitespace-nowrap">Duration (min)</label>
            <input
              type="number"
              value={time}
              onChange={handleTimeChange}
              onBlur={() => { if (!time) setTime(10); }}
              min="1"
              max="60"
              className="w-20 rounded-lg bg-[#1C1F2E] border border-[#252839] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6] text-center"
            />
          </div>
          <div className="flex items-center gap-2">
            {selectedItems.length > 0 && (
              <span className="text-sm text-[#6B7280]">
                <span className="text-white font-semibold">{selectedItems.length}</span> selected ·{" "}
                <span className="text-[#8B5CF6] font-semibold">R${formatLargeNumber(selectedValue)}</span>
              </span>
            )}
            <button
              onClick={giveawayItems}
              disabled={submitting || selectedItems.length === 0}
              className="cursor-pointer rounded-lg border-none bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : `Create Giveaway${selectedItems.length > 0 ? ` · R$${formatLargeNumber(selectedValue)}` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
