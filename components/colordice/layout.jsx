import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useModal } from "../../utils/ModalContext";
import UserContext from "../../utils/user.js";
import SocketContext from "../../utils/socket.js";
import toast from "react-hot-toast";
import LoginModal from "../popup/login.jsx";
import { api } from "../../config.js";
import { formatLargeNumber } from "@/utils/value";
import { useSeo } from "@/utils/useSeo";
import { Plus } from "lucide-react";
import { COLOR_MAP } from "./colors.js";
import CreateColordice from "./Create/index.jsx";
import ColordiceRow from "./ColordiceRow.jsx";
import ColordiceHistory from "./history/index.jsx";

const S = {
  page:   { background: "linear-gradient(180deg,rgba(10,11,20,.4) 0%,rgba(10,11,20,.85) 55%,#0a0b14 100%)", minHeight: "100%", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" },
  header: { borderBottom: "1px solid rgba(255,255,255,.07)", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  stats:  { borderBottom: "1px solid rgba(255,255,255,.07)", display: "grid", gridTemplateColumns: "repeat(3,1fr)" },
  stat:   (i) => ({ padding: "16px 20px", borderRight: i < 2 ? "1px solid rgba(255,255,255,.07)" : "none" }),
  btnPrimary:   { display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,.12)", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  divider: { width: 1, height: 16, background: "rgba(255,255,255,.08)" },
};

// small row of colored dots
export function ColorDots({ colors, size = 14, gap = 4 }) {
  return (
    <div style={{ display: "flex", gap, flexWrap: "wrap" }}>
      {colors.map((c) => {
        const col = COLOR_MAP[c];
        return (
          <div key={c} title={col?.label} style={{
            width: size, height: size, borderRadius: "50%",
            background: col?.hex ?? "#555",
            boxShadow: `0 0 6px ${col?.hex ?? "#555"}66`,
            flexShrink: 0,
          }} />
        );
      })}
    </div>
  );
}

export default function ColordiceLayout() {
  useSeo({ title: "Color Dice PvP | GemTide", description: "Pick your colors, roll the dice. Gem PvP on GemTide.", path: "/colordice" });

  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const socket = useContext(SocketContext);
  const [games, setGames] = useState([]);
  const [filter, setFilter] = useState("all"); // "all" | "open" | "done"

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch(`${api}/colordice/games`);
      const data = await res.json();
      setGames(data.data || []);
    } catch { toast.error("Failed to load games"); }
  }, []);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  useEffect(() => {
    const onNew    = (g) => setGames((p) => [g, ...p]);
    const onUpdate = (g) => setGames((p) => p.map((x) => x._id === g._id ? g : x));
    const onCancel = ({ _id }) => setGames((p) => p.filter((x) => x._id !== _id));
    socket.on("NEW_COLORDICE",    onNew);
    socket.on("COLORDICE_UPDATE", onUpdate);
    socket.on("COLORDICE_CANCEL", onCancel);
    return () => {
      socket.off("NEW_COLORDICE",    onNew);
      socket.off("COLORDICE_UPDATE", onUpdate);
      socket.off("COLORDICE_CANCEL", onCancel);
    };
  }, [socket]);

  const visible = games.filter((g) =>
    filter === "open" ? g.active :
    filter === "done" ? !g.active : true
  );

  const openGames   = games.filter((g) => g.active).length;
  const totalValue  = games.filter((g) => g.active).reduce((s, g) => s + g.betAmount, 0);

  const openCreate = () => {
    setModalState(null);
    setTimeout(() =>
      setModalState(userData
        ? <CreateColordice onClose={() => setModalState(null)} />
        : <LoginModal />)
    );
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: ".15em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Color Dice</span>
          <div style={S.divider} />
          <span style={{ fontSize: 13, color: "#888" }}>
            <span style={{ color: "#fff", fontWeight: 600 }}>{openGames}</span> Open
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btnSecondary} onClick={() => setModalState(userData ? <ColordiceHistory /> : <LoginModal />)}>History</button>
          <button style={S.btnPrimary} onClick={openCreate}><Plus size={14} /> Create Game</button>
        </div>
      </div>

      {/* Stats */}
      <div style={S.stats}>
        {[
          { label: "OPEN GAMES", value: openGames },
          { label: "TOTAL GAMES", value: games.length },
          { label: "OPEN VALUE", value: formatLargeNumber(totalValue) },
        ].map((s, i) => (
          <div key={i} style={S.stat(i)}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
            <div style={{ fontSize: 10, letterSpacing: ".1em", color: "#555", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", gap: 6, padding: "9px 20px" }}>
        {["all","open","done"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: 12, padding: "4px 12px", borderRadius: 4,
            border: "1px solid rgba(255,255,255,.1)",
            background: filter === f ? "rgba(255,255,255,.1)" : "transparent",
            color: filter === f ? "#fff" : "#666", cursor: "pointer",
          }}>
            {f === "all" ? "All" : f === "open" ? "Open" : "Completed"}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "10px 12px" }}>
        {visible.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>No Color Dice Games</p>
            <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Be the first to create one!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {visible.map((g) => (
              <ColordiceRow key={g._id} game={g} userData={userData} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
