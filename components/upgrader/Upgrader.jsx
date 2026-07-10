import React, { useContext, useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import UserContext from "../../utils/user.js";
import { getauth } from "../../utils/getauth.js";
import { api } from "../../config.js";
import { formatLargeNumber } from "@/utils/value";
import { Search, RefreshCw } from "lucide-react";

const MAX_WIN_CHANCE = 90;

function WinChanceArc({ chance }) {
  const r = 58;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, chance));
  const dashoffset = circ * (1 - pct / 100);
  const color = pct >= 70 ? "#4ade80" : pct >= 40 ? "#facc15" : "#f87171";
  return (
    <svg width="150" height="150" viewBox="0 0 150 150">
      <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      <circle cx="75" cy="75" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={dashoffset} strokeLinecap="round"
        transform="rotate(-90 75 75)"
        style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }} />
      <text x="75" y="70" textAnchor="middle" fill="white" fontSize="22" fontWeight="800" fontFamily="system-ui">{pct.toFixed(1)}%</text>
      <text x="75" y="88" textAnchor="middle" fill="#555" fontSize="10" fontFamily="system-ui" letterSpacing="1">WIN CHANCE</text>
    </svg>
  );
}

const S = {
  page:   { boxSizing: "border-box", background: "linear-gradient(180deg, rgba(12,12,12,0.55) 0%, rgba(12,12,12,0.85) 55%, #0c0c0c 100%), url(/upgrader-banner.png) center/cover no-repeat fixed", minHeight: "100%", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column" },
  header: { borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 },
  divider:{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" },
  panel:  { display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.07)", background: "#111" },
  input:  { width: "100%", background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "7px 10px 7px 32px", fontSize: 12, color: "#fff", outline: "none", boxSizing: "border-box" },
};

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
  const winChance = targetValue > 0 ? Math.min(MAX_WIN_CHANCE, (betValue / targetValue) * 100) : 0;

  useEffect(() => { fetchTargetItems(); if (userData) fetchInventory(); }, [userData]);

  const fetchTargetItems = async () => {
    setLoadingTargets(true);
    try {
      const r = await fetch(`${api}/upgrader/items`);
      const d = await r.json();
      setTargetItems(d.items || []);
    } catch { toast.error("Failed to load upgrade targets."); }
    finally { setLoadingTargets(false); }
  };

  const fetchInventory = async () => {
    setLoadingInv(true);
    try {
      const r = await fetch(`${api}/me/inventory`, { method: "POST", headers: { authorization: `Bearer ${getauth()}` } });
      const d = await r.json();
      if (r.ok) setMyInventory(d.data || []);
      else toast.error(d.message);
    } catch { toast.error("Failed to load inventory."); }
    finally { setLoadingInv(false); }
  };

  const toggleBetItem = (item) => {
    setResult(null);
    const exists = selectedBetItems.some((i) => i.inventoryid === item.inventoryid);
    setSelectedBetItems((p) => exists ? p.filter((i) => i.inventoryid !== item.inventoryid) : [...p, item]);
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
    setRolling(true); setResult(null); clearTimeout(resultTimeout.current);
    try {
      const r = await fetch(`${api}/upgrader/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ inventoryIds: selectedBetItems.map((i) => i.inventoryid), targetInventoryId: selectedTarget.inventoryid }),
      });
      const d = await r.json();
      if (r.ok) {
        setResult(d.result);
        if (d.result === "win") {
          toast.success(`You won! 🎉 +${targetValue.toLocaleString()} value`);
          setTargetItems((p) => p.filter((i) => i.inventoryid !== selectedTarget.inventoryid));
          setSelectedTarget(null);
        } else {
          toast.error("Better luck next time! 💀");
        }
        setMyInventory((p) => p.filter((i) => !selectedBetItems.some((b) => b.inventoryid === i.inventoryid)));
        setSelectedBetItems([]);
        resultTimeout.current = setTimeout(() => setResult(null), 4000);
      } else { toast.error(d.message || "Something went wrong."); }
    } catch { toast.error("Request failed."); }
    finally { setRolling(false); }
  };

  const filteredBet = myInventory.filter((i) => i.itemname?.toLowerCase().includes(betSearch.toLowerCase()));
  const filteredTargets = targetItems.filter((i) => i.itemname?.toLowerCase().includes(targetSearch.toLowerCase()));

  const canUpgrade = !rolling && selectedBetItems.length > 0 && selectedTarget && winChance > 0;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Upgrader</span>
        <div style={S.divider} />
        {[
          { label: "Your Items",       value: selectedBetItems.length },
          { label: "Bet Value",        value: betValue > 0 ? formatLargeNumber(betValue) : "—" },
          { label: "Targets",          value: filteredTargets.length },
        ].map(({ label, value }, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={S.divider} />}
            <span style={{ fontSize: 13, color: "#888" }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>{value}</span> {label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Three-column body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 190px 1fr", borderTop: "1px solid rgba(255,255,255,0.07)" }}>

        {/* LEFT — Inventory */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 8 }}>Your Items</div>
            <div style={{ position: "relative" }}>
              <Search size={13} color="#555" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input style={S.input} placeholder="Search..." value={betSearch} onChange={(e) => setBetSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, alignContent: "start", overflowY: "auto", maxHeight: "55vh" }}>
            {loadingInv && <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#555", padding: "32px 0" }}>Loading...</p>}
            {!loadingInv && !userData && <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#555", padding: "32px 0", fontSize: 12 }}>Log in to see your inventory</p>}
            {!loadingInv && userData && filteredBet.length === 0 && <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#555", padding: "32px 0", fontSize: 12 }}>No items found</p>}
            {filteredBet.map((item) => {
              const sel = selectedBetItems.some((s) => s.inventoryid === item.inventoryid);
              return (
                <div key={item.inventoryid} onClick={() => toggleBetItem(item)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 6px", borderRadius: 8, border: `1px solid ${sel ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.07)"}`, background: sel ? "rgba(255,255,255,0.05)" : "#0c0c0c", cursor: "pointer", transition: "border-color 0.15s", textAlign: "center" }}>
                  <img src={item.itemimage} alt={item.itemname} style={{ width: 44, height: 44, objectFit: "contain" }} />
                  <p style={{ fontSize: 10, color: "#ccc", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.itemname}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>{formatLargeNumber(item.itemvalue)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER — Arc + button */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 14px", gap: 16, borderRight: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ filter: result === "win" ? "drop-shadow(0 0 20px rgba(74,222,128,0.5))" : result === "lose" ? "drop-shadow(0 0 20px rgba(248,113,113,0.4))" : "none", transition: "filter 0.4s ease" }}>
            <WinChanceArc chance={winChance} />
          </div>

          {result && (
            <div style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${result === "win" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`, background: result === "win" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", textAlign: "center", fontSize: 15, fontWeight: 800, color: result === "win" ? "#4ade80" : "#f87171" }}>
              {result === "win" ? "🎉 YOU WON!" : "💀 YOU LOST"}
            </div>
          )}

          {selectedBetItems.length > 0 && selectedTarget && (
            <div style={{ width: "100%", background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", marginBottom: 6 }}>
                <span>Bet</span><span style={{ color: "#fff", fontWeight: 600 }}>{formatLargeNumber(betValue)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555" }}>
                <span>Target</span><span style={{ color: "#fff", fontWeight: 600 }}>{formatLargeNumber(targetValue)}</span>
              </div>
            </div>
          )}

          <button onClick={doUpgrade} disabled={!canUpgrade}
            style={{ width: "100%", height: 44, background: canUpgrade ? "#fff" : "rgba(255,255,255,0.06)", color: canUpgrade ? "#000" : "#333", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: canUpgrade ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }}>
            {rolling ? <><span style={{ width: 14, height: 14, border: "2px solid #000", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Rolling...</> : <><RefreshCw size={14} /> Upgrade!</>}
          </button>
          <p style={{ fontSize: 11, color: "#444", textAlign: "center" }}>Provably fair · Max {MAX_WIN_CHANCE}%</p>
        </div>

        {/* RIGHT — Targets */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 8 }}>Upgrade Targets</div>
            <div style={{ position: "relative" }}>
              <Search size={13} color="#555" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input style={S.input} placeholder="Search targets..." value={targetSearch} onChange={(e) => setTargetSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, alignContent: "start", overflowY: "auto", maxHeight: "55vh" }}>
            {loadingTargets && <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#555", padding: "32px 0" }}>Loading...</p>}
            {!loadingTargets && filteredTargets.length === 0 && <p style={{ gridColumn: "1/-1", textAlign: "center", color: "#555", padding: "32px 0", fontSize: 12 }}>No targets available</p>}
            {filteredTargets.map((item) => {
              const sel = selectedTarget?.inventoryid === item.inventoryid;
              const chance = betValue > 0 && item.itemvalue > 0 ? Math.min(MAX_WIN_CHANCE, (betValue / item.itemvalue) * 100) : 0;
              const cc = chance >= 70 ? "#4ade80" : chance >= 40 ? "#facc15" : "#f87171";
              return (
                <div key={item.inventoryid} onClick={() => selectTarget(item)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 6px", borderRadius: 8, border: `1px solid ${sel ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.07)"}`, background: sel ? "rgba(255,255,255,0.05)" : "#0c0c0c", cursor: "pointer", transition: "border-color 0.15s", textAlign: "center" }}>
                  <img src={item.itemimage} alt={item.itemname} style={{ width: 44, height: 44, objectFit: "contain" }} />
                  <p style={{ fontSize: 10, color: "#ccc", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.itemname}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>{formatLargeNumber(item.itemvalue)}</p>
                  {betValue > 0 && <p style={{ fontSize: 10, fontWeight: 700, color: cc }}>{chance.toFixed(1)}%</p>}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
