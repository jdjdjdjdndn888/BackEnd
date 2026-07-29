import React, { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../config.js";
import { getauth } from "../../../utils/getauth.js";
import { formatLargeNumber } from "@/utils/value";
import { COLORS, COLOR_MAP } from "../colors.js";
import { ColorDots } from "../layout.jsx";

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
        opacity: disabled ? 0.2 : 1,
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

export default function JoinColordice({ game, onClose }) {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleColor = (id) => {
    if (game.creatorColors.includes(id)) return; // can't pick host's color
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= game.colorCount) return prev;
      return [...prev, id];
    });
  };

  const canSubmit = selected.length === game.colorCount && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch(`${api}/colordice/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ gameId: game._id, colors: selected }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message || "Failed to join"); return; }

      // Show result
      const won = data.game.winnerId === data.game.joinerId;
      const wc  = COLOR_MAP[data.game.winningColor];
      toast.success(`${won ? "🎉 You won!" : "You lost."} Winning color: ${wc?.label ?? data.game.winningColor}`);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Join Color Dice</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {/* Host info */}
        <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".1em" }}>Host</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600 }}>{game.creatorUsername}</span>
            <ColorDots colors={game.creatorColors} size={14} />
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#888" }}>
            Bet: <span style={{ color: "#fff", fontWeight: 600 }}>{formatLargeNumber(game.betAmount)} gems</span>
          </div>
        </div>

        {/* Color picker */}
        <label style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: ".1em" }}>
          Pick Your {game.colorCount} Color{game.colorCount > 1 ? "s" : ""} ({selected.length}/{game.colorCount})
        </label>
        <p style={{ fontSize: 11, color: "#444", marginTop: 4, marginBottom: 10 }}>
          Greyed out = host's colors (unavailable)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
          {COLORS.map((c) => {
            const isHostColor = game.creatorColors.includes(c.id);
            return (
              <div key={c.id} style={{ position: "relative" }}>
                <ColorSwatch
                  color={c}
                  selected={selected.includes(c.id)}
                  disabled={isHostColor || (!selected.includes(c.id) && selected.length >= game.colorCount)}
                  onClick={() => toggleColor(c.id)}
                />
                {isHostColor && (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 14, color: "#ef4444",
                    pointerEvents: "none",
                  }}>✕</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Potential win */}
        {selected.length === game.colorCount && (
          <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#888" }}>
            You bet <span style={{ color: "#fff", fontWeight: 600 }}>{formatLargeNumber(game.betAmount)} gems</span> on{" "}
            {selected.map((id, i) => (
              <span key={id}>
                <span style={{ color: COLOR_MAP[id]?.hex, fontWeight: 600 }}>{COLOR_MAP[id]?.label}</span>
                {i < selected.length - 1 ? ", " : ""}
              </span>
            ))}
            . Win <span style={{ color: "#22c55e", fontWeight: 600 }}>{formatLargeNumber(Math.floor(game.betAmount * 2 * 0.95))} gems</span>.
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
          {loading ? "Rolling…" : "Confirm & Roll"}
        </button>
      </div>
    </div>
  );
}
