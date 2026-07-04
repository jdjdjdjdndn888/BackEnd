import React, { useState, useEffect, useContext, useMemo } from "react";
import toast from "react-hot-toast";
import UserContext from "../../utils/user.js";
import { useModal } from "../../utils/ModalContext.jsx";
import { getauth } from "../../utils/getauth.js";
import { api } from "../../config.js";
import { formatLargeNumber } from "@/utils/value";

export default function CreateTradeListing({ onCreated }) {
  const { userData } = useContext(UserContext);
  const { setModalState } = useModal();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [wantedDescription, setWantedDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${api}/me/inventory`, {
          method: "POST",
          headers: { authorization: `Bearer ${getauth()}` },
        });
        const data = await res.json();
        if (res.ok) setInventory(data.data || []);
        else toast.error(data.message);
      } catch {
        toast.error("Failed to load inventory.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredInventory = useMemo(() => {
    return inventory.filter(
      (item) => item.itemname?.toLowerCase().includes(searchTerm.toLowerCase()) && !item.locked,
    ).sort((a, b) => b.itemvalue - a.itemvalue);
  }, [inventory, searchTerm]);

  const toggleItem = (item) => {
    setSelectedItems((prev) => {
      const exists = prev.some((s) => s.inventoryid === item.inventoryid);
      return exists ? prev.filter((s) => s.inventoryid !== item.inventoryid) : [...prev, item];
    });
  };

  const selectedValue = selectedItems.reduce((s, i) => s + (i.itemvalue || 0), 0);

  const create = async () => {
    if (!selectedItems.length) return toast.error("Select items to trade!");
    setCreating(true);
    try {
      const res = await fetch(`${api}/trades/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({
          items: selectedItems.map((i) => ({ inventoryid: i.inventoryid })),
          wantedDescription,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Trade listing created!");
        onCreated?.(data.data);
        closeModal();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setCreating(false);
    }
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => setModalState(null), 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeModal}>
      <div
        className={`relative w-full max-w-lg rounded-2xl border border-[#252839] bg-[#0d0f1a] shadow-2xl overflow-hidden transition-all ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2035]">
          <h2 className="text-white font-bold text-lg">List Items for Trade</h2>
          <button onClick={closeModal} className="text-[#6B7280] hover:text-white bg-transparent border-none cursor-pointer text-xl leading-none">×</button>
        </div>

        <div className="p-4">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-[#252839] bg-[#131623] px-3 py-2 text-sm text-white placeholder-[#42496B] outline-none mb-3"
          />

          <div className="max-h-52 overflow-y-auto grid grid-cols-2 gap-2 mb-3">
            {loading ? (
              <div className="col-span-2 flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-[#6B7280] text-sm">No items available</div>
            ) : (
              filteredInventory.map((item) => {
                const selected = selectedItems.some((s) => s.inventoryid === item.inventoryid);
                return (
                  <button
                    key={item.inventoryid}
                    onClick={() => toggleItem(item)}
                    className={`flex items-center gap-2 rounded-lg border p-2 text-left cursor-pointer transition-all ${selected ? "border-[#8B5CF6] bg-[#8B5CF615]" : "border-[#252839] bg-[#131623] hover:border-[#42496B]"}`}
                  >
                    {item.itemimage && (
                      <img src={item.itemimage} alt={item.itemname} className="w-8 h-8 object-contain flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-xs font-medium truncate">{item.itemname}</p>
                      <p className="text-[#8B5CF6] text-[11px]">R${item.itemvalue?.toLocaleString()}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <textarea
            placeholder="Describe what you want in return (optional)..."
            value={wantedDescription}
            onChange={(e) => setWantedDescription(e.target.value)}
            maxLength={200}
            rows={2}
            className="w-full rounded-lg border border-[#252839] bg-[#131623] px-3 py-2 text-sm text-white placeholder-[#42496B] outline-none resize-none mb-3"
          />

          <div className="flex items-center justify-between">
            <div className="text-sm text-[#6B7280]">
              <span className="text-white font-semibold">{selectedItems.length}</span> items ·{" "}
              <span className="text-[#8B5CF6] font-semibold">R${formatLargeNumber(selectedValue)}</span>
            </div>
            <button
              onClick={create}
              disabled={creating || !selectedItems.length}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}
            >
              {creating ? "Creating..." : "Create Listing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
