import React, { useState, useEffect, useContext, useMemo } from "react";
import UserContext from "../../utils/user.js";
import { useModal } from "../../utils/ModalContext";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import toast from "react-hot-toast";

export default function Tip({ userId: propUserId, onClose }) {
  const { userData } = useContext(UserContext);
  const { setModalState } = useModal();

  const [resolvedUserId, setResolvedUserId] = useState(propUserId || null);
  const [resolvedUsername, setResolvedUsername] = useState(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");

  const close = () => (onClose ? onClose() : setModalState(null));

  useEffect(() => {
    if (!resolvedUserId || !userData) return;
    setLoading(true);
    fetch(`${api}/me/inventory`, {
      method: "POST",
      headers: { authorization: `Bearer ${getauth()}` },
    })
      .then((r) => r.json())
      .then((d) => setInventory(d.data || []))
      .catch(() => toast.error("Could not load inventory."))
      .finally(() => setLoading(false));
  }, [resolvedUserId]);

  const lookupUser = async () => {
    if (!usernameInput.trim()) return toast.error("Enter a username!");
    setLookingUp(true);
    try {
      const res = await fetch(`${api}/users/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setResolvedUserId(data.data.userid);
        setResolvedUsername(data.data.username);
      } else {
        toast.error(data.message || "User not found.");
      }
    } catch {
      toast.error("Could not look up user.");
    } finally {
      setLookingUp(false);
    }
  };

  const filtered = useMemo(
    () =>
      inventory.filter(
        (item) =>
          !search || item.itemname?.toLowerCase().includes(search.toLowerCase())
      ),
    [inventory, search]
  );

  const toggle = (item) => {
    setSelected((prev) =>
      prev.some((s) => s.inventoryid === item.inventoryid)
        ? prev.filter((s) => s.inventoryid !== item.inventoryid)
        : [...prev, item]
    );
  };

  const totalValue = selected.reduce((s, i) => s + (i.itemvalue || 0), 0);

  const handleSend = async () => {
    if (!selected.length) return toast.error("Select at least one item!");
    if (!userData) return toast.error("You must be logged in!");

    setSending(true);
    try {
      const res = await fetch(`${api}/users/tip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${getauth()}`,
        },
        body: JSON.stringify({
          items: selected.map((i) => ({ inventoryid: i.inventoryid })),
          touser: resolvedUserId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Tip sent!");
        close();
      } else {
        toast.error(data.message || "Could not send tip.");
      }
    } catch {
      toast.error("Error sending tip.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={close}
    >
      <div
        className="relative flex flex-col w-[95vw] max-w-lg max-h-[80vh] rounded-2xl bg-[#131520] border border-[#252839] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#252839]">
          <div>
            <h2 className="text-base font-bold text-white">
              Send Tip{resolvedUsername ? ` to ${resolvedUsername}` : ""}
            </h2>
            {selected.length > 0 && (
              <p className="text-xs text-[#8B5CF6] mt-0.5">
                {selected.length} item{selected.length > 1 ? "s" : ""} · R$
                {totalValue.toLocaleString()}
              </p>
            )}
          </div>
          <button
            className="text-gray-400 hover:text-white bg-transparent border-none text-2xl cursor-pointer leading-none"
            onClick={close}
          >
            ×
          </button>
        </div>

        {/* User lookup step (when no userId given) */}
        {!resolvedUserId ? (
          <div className="flex flex-col gap-3 p-5">
            {!userData ? (
              <p className="text-center text-[#6B7280] py-4">
                Log in to send tips.
              </p>
            ) : (
              <>
                <p className="text-sm text-[#A6B2D3]">Who do you want to tip?</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Roblox username..."
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && lookupUser()}
                    className="flex-1 rounded-lg bg-[#1C1F2E] border border-[#252839] px-3 py-2 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]"
                  />
                  <button
                    onClick={lookupUser}
                    disabled={lookingUp}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white border-none cursor-pointer disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}
                  >
                    {lookingUp ? "..." : "Find"}
                  </button>
                </div>
                <button
                  onClick={close}
                  className="mt-1 text-sm text-[#6B7280] hover:text-white bg-transparent border-none cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="px-4 py-3 border-b border-[#252839]">
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg bg-[#1C1F2E] border border-[#252839] px-3 py-2 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]"
              />
            </div>

            {/* Item grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {!userData ? (
                <p className="text-center text-[#6B7280] py-8">
                  Log in to send tips.
                </p>
              ) : loading ? (
                <p className="text-center text-[#6B7280] py-8">
                  Loading inventory...
                </p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[#6B7280] py-8">
                  No items found.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {filtered.map((item) => {
                    const isSelected = selected.some(
                      (s) => s.inventoryid === item.inventoryid
                    );
                    return (
                      <button
                        key={item.inventoryid}
                        onClick={() => toggle(item)}
                        className={`relative flex flex-col rounded-xl border-2 overflow-hidden text-left cursor-pointer transition-all bg-transparent p-0 ${
                          isSelected
                            ? "border-[#8B5CF6] scale-[1.03]"
                            : "border-[#252839] hover:border-[#8B5CF680]"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 z-10 w-3 h-3 rounded-full bg-[#8B5CF6]" />
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
                              No img
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5 bg-[#1C1F2E]">
                          <p className="text-[11px] font-semibold text-white truncate">
                            {item.itemname || "Unknown"}
                          </p>
                          <p className="text-[11px] font-bold text-[#8B5CF6]">
                            R${(item.itemvalue || 0).toLocaleString()}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#252839]">
              <button
                onClick={close}
                className="flex-1 rounded-xl border border-[#252839] bg-transparent py-2 text-sm font-semibold text-[#6B7280] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !selected.length}
                className="flex-1 rounded-xl border-none py-2 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}
              >
                {sending
                  ? "Sending..."
                  : `Send ${selected.length > 0 ? `(${selected.length})` : ""}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
