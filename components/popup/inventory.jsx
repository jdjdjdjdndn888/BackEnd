import React, { useState, useEffect, useContext, useMemo } from "react";
import { useModal } from "../../utils/ModalContext";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import Deposit from "./deposit.jsx";
import toast from "react-hot-toast";

async function fetchMe() {
  const res = await fetch(`${api}/me`, {
    method: "POST",
    headers: { authorization: `Bearer ${getauth()}` },
  });
  const data = await res.json();
  return data?.data || null;
}

export default function InventoryModal() {
  const { setModalState } = useModal();
  const { userData, setUserData } = useContext(UserContext);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await fetch(`${api}/me/inventory`, {
          method: "POST",
          headers: { authorization: `Bearer ${getauth()}` },
        });
        const data = await res.json();
        if (data.data) setInventory(data.data);
        else if (data.inventory) setInventory(data.inventory);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = !search || item.itemname?.toLowerCase().includes(search.toLowerCase());
      const matchesGame = gameFilter === "all" || item.game === gameFilter;
      return matchesSearch && matchesGame;
    });
  }, [inventory, search, gameFilter]);

  const totalValue = inventory.reduce((s, i) => s + (i.itemvalue || 0), 0);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItems = inventory.filter((item) =>
    selected.has(String(item.inventoryid || item._id))
  );

  const selectedValue = selectedItems.reduce((s, i) => s + (i.itemvalue || 0), 0);

  const handleWithdraw = async () => {
    if (withdrawing || selectedItems.length === 0) return;
    setWithdrawing(true);

    const itemsToWithdraw = selectedItems.map((item) => ({
      inventoryid: item.inventoryid || item._id,
    }));

    try {
      const res = await fetch(`${api}/me/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${getauth()}`,
        },
        body: JSON.stringify({ items: itemsToWithdraw }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Withdraw failed");
        return;
      }

      const withdrawnIds = new Set(itemsToWithdraw.map((i) => String(i.inventoryid)));
      setInventory((prev) =>
        prev.filter((item) => !withdrawnIds.has(String(item.inventoryid || item._id)))
      );
      setSelected(new Set());

      toast.success("Items queued for withdrawal!");

      fetchMe().then((fresh) => { if (fresh) setUserData(fresh); }).catch(() => {});

      setModalState(<Deposit />);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setWithdrawing(false);
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
            <h2 className="text-lg font-bold text-white">Inventory</h2>
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
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#252839]">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg bg-[#1C1F2E] border border-[#252839] px-3 py-2 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]"
          />
          {["all", "Sab", "PS99"].map((g) => (
            <button
              key={g}
              onClick={() => setGameFilter(g)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors cursor-pointer ${
                gameFilter === g
                  ? "bg-[#8B5CF6] border-[#8B5CF6] text-white"
                  : "bg-transparent border-[#252839] text-[#6B7280] hover:text-white hover:border-[#6B7280]"
              }`}
            >
              {g === "all" ? "All" : g}
            </button>
          ))}
        </div>

        {/* Item Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-[#6B7280]">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
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
              {filtered.map((item, i) => {
                const id = String(item.inventoryid || item._id);
                const isSelected = selected.has(id);
                return (
                  <div
                    key={id || i}
                    onClick={() => toggleSelect(id)}
                    className={`relative flex flex-col rounded-xl bg-[#1C1F2E] border overflow-hidden group cursor-pointer transition-all select-none ${
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
                          <img
                            src={item.itemimage}
                            alt={item.itemname}
                            className="absolute inset-0 w-full h-full object-contain p-2 z-10"
                          />
                          <img
                            src={item.itemimage}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md scale-110"
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[#6B7280] text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-2">
                      <p className="text-xs font-semibold text-white truncate">
                        {item.itemname || "Unknown"}
                      </p>
                      <p className="text-xs font-bold text-[#8B5CF6] mt-0.5">
                        R${(item.itemvalue || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Withdraw Footer — shown when items are selected */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#252839] bg-[#0f1119]">
            <div className="text-sm text-[#6B7280]">
              <span className="text-white font-semibold">{selected.size}</span> item{selected.size !== 1 ? "s" : ""} selected
              {" · "}
              <span className="text-[#8B5CF6] font-semibold">R${selectedValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="cursor-pointer rounded-lg border border-[#252839] bg-transparent px-3 py-2 text-sm font-semibold text-[#6B7280] hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="cursor-pointer rounded-lg border-none bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7C3AED] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {withdrawing ? "Processing..." : "Withdraw"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
