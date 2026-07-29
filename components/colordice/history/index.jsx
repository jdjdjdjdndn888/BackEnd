import React, { useEffect, useState, useContext } from "react";
import UserContext from "../../../utils/user.js";
import { api } from "../../../config.js";
import { getauth } from "../../../utils/getauth.js";
import { formatLargeNumber } from "@/utils/value";
import { COLOR_MAP } from "../colors.js";
import { ColorDots } from "../layout.jsx";
import ViewColordice from "../View/index.jsx";
import { useModal } from "../../../utils/ModalContext";

export default function ColordiceHistory() {
  const { userData } = useContext(UserContext);
  const { setModalState } = useModal();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${api}/colordice/history/me`, { method: "POST", headers: { authorization: `Bearer ${getauth()}` } })
      .then((r) => r.json())
      .then((d) => setHistory(d.history || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const uid = userData?.userid;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16,
    }}>
      <div style={{
        background: "#111827", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16,
        width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column",
        color: "#fff",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>My Color Dice History</h2>
          <button onClick={() => setModalState(null)} style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#555" }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#555" }}>No games yet.</div>
          ) : (
            history.map((g) => {
              const iWon = g.winnerId === uid || g.winnerId === String(uid);
              const wc   = COLOR_MAP[g.winningColor];
              return (
                <div key={g._id}
                  onClick={() => setModalState(<ViewColordice game={g} onClose={() => setModalState(null)} />)}
                  style={{
                    background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.05)",
                    borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  }}
                  className="hover:!bg-[rgba(255,255,255,.04)]"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: iWon ? "#22c55e" : "#ef4444", flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: iWon ? "#22c55e" : "#ff6b6b" }}>
                        {iWon ? `+${formatLargeNumber(g.winnings)}` : `-${formatLargeNumber(g.betAmount)}`}
                      </div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                        vs {g.creatorId === uid || g.creatorId === String(uid) ? g.joinerUsername : g.creatorUsername}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {wc && (
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: wc.hex, boxShadow: `0 0 6px ${wc.hex}`, flexShrink: 0 }} title={wc.label} />
                    )}
                    <ColorDots colors={g.creatorId === uid || g.creatorId === String(uid) ? g.creatorColors : g.joinerColors} size={11} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
