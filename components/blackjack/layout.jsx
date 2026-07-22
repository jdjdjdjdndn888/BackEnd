import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from "react";
import { useModal } from "../../utils/ModalContext";
import UserContext from "../../utils/user.js";
import SocketContext from "../../utils/socket.js";
import toast from "react-hot-toast";
import LoginModal from "../popup/login.jsx";
import { api } from "../../config.js";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { formatLargeNumber } from "@/utils/value";
import { useSeo } from "@/utils/useSeo";
import { Plus } from "lucide-react";
import CreateBlackjack from "./Create/createblackjack.jsx";
import BlackjackRow from "./BlackjackRow.jsx";
import BlackjackHistory from "./history/history.jsx";
import BlackjackView from "./View/view.jsx";

const S = {
  page:    { boxSizing: "border-box", background: "linear-gradient(180deg, rgba(4,8,16,0.45) 0%, rgba(4,8,16,0.82) 55%, #040810 100%), url(/bg-blackjack.jpg) center/cover no-repeat fixed", minHeight: "100%", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" },
  header:  { borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  statsBar:{ borderBottom: "1px solid rgba(255,255,255,0.07)", display: "grid", gridTemplateColumns: "repeat(3,1fr)" },
  statCell:(i) => ({ padding: "16px 20px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }),
  filters: { borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 20px" },
  pill:    (active) => ({ fontSize: 12, padding: "4px 12px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: active ? "rgba(255,255,255,0.1)" : "transparent", color: active ? "#fff" : "#666", cursor: "pointer" }),
  divider: { width: 1, height: 16, background: "rgba(255,255,255,0.08)" },
  btnPrimary:   { display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

export default function BlackjackLayout() {
  useSeo({
    title: "PS99 Blackjack 1v1 | Pet Simulator 99 Betting - GemTide",
    description:
      "Face off in GemTide's PS99 Blackjack 1v1. Wager Pet Sim 99 pets and gems, get closer to 21 than your opponent, and win the pot.",
    path: "/blackjack",
  });
  const { setModalState } = useModal();
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const { userData } = useContext(UserContext);
  const socket = useContext(SocketContext);
  const [sortCriteria, setSortCriteria] = useState("high");
  const [gameFilter, setGameFilter] = useState("all");
  const gameFilterRef = useRef("all");
  useEffect(() => { gameFilterRef.current = gameFilter; }, [gameFilter]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const selectedGameRef = React.useRef(selectedGame);
  useEffect(() => { selectedGameRef.current = selectedGame; }, [selectedGame]);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const sortGames = useCallback((list) => list.sort((a, b) =>
    sortCriteria === "high" ? (b.requirements.static || 0) - (a.requirements.static || 0) : (a.requirements.static || 0) - (b.requirements.static || 0)
  ), [sortCriteria]);

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch(`${api}/blackjack/games`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const filtered = data.data.filter((g) => gameFilter === "all" || g.game === gameFilter);
      setGames(sortGames(filtered));
    } catch { toast.error("Failed to fetch blackjack games"); }
  }, [gameFilter, sortGames]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  useEffect(() => {
    const onNew = (g) => {
      if (gameFilterRef.current !== "all" && g.game !== gameFilterRef.current) return;
      setGames((p) => sortGames([g, ...p]));
    };
    const onUpdate = (updated) => {
      setGames((p) => sortGames(p.map((g) => g._id === updated._id ? updated : g)));
      if (selectedGameRef.current?._id === updated._id) {
        setSelectedGame(updated);
        setModalState(<BlackjackView game={updated} onClose={() => setSelectedGame(null)} />);
      }
    };
    const onCancel = (data) => {
      setGames((p) => sortGames(p.filter((g) => g._id !== data._id)));
      if (selectedGameRef.current?._id === data._id) { setSelectedGame(null); setModalState(null); }
    };
    socket.on("NEW_BLACKJACK", onNew);
    socket.on("BLACKJACK_UPDATE", onUpdate);
    socket.on("BLACKJACK_CANCEL", onCancel);
    return () => {
      socket.off("NEW_BLACKJACK", onNew);
      socket.off("BLACKJACK_UPDATE", onUpdate);
      socket.off("BLACKJACK_CANCEL", onCancel);
    };
  }, [socket, sortGames]);

  const totalGames = games.length;
  const totalValue = useMemo(() => games.reduce((s, g) => s + (g.requirements.static || 0), 0), [games]);
  const totalItems = useMemo(() => games.reduce((s, g) => s + g.PlayerOne.items.length + (g.PlayerTwo?.items?.length ?? 0), 0), [games]);

  const openCreate = () => {
    setModalState(null);
    setTimeout(() => setModalState(
      userData ? <CreateBlackjack onCreate={() => {}} onClose={() => setModalState(null)} /> : <LoginModal />
    ));
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Blackjack</span>
          <div style={S.divider} />
          <span style={{ fontSize: 13, color: "#888" }}>
            <span style={{ color: "#fff", fontWeight: 600 }}>{totalGames}</span> Rooms
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btnSecondary} onClick={() => setModalState(userData ? <BlackjackHistory /> : <LoginModal />)}>History</button>
          <button style={S.btnPrimary} onClick={openCreate}><Plus size={14} /> Create Room</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={S.statsBar}>
        {[
          { label: "ROOMS", value: totalGames.toLocaleString() },
          { label: "ITEMS", value: totalItems.toLocaleString() },
          { label: "VALUE", value: formatLargeNumber(totalValue) },
        ].map((s, i) => (
          <div key={i} style={S.statCell(i)}>
            <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={S.filters}>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "PS99", "Sab"].map((f) => (
            <button key={f} style={S.pill(gameFilter === f)} onClick={() => setGameFilter(f)}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
        <Select onValueChange={setSortCriteria} value={sortCriteria}>
          <SelectTrigger className="h-8 w-36 rounded-md border border-[rgba(255,255,255,0.08)] bg-transparent px-3 text-sm text-[#888]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border border-[rgba(255,255,255,0.07)] rounded-lg p-1 mt-1">
            <SelectItem className="text-sm text-[#ccc] hover:bg-[#1a1a1a] rounded cursor-pointer px-3 py-1.5" value="high">High → Low</SelectItem>
            <SelectItem className="text-sm text-[#ccc] hover:bg-[#1a1a1a] rounded cursor-pointer px-3 py-1.5" value="low">Low → High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Game list */}
      <div style={{ padding: "10px 12px" }}>
        {games.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "80px 24px", textAlign: "center", margin: "12px 0", borderRadius: 8, backdropFilter: "blur(2px)" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>No Active Games</p>
              <p style={{ fontSize: 12, color: "#ccc", marginTop: 4, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>Come back later or create one</p>
            </div>
            <p style={{ fontSize: 11, fontFamily: "monospace", color: "#999", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {games.map((g) => <BlackjackRow key={g._id} game={g} userData={userData} setSelectedGame={setSelectedGame} />)}
          </div>
        )}
      </div>
    </div>
  );
}
