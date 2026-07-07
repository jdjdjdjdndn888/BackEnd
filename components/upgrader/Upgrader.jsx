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
    <div className="min-h-screen bg-[#0f1117] text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">Upgrader</h1>
        <p className="text-gray-400 mb-6 text-sm">
          Bet your items for a chance to win a higher-value item from the house.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_1fr] gap-4">
          {/* Left — user bet items */}
          <div className="bg-[#171925] border border-[#252839] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-300">Your Items</span>
              <span className="text-xs text-purple-400">
                R${betValue > 0 ? formatLargeNumber(betValue) : "0"}
              </span>
            </div>
            <input
              className="bg-[#0f1117] border border-[#252839] rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-purple-500"
              placeholder="Search items..."
              value={betSearch}
              onChange={(e) => setBetSearch(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-96">
              {loadingInv && (
                <div className="col-span-3 flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loadingInv && !userData && (
                <p className="col-span-3 text-center text-gray-500 py-8 text-sm">
                  Log in to see your inventory
                </p>
              )}
              {!loadingInv && userData && filteredBet.length === 0 && (
                <p className="col-span-3 text-center text-gray-500 py-8 text-sm">No items found</p>
              )}
              {filteredBet.map((item) => {
                const selected = selectedBetItems.some(
                  (s) => s.inventoryid === item.inventoryid
                );
                return (
                  <div
                    key={item.inventoryid}
                    onClick={() => toggleBetItem(item)}
                    className={`cursor-pointer rounded-xl border p-2 flex flex-col items-center gap-1 transition-all ${
                      selected
                        ? "border-purple-500 bg-purple-900/20"
                        : "border-[#252839] hover:border-purple-700"
                    }`}
                  >
                    <img
                      src={item.itemimage}
                      alt={item.itemname}
                      className="w-12 h-12 object-contain"
                    />
                    <p className="text-[10px] text-center text-gray-300 leading-tight line-clamp-2">
                      {item.itemname}
                    </p>
                    <p className="text-[10px] text-purple-400">
                      R${formatLargeNumber(item.itemvalue)}
                    </p>
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
                className={`text-center font-bold text-xl px-4 py-2 rounded-xl border ${
                  result === "win"
                    ? "text-green-400 border-green-500/40 bg-green-900/20"
                    : "text-red-400 border-red-500/40 bg-red-900/20"
                }`}
              >
                {result === "win" ? "🎉 YOU WON!" : "💀 YOU LOST"}
              </div>
            )}

            <button
              onClick={doUpgrade}
              disabled={rolling || !selectedBetItems.length || !selectedTarget || winChance <= 0}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                rolling || !selectedBetItems.length || !selectedTarget || winChance <= 0
                  ? "bg-[#252839] text-gray-500 cursor-not-allowed"
                  : "buttoncolorful"
              }`}
            >
              {rolling ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Rolling...
                </span>
              ) : (
                "Upgrade!"
              )}
            </button>

            {selectedBetItems.length > 0 && selectedTarget && (
              <div className="text-center text-xs text-gray-400 space-y-1">
                <p>
                  Bet:{" "}
                  <span className="text-white">R${formatLargeNumber(betValue)}</span>
                </p>
                <p>
                  Target:{" "}
                  <span className="text-white">
                    R${formatLargeNumber(targetValue)}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Right — taxer items (upgrade targets) */}
          <div className="bg-[#171925] border border-[#252839] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-300">Upgrade Targets</span>
              <span className="text-xs text-gray-500">{filteredTargets.length} available</span>
            </div>
            <input
              className="bg-[#0f1117] border border-[#252839] rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-purple-500"
              placeholder="Search targets..."
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-96">
              {loadingTargets && (
                <div className="col-span-3 flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loadingTargets && filteredTargets.length === 0 && (
                <p className="col-span-3 text-center text-gray-500 py-8 text-sm">
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
                  chance >= 70
                    ? "text-green-400"
                    : chance >= 40
                    ? "text-yellow-400"
                    : "text-red-400";

                return (
                  <div
                    key={item.inventoryid}
                    onClick={() => selectTarget(item)}
                    className={`cursor-pointer rounded-xl border p-2 flex flex-col items-center gap-1 transition-all ${
                      selected
                        ? "border-purple-500 bg-purple-900/20"
                        : "border-[#252839] hover:border-purple-700"
                    }`}
                  >
                    <img
                      src={item.itemimage}
                      alt={item.itemname}
                      className="w-12 h-12 object-contain"
                    />
                    <p className="text-[10px] text-center text-gray-300 leading-tight line-clamp-2">
                      {item.itemname}
                    </p>
                    <p className="text-[10px] text-purple-400">
                      R${formatLargeNumber(item.itemvalue)}
                    </p>
                    {betValue > 0 && (
                      <p className={`text-[10px] font-bold ${chanceColor}`}>
                        {chance.toFixed(1)}%
      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
