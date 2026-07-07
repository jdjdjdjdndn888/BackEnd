import React, { useContext, useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import UserContext from "../../utils/user.js";
import { getauth } from "../../utils/getauth.js";
import { api } from "../../config.js";
import { formatLargeNumber } from "@/utils/value";

const MAX_WIN_CHANCE = 90;

function WinChanceArc({ chance }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, chance));
  const dashoffset = circ * (1 - pct / 100);
  const color =
    pct >= 70 ? "#22c55e" : pct >= 40 ? "#eab308" : "#ef4444";

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#252839" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={circ}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }}
      />
      <text x="70" y="67" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
        {pct.toFixed(1)}%
      </text>
      <text x="70" y="85" textAnchor="middle" fill="#9ca3af" fontSize="10">
        win chance
      </text>
    </svg>
  );
}

export default function Upgrader() {
  const { userData } = useContext(UserContext);

  const [myInventory, setMyInventory] = useState([]);
  const [targetItems, setTargetItems] = useState([]);
  const [selectedBetItems, setSelectedBetItems] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [loadingInv, setLoadingInv] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [betSearch, setBetSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const resultTimeout = useRef(null);

  const betValue = selectedBetItems.reduce((s, i) => s + (i.itemvalue || 0), 0);
  const targetValue = selectedTarget?.itemvalue || 0;
  const winChance = targetValue > 0
    ? Math.min(MAX_WIN_CHANCE, (betValue / targetValue) * 100)
    : 0;

  useEffect(() => {
    fetchTargetItems();
    if (userData) fetchInventory();
  }, [userData]);

  const fetchTargetItems = async () => {
    setLoadingTargets(true);
    try {
      const r = await fetch(`${api}/upgrader/items`);
      const d = await r.json();
      setTargetItems(d.items || []);
    } catch {
      toast.error("Failed to load upgrade targets.");
    } finally {
      setLoadingTargets(false);
    }
  };

  const fetchInventory = async () => {
    setLoadingInv(true);
    try {
      const r = await fetch(`${api}/me/inventory`, {
        method: "POST",
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const d = await r.json();
      if (r.ok) setMyInventory(d.data || []);
      else toast.error(d.message);
    } catch {
      toast.error("Failed to load inventory.");
    } finally {
      setLoadingInv(false);
    }
  };

  const toggleBetItem = (item) => {
    setResult(null);
    const exists = selectedBetItems.some((i) => i.inventoryid === item.inventoryid);
    if (exists) {
      setSelectedBetItems((prev) => prev.filter((i) => i.inventoryid !== item.inventoryid));
    } else {
      setSelectedBetItems((prev) => [...prev, item]);
    }
  };

  const selectTarget = (item) => {
    setResult(null);
    setSelectedTarget(item.inventoryid === selectedTarget?.inventoryid ? null : item);
  };

  const doUpgrade = async () => {
    if (!userData) return toast.error("You must be logged in.");
    if (selectedBetItems.length === 0) return toast.error("Select items to bet.");
    if (!selectedTarget) return toast.error("Select an upgrade target.");
    if (winChance <= 0) return toast.error("Win chance too low.");

    setRolling(true);
    setResult(null);
    clearTimeout(resultTimeout.current);

    try {
      const r = await fetch(`${api}/upgrader/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${getauth()}`,
        },
        body: JSON.stringify({
          inventoryIds: selectedBetItems.map((i) => i.inventoryid),
          targetInventoryId: selectedTarget.inventoryid,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setResult(d.result);
        if (d.result === "win") {
          toast.success(`You won! 🎉 +R$${targetValue.toLocaleString()}`);
          setTargetItems((prev) =>
            prev.filter((i) => i.inventoryid !== selectedTarget.inventoryid)
          );
          setSelectedTarget(null);
        } else {
          toast.error("Better luck next time! 💀");
        }
        setMyInventory((prev) =>
          prev.filter(
            (i) => !selectedBetItems.some((b) => b.inventoryid === i.inventoryid)
          )
        );
        setSelectedBetItems([]);
        resultTimeout.current = setTimeout(() => setResult(null), 4000);
      } else {
        toast.error(d.message || "Something went wrong.");
      }
    } catch {
      toast.error("Request failed.");
    } finally {
      setRolling(false);
    }
  };

  const filteredBet = myInventory.filter((i) =>
    i.itemname?.toLowerCase().includes(betSearch.toLowerCase())
  );
  const filteredTargets = targetItems.filter((i) =>
    i.itemname?.toLowerCase().includes(targetSearch.toLowerCase())
  );

  return (
    <div className="box-border p-4 text-white">
      {/* Page header — matches coinflip stat-card row style */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-solid border-[#1e2035] bg-[#12141f] px-4 py-3">
          <strong className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            {selectedBetItems.length}
          </strong>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-[#42496B]">Your Items</p>
        </div>
        <div className="rounded-xl border border-solid border-[#1e2035] bg-[#12141f] px-4 py-3">
          <strong className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-[#8B5CF6]">
            {betValue > 0 ? `R${formatLargeNumber(betValue)}` : "—"}
          </strong>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-[#42496B]">Bet Value</p>
        </div>
        <div className="rounded-xl border border-solid border-[#1e2035] bg-[#12141f] px-4 py-3">
          <strong className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            {filteredTargets.length}
          </strong>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-[#42496B]">Targets Available</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_176px_1fr]">
        {/* Left — user bet items */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#1e2035] bg-[#12141f] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#42496B]">Your Items</span>
            <span className="text-xs font-bold text-[#8B5CF6]">
              {betValue > 0 ? `R${formatLargeNumber(betValue)}` : "Select items"}
            </span>
          </div>
          <input
            className="w-full rounded-xl border border-[#1e2035] bg-[#0f1220] px-3 py-2 text-sm text-white outline-none placeholder:text-[#42496B] focus:border-[#8B5CF6] transition-colors"
            placeholder="Search items..."
            value={betSearch}
            onChange={(e) => setBetSearch(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2 overflow-y-auto" style={{ maxHeight: "22rem" }}>
            {loadingInv && (
              <div className="col-span-3 flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
              </div>
            )}
            {!loadingInv && !userData && (
              <p className="col-span-3 py-8 text-center text-sm text-[#42496B]">
                Log in to see your inventory
              </p>
            )}
            {!loadingInv && userData && filteredBet.length === 0 && (
              <p className="col-span-3 py-8 text-center text-sm text-[#42496B]">No items found</p>
            )}
            {filteredBet.map((item) => {
              const selected = selectedBetItems.some((s) => s.inventoryid === item.inventoryid);
              return (
                <div
                  key={item.inventoryid}
                  onClick={() => toggleBetItem(item)}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
                    selected
                      ? "border-[#8B5CF6] bg-[#8B5CF615]"
                      : "border-[#1e2035] bg-[#0f1220] hover:border-[#8B5CF650]"
                  }`}
                >
                  <img src={item.itemimage} alt={item.itemname} className="h-12 w-12 object-contain" />
                  <p className="line-clamp-2 text-center text-[10px] leading-tight text-[#8B93B8]">
                    {item.itemname}
                  </p>
                  <p className="text-[10px] font-bold text-[#8B5CF6]">R${formatLargeNumber(item.itemvalue)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center — controls */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div
            className={`transition-all duration-300 ${
              result === "win"
                ? "drop-shadow-[0_0_24px_rgba(34,197,94,0.6)]"
                : result === "lose"
                ? "drop-shadow-[0_0_24px_rgba(239,68,68,0.5)]"
                : ""
            }`}
          >
            <WinChanceArc chance={winChance} />
          </div>

          {result && (
            <div
              className={`rounded-xl border px-4 py-2 text-center text-lg font-black ${
                result === "win"
                  ? "border-green-500/40 bg-green-900/20 text-green-400"
                  : "border-red-500/40 bg-red-900/20 text-red-400"
              }`}
            >
              {result === "win" ? "🎉 YOU WON!" : "💀 YOU LOST"}
            </div>
          )}

          <button
            onClick={doUpgrade}
            disabled={rolling || !selectedBetItems.length || !selectedTarget || winChance <= 0}
            className="w-full cursor-pointer rounded-xl border-none py-2.5 text-sm font-bold text-white tracking-wide transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background:
                rolling || !selectedBetItems.length || !selectedTarget || winChance <= 0
                  ? "#1e2035"
                  : "linear-gradient(135deg,#8B5CF6,#7C3AED)",
              color:
                rolling || !selectedBetItems.length || !selectedTarget || winChance <= 0
                  ? "#42496B"
                  : "white",
            }}
          >
            {rolling ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Rolling...
              </span>
            ) : (
              "Upgrade!"
            )}
          </button>

          {selectedBetItems.length > 0 && selectedTarget && (
            <div className="w-full space-y-1 rounded-xl border border-[#1e2035] bg-[#0f1220] px-3 py-2.5 text-center text-xs">
              <p className="text-[#42496B]">
                Bet: <span className="font-bold text-white">R${formatLargeNumber(betValue)}</span>
              </p>
              <p className="text-[#42496B]">
                Target: <span className="font-bold text-white">R${formatLargeNumber(targetValue)}</span>
              </p>
            </div>
          )}
        </div>

        {/* Right — upgrade targets */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#1e2035] bg-[#12141f] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#42496B]">Upgrade Targets</span>
            <span className="text-xs font-bold text-[#42496B]">{filteredTargets.length} available</span>
          </div>
          <input
            className="w-full rounded-xl border border-[#1e2035] bg-[#0f1220] px-3 py-2 text-sm text-white outline-none placeholder:text-[#42496B] focus:border-[#8B5CF6] transition-colors"
            placeholder="Search targets..."
            value={targetSearch}
            onChange={(e) => setTargetSearch(e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2 overflow-y-auto" style={{ maxHeight: "22rem" }}>
            {loadingTargets && (
              <div className="col-span-3 flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
              </div>
            )}
            {!loadingTargets && filteredTargets.length === 0 && (
              <p className="col-span-3 py-8 text-center text-sm text-[#42496B]">
                No upgrade targets available
              </p>
            )}
            {filteredTargets.map((item) => {
              const selected = selectedTarget?.inventoryid === item.inventoryid;
              const chance =
                betValue > 0 && item.itemvalue > 0
                  ? Math.min(MAX_WIN_CHANCE, (betValue / item.itemvalue) * 100)
                  : 0;
              const chanceColor =
                chance >= 70 ? "text-green-400" : chance >= 40 ? "text-yellow-400" : "text-red-400";

              return (
                <div
                  key={item.inventoryid}
                  onClick={() => selectTarget(item)}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-2 transition-all ${
                    selected
                      ? "border-[#8B5CF6] bg-[#8B5CF615]"
                      : "border-[#1e2035] bg-[#0f1220] hover:border-[#8B5CF650]"
                  }`}
                >
                  <img src={item.itemimage} alt={item.itemname} className="h-12 w-12 object-contain" />
                  <p className="line-clamp-2 text-center text-[10px] leading-tight text-[#8B93B8]">
                    {item.itemname}
                  </p>
                  <p className="text-[10px] font-bold text-[#8B5CF6]">R${formatLargeNumber(item.itemvalue)}</p>
                  {betValue > 0 && (
                    <p className={`text-[10px] font-bold ${chanceColor}`}>{chance.toFixed(1)}%</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
