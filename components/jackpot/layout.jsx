import { useCallback, useState, useContext, useEffect, useRef } from "react";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import Profile from "../popup/profile";
import { useModal } from "../../utils/ModalContext";
import SocketContext from "../../utils/socket.js";
import JoinJackpot from "./joinjackpot.jsx";
import LoginModal from "../popup/login.jsx";
import { Money } from "@/assets/exports.jsx";
import Wheel from "./Wheel.jsx";
import { COLORS } from "./colors.js";
import { Timer, Plus, TrendingUp } from "lucide-react";

const S = {
  page: { boxSizing: "border-box", background: "#0c0c0c", minHeight: "100%", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column" },
  divider: { width: 1, height: 16, background: "rgba(255,255,255,0.08)" },
};

export default function JackpotPage() {
  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const socket = useContext(SocketContext);
  const [jackpotData, setJackpotData] = useState({ value: 0 });
  const [timeRemaining, setTimeRemaining] = useState("0s");
  const [jackpotEntries, setJackpotEntries] = useState([]);
  const [showWinner, setShowWinner] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch(`${api}/jackpot`, { mode: "cors", method: "GET" })
      .then(async (res) => {
        const data = await res.json();
        setJackpotData(data.gameData);
        setJackpotEntries(data.entries || []);
      })
      .catch((err) => console.error("Failed to fetch jackpot!", err));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof timeRemaining === "number" && timeRemaining > 0)
        setTimeRemaining((p) => p - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining]);

  const handleJackpotUpdate = useCallback((data) => {
    setJackpotData(data.gameData);
    setJackpotEntries(data.entries || []);
    if (data.entries.length === 0)
      setJackpotData((p) => ({ ...p, result: null }));
  }, []);

  const handleTimeUpdate = (time) => {
    const s = String(time);
    if (s.includes("...")) { setTimeRemaining("0s"); setShowWinner(false); }
    else setTimeRemaining(`${s}s`);
  };

  useEffect(() => {
    if (jackpotData.result) {
      audioRef.current = new Audio(Money);
      audioRef.current.play().catch((e) => console.error("Audio playback error:", e));
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    }
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } };
  }, [jackpotData.result]);

  useEffect(() => {
    socket.on("JACKPOT_UPDATE", handleJackpotUpdate);
    socket.on("JACKPOT_TIME_UPDATE", handleTimeUpdate);
    return () => {
      socket.off("JACKPOT_UPDATE", handleJackpotUpdate);
      socket.off("JACKPOT_TIME_UPDATE", handleTimeUpdate);
    };
  }, [socket, handleJackpotUpdate]);

  const totalItems = jackpotEntries.reduce((s, e) => s + e.items.length, 0);
  const totalValue = jackpotData.value || 0;
  const isFull = jackpotEntries.length >= 50;
  const isRolling = showWinner && jackpotData.result;
  const betLabel = isFull ? "Jackpot Full" : isRolling ? "Starting soon..." : jackpotData.result ? "Rolling..." : `Place a Bet (${timeRemaining})`;

  return (
    <div style={S.page}>
      {/* ── Top header ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Jackpot</span>
          <div style={S.divider} />
          <span style={{ fontSize: 13, color: "#888" }}>
            <span style={{ color: "#fff", fontWeight: 600 }}>{jackpotEntries.length}</span>/50 Players
          </span>
          <div style={S.divider} />
          <span style={{ fontSize: 13, color: "#888" }}>
            <span style={{ color: "#fff", fontWeight: 600 }}>{totalItems}</span> Items
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 14px" }}>
          <Timer size={13} color="#888" />
          <span style={{ fontSize: 13, color: "#fff", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
            Draws in {timeRemaining}
          </span>
        </div>
      </div>

      {/* ── Probability bar ── */}
      {jackpotEntries.length > 0 && (
        <div style={{ padding: "0 24px" }}>
          <div style={{ display: "flex", height: 5, overflow: "hidden", borderRadius: "0 0 3px 3px" }}>
            {jackpotEntries.map((entry, i) => {
              const pct = totalValue > 0 ? (entry.value / totalValue) * 100 : 0;
              return <div key={i} style={{ flex: pct, background: COLORS[i % COLORS.length], transition: "flex 0.4s ease" }} />;
            })}
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div style={{ flex: 1, display: "flex" }}>
        {/* LEFT — Wheel area */}
        <div style={{ flex: "0 0 55%", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
          <Wheel
            jackpotData={jackpotData}
            jackpotEntries={jackpotEntries}
            showWinner={showWinner}
            timeRemaining={timeRemaining}
            setShowWinner={setShowWinner}
          />

          {jackpotData.result && (
            <div style={{ marginTop: 20, fontSize: 15, fontWeight: 800, color: "#4ade80", letterSpacing: "0.04em" }}>
              🎉 Winner selected!
            </div>
          )}
        </div>

        {/* RIGHT — Entries */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Entries header */}
          <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Entries ({jackpotEntries.length}/50)</span>
            <TrendingUp size={13} color="#555" />
          </div>

          {/* Entry list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {jackpotEntries.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>No entries yet</p>
                <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Be the first to place a bet!</p>
              </div>
            ) : jackpotEntries.map((entry, index) => {
              const pct = totalValue > 0 ? Math.round((entry.value / totalValue) * 100 * 100) / 100 : 0;
              const col = COLORS[index % COLORS.length];
              const toRender = entry.items.slice(0, 4);
              return (
                <div key={index} style={{
                  display: "flex", flexDirection: "column", gap: 8,
                  padding: "12px 20px",
                  borderLeft: `3px solid ${col}`,
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: index % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                      src={entry.thumbnail}
                      alt={entry.username}
                      onClick={() => setModalState(<Profile userid={entry.joinerid} />)}
                      style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${col}`, objectFit: "cover", cursor: "pointer", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", flex: 1 }}>{entry.username}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{pct}%</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {toRender.map((item, i) => (
                      <img key={i} src={item.itemimage} alt="" style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)", objectFit: "contain", background: "#111" }} />
                    ))}
                    {entry.items.length > 4 && (
                      <div style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                        +{entry.items.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bet CTA */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setModalState(userData ? <JoinJackpot /> : <LoginModal />)}
              disabled={isFull || !!jackpotData.result}
              style={{ flex: 1, height: 44, background: isFull || jackpotData.result ? "rgba(255,255,255,0.06)" : "#fff", color: isFull || jackpotData.result ? "#444" : "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: isFull || jackpotData.result ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Plus size={15} />
              {betLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
