import React, { useState, useContext } from "react";
import UserContext from "../../../utils/user.js";
import toast from "react-hot-toast";
import { api } from "../../../config.js";
import { getauth } from "../../../utils/getauth.js";
import { formatLargeNumber } from "@/utils/value";
import { COLORS, COLOR_MAP } from "../colors.js";

const COUNT_OPTIONS = [1, 2, 3, 4];
const MIN_BET = 1_000_000;

function ColorSwatch({ color, selected, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={color.label}
      style={{
        width: 44, height: 44, borderRadius: 10, border: "none",
        background: color.hex,
        boxShadow: selected ? `0 0 0 3px #fff, 0 0 12px ${color.hex}` : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.25 : 1,
        transition: "box-shadow .12s, opacity .12s",
        position: "relative",
      }}
    >
      {selected && (
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#000", textShadow: "0 0 4px #fff" }}>✓</span>
      )}
    </button>
  );
}

export default function CreateColordice({ onClose }) {
  const { userData, setUserData } = useContext(UserContext);
  const [betRaw, setBetRaw] = useState("");
  const [colorCount, setColorCount] = useState(1);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const bet = Number(betRaw.replace(/,/g, "")) || 0;

  const toggleColor = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= colorCount) return prev; // already at limit
      return [...prev, id];
    });
  };

  // When count changes, trim selection
  const setCount = (n) => {
    setColorCount(n);
    setSelected((prev) => prev.slice(0, n));
  };

  const canSubmit = bet >= MIN_BET && selected.length === colorCount && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch(`${api}/colordice/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ betAmount: bet, colorCount, colors: selected }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message || "Failed to create game"); return; }
      toast.success("Game created!");
      onClose();
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16,
    }}>
      <div style={{
        background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16,
        width: "100%", maxWidth: 480, padding: 28, color: "#fff",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Create Color Dice</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {/* Bet Amount */}
        <label style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: ".1em" }}>Bet Amount (gems)</label>
        <input
          type="number"
          min={MIN_BET}
          value={betRaw}
          onChange={(e) => setBetRaw(e.target.value)}
          placeholder="e.g. 10000000"
          style={{
            width: "100%", boxSizing: "border-box", background: "#0d1117",
            border: "1px solid rgba(255,255,255,.1)", borderRadius: 8,
            color: "#fff", fontSize: 14, padding: "10px 12px", marginTop: 6, marginBottom: 20,
            outline: "none",
          }}
        />
        {bet > 0 && bet < MIN_BET && (
          <p style={{ color: "#ef4444", fontSize: 12, marginTop: -16, marginBottom: 12 }}>
            Minimum bet: {MIN_BET.toLocaleString()} gems
          </p>
        )}
        {bet > 0 && userData && bet > userData.balance && (
          <p style={{ color: "#ef4444", fontSize: 12, marginTop: -16, marginBottom: 12 }}>Insufficient gems (balance: {formatLargeNumber(userData.balance)})</p>
        )}

        {/* Color Count */}
        <label style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: ".1em" }}>Colors Per Side</label>
        <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 20 }}>
          {COUNT_OPTIONS.map((n) => (
            <button key={n} onClick={() => setCount(n)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 600, fontSize: 14,
              border: "1px solid rgba(255,255,255,.12)",
              background: colorCount === n ? "rgba(168,85,247,.3)" : "transparent",
              color: colorCount === n ? "#a855f7" : "#666", cursor: "pointer",
              boxShadow: colorCount === n ? "0 0 0 1px #a855f7" : "none",
            }}>
              {n}
            </button>
          ))}
        </div>

        {/* Color Picker */}
        <label style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: ".1em" }}>
          Pick Your Colors ({selected.length}/{colorCount})
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 10, marginBottom: 24 }}>
          {COLORS.map((c) => (
            <ColorSwatch
              key={c.id} color={c}
              selected={selected.includes(c.id)}
              disabled={!selected.includes(c.id) && selected.length >= colorCount}
              onClick={() => toggleColor(c.id)}
            />
          ))}
        </div>

        {/* Summary */}
        {selected.length > 0 && bet >= MIN_BET && (
          <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#888" }}>
            You bet <span style={{ color: "#fff", fontWeight: 600 }}>{formatLargeNumber(bet)} gems</span> on{" "}
            {selected.map((id, i) => (
              <span key={id}>
                <span style={{ color: COLOR_MAP[id]?.hex, fontWeight: 600 }}>{COLOR_MAP[id]?.label}</span>
                {i < selected.length - 1 ? ", " : ""}
              </span>
            ))}
            . Win <span style={{ color: "#22c55e", fontWeight: 600 }}>{formatLargeNumber(Math.floor(bet * 2 * 0.95))} gems</span>.
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
            background: canSubmit ? "linear-gradient(135deg,#a855f7,#6d28d9)" : "rgba(255,255,255,.05)",
            color: canSubmit ? "#fff" : "#444",
            fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Creating…" : "Create Game"}
        </button>
      </div>
    </div>
  );
}
