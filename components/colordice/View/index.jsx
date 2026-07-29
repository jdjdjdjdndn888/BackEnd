import React, { useEffect, useState } from "react";
import { formatLargeNumber } from "@/utils/value";
import { COLOR_MAP } from "../colors.js";
import { ColorDots } from "../layout.jsx";

export default function ViewColordice({ game, onClose }) {
  const [revealed, setRevealed] = useState(0);

  // Animate rolls one by one
  useEffect(() => {
    if (!game.rollSequence?.length) return;
    const delay = Math.max(200, Math.min(600, 2000 / game.rollSequence.length));
    const timer = setInterval(() => {
      setRevealed((r) => {
        if (r >= game.rollSequence.length) { clearInterval(timer); return r; }
        return r + 1;
      });
    }, delay);
    return () => clearInterval(timer);
  }, [game.rollSequence]);

  const done = revealed >= (game.rollSequence?.length ?? 0);
  const wc   = COLOR_MAP[game.winningColor];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16,
    }}>
      <div style={{
        background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16,
        width: "100%", maxWidth: 500, padding: 28, color: "#fff",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Game Result</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {/* Players */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", marginBottom: 24 }}>
          {/* Creator */}
          <div style={{
            background: game.winner === "creator" ? "rgba(34,197,94,.08)" : "rgba(255,255,255,.03)",
            border: `1px solid ${game.winner === "creator" ? "rgba(34,197,94,.3)" : "rgba(255,255,255,.06)"}`,
            borderRadius: 10, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: game.winner === "creator" ? "#22c55e" : "#fff" }}>
              {game.creatorUsername}
              {game.winner === "creator" && <span style={{ marginLeft: 6, fontSize: 10 }}>👑 WON</span>}
            </div>
            <ColorDots colors={game.creatorColors} size={14} />
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#444" }}>vs</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginTop: 4 }}>
              {formatLargeNumber(game.betAmount)}
            </div>
          </div>

          {/* Joiner */}
          <div style={{
            background: game.winner === "joiner" ? "rgba(34,197,94,.08)" : "rgba(255,255,255,.03)",
            border: `1px solid ${game.winner === "joiner" ? "rgba(34,197,94,.3)" : "rgba(255,255,255,.06)"}`,
            borderRadius: 10, padding: "12px 14px", textAlign: "right",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: game.winner === "joiner" ? "#22c55e" : "#fff" }}>
              {game.joinerUsername}
              {game.winner === "joiner" && <span style={{ marginLeft: 6, fontSize: 10 }}>👑 WON</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ColorDots colors={game.joinerColors} size={14} />
            </div>
          </div>
        </div>

        {/* Roll sequence */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>
            Roll Sequence ({game.rollSequence?.length ?? 0} roll{(game.rollSequence?.length ?? 0) !== 1 ? "s" : ""})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(game.rollSequence || []).map((colorId, i) => {
              const c = COLOR_MAP[colorId];
              const isWinning = i === (game.rollSequence.length - 1);
              const show = i < revealed;
              return (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: show ? (c?.hex ?? "#555") : "rgba(255,255,255,.04)",
                  border: `1px solid ${show ? "transparent" : "rgba(255,255,255,.08)"}`,
                  boxShadow: show && isWinning ? `0 0 16px ${c?.hex}` : "none",
                  transition: "background .25s, box-shadow .25s",
                  transform: show && isWinning ? "scale(1.25)" : "scale(1)",
                  flexShrink: 0,
                }} title={show ? c?.label : ""} />
              );
            })}
          </div>
        </div>

        {/* Winner announcement */}
        {done && wc && (
          <div style={{
            background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.25)",
            borderRadius: 10, padding: "14px 18px", textAlign: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: wc.hex, boxShadow: `0 0 12px ${wc.hex}` }} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>{wc.label} won the roll!</span>
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>{game.winnerUsername}</span> won{" "}
              <span style={{ color: "#fff", fontWeight: 700 }}>{formatLargeNumber(game.winnings)} gems</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
