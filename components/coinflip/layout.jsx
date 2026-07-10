import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { useModal } from "../../utils/ModalContext";
import UserContext from "../../utils/user.js";
import CoinflipStyles from "./coinfliplayout.module.css";
import CreateMatch from "./Create/createcoinflip.jsx";
import SocketContext from "../../utils/socket.js";
import View from "./View/view.jsx";
import toast from "react-hot-toast";
import LoginModal from "../popup/login.jsx";
import { api } from "../../config.js";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import History from "./history/history";
import { CoinflipRow } from "./CoinflipRow";
import { formatLargeNumber } from "@/utils/value";
import { Link } from "react-router-dom";
import { Coins, Plus, RotateCcw, ChevronDown } from "lucide-react";
import { Trails, Heads } from "../../assets/exports.jsx";

const S = {
  page:    { boxSizing: "border-box", background: "linear-gradient(180deg, rgba(12,12,12,0.55) 0%, rgba(12,12,12,0.85) 40%, #0c0c0c 100%), url(/coinflip-banner.png) center top / cover no-repeat fixed", minHeight: "100%", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" },
  header:  { borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  statsBar:{ borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 24, padding: "0 20px", height: 44 },
  divider: { width: 1, height: 24, background: "rgba(255,255,255,0.07)", flexShrink: 0 },
  filters: { borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 20px" },
  pill:    (active) => ({ fontSize: 12, padding: "4px 12px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: active ? "rgba(255,255,255,0.1)" : "transparent", color: active ? "#fff" : "#666", cursor: "pointer" }),
  btnPrimary: { display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  ticker:  { borderTop: "1px solid rgba(255,255,255,0.07)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 },
};

export default function Coinflip() {
  const { setModalState } = useModal();
  const [coinflips, setCoinflips] = useState([]);
  const [selectedFlip, setSelectedFlip] = useState(null);
  const { userData } = useContext(UserContext);
  const socket = useContext(SocketContext);
  const [sortCriteria, setSortCriteria] = useState("high");
  const [gameFilter, setGameFilter] = useState("all");
  const [countdowns, setCountdowns] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentResults, setRecentResults] = useState([]);
  // Keep a ref to selectedFlip so socket handlers always read the latest value
  // without needing to be in the dependency array (which caused constant re-registration)
  const selectedFlipRef = React.useRef(selectedFlip);
  useEffect(() => { selectedFlipRef.current = selectedFlip; }, [selectedFlip]);

  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns((prev) => {
        const next = {};
        Object.entries(prev).forEach(([id, c]) => { if (c > 1) next[id] = c - 1; });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { fetchFlips(); }, [sortCriteria, gameFilter]);

  const totalGames = coinflips.length;
  const totalItems = useMemo(() => coinflips.reduce((s, f) => s + f.PlayerOne.items.length + (f.PlayerTwo?.items?.length ?? 0), 0), [coinflips]);
  const totalValue = useMemo(() => coinflips.reduce((s, f) => s + (f.requirements.static || 0), 0), [coinflips]);

  const sortCoinflips = useCallback((flips) => flips.sort((a, b) =>
    sortCriteria === "high" ? (b.requirements.static || 0) - (a.requirements.static || 0) : (a.requirements.static || 0) - (b.requirements.static || 0)
  ), [sortCriteria]);

  const fetchFlips = useCallback(async () => {
    try {
      const response = await fetch(`${api}/coinflips/flips`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const filtered = data.data.filter((f) => gameFilter === "all" || f.game === gameFilter);
      setCoinflips(sortCoinflips(filtered));
    } catch {
      toast.error(`error w/ fetching flips :sob:`);
    }
  }, [gameFilter, sortCoinflips]);

  useEffect(() => {
    const onNew = (newCoinflip) => {
      setCoinflips((prev) => sortCoinflips([newCoinflip, ...prev]));
    };
    const onUpdate = (updatedFlip) => {
      // Track whether this update introduces a winner so we can trigger side
      // effects OUTSIDE the state updater (keeps the updater pure).
      let winnerJustAppeared = false;
      setCoinflips((prev) => {
        const existing = prev.find((f) => f._id === updatedFlip._id);
        winnerJustAppeared = !!(updatedFlip.winnercoin && !existing?.winnercoin);
        return sortCoinflips(prev.map((f) => f._id === updatedFlip._id ? updatedFlip : f));
      });
      if (winnerJustAppeared) {
        setCountdowns((p) => ({ ...p, [updatedFlip._id]: 3 }));
        setRecentResults((p) => [updatedFlip.winnercoin, ...p].slice(0, 10));
      }
      if (selectedFlipRef.current?._id === updatedFlip._id) {
        setSelectedFlip(updatedFlip);
        setModalState(<View coinflip={updatedFlip} onClose={() => setSelectedFlip(null)} />);
      }
    };
    const onCancel = (data) => {
      setCoinflips((prev) => sortCoinflips(prev.filter((f) => f._id !== data._id)));
      setCountdowns((p) => { const n = { ...p }; delete n[data._id]; return n; });
    };
    socket.on("NEW_COINFLIP", onNew);
    socket.on("COINFLIP_UPDATE", onUpdate);
    socket.on("COINFLIP_CANCEL", onCancel);
    return () => {
      socket.off("NEW_COINFLIP", onNew);
      socket.off("COINFLIP_UPDATE", onUpdate);
      socket.off("COINFLIP_CANCEL", onCancel);
    };
  }, [socket, sortCoinflips]);

  const openCreate = () => {
    setModalState(null);
    setTimeout(() => setModalState(userData
      ? <CreateMatch onCreate={(f) => setSelectedFlip(f)} onClose={() => setSelectedFlip(null)} />
      : <LoginModal />
    ));
  };

  const FILTERS = ["all", "PS99", "MM2"];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Coinflip</span>
          <div style={S.divider} />
          <span style={{ fontSize: 13, color: "#888" }}>
            <span style={{ color: "#fff", fontWeight: 600 }}>{totalGames}</span> Rooms
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btnSecondary} onClick={() => setModalState(userData ? <History /> : <LoginModal />)}>History</button>
          <button style={S.btnPrimary} onClick={openCreate}><Plus size={14} /> Create Room</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={S.statsBar}>
        <span style={{ fontSize: 13, color: "#888" }}><span style={{ color: "#fff", fontWeight: 600 }}>{totalItems.toLocaleString()}</span> Items</span>
        <div style={S.divider} />
        <span style={{ fontSize: 13, color: "#888" }}>≈ <span style={{ color: "#fff", fontWeight: 600 }}>{formatLargeNumber(totalValue)}</span> Value</span>
      </div>

      {/* Filters */}
      <div style={S.filters}>
        <div style={{ display: "flex", gap: 6 }}>
          {FILTERS.map((f) => (
            <button key={f} style={S.pill(gameFilter === f)} onClick={() => setGameFilter(f)}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
        <Select onValueChange={setSortCriteria} value={sortCriteria}>
          <SelectTrigger className={CoinflipStyles.selector}>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="bg-[#111] border border-[rgba(255,255,255,0.07)] rounded-lg p-1 mt-1">
            <SelectItem className="text-sm text-[#ccc] hover:bg-[#1a1a1a] rounded cursor-pointer px-3 py-1.5" value="high">High → Low</SelectItem>
            <SelectItem className="text-sm text-[#ccc] hover:bg-[#1a1a1a] rounded cursor-pointer px-3 py-1.5" value="low">Low → High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Room list */}
      <div style={{ padding: "8px 12px" }}>
        {coinflips.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "80px 24px", textAlign: "center", margin: "12px 0", borderRadius: 8, backdropFilter: "blur(2px)" }}>
            <Coins size={28} color="#aaa" />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>No Active Rooms</p>
              <p style={{ fontSize: 12, color: "#ccc", marginTop: 4, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>Be the first to create one</p>
            </div>
            <p style={{ fontSize: 11, fontFamily: "monospace", color: "#999", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {coinflips.map((flip) => (
              <CoinflipRow key={flip._id} countdowns={countdowns} flip={flip} userData={userData} setSelectedFlip={setSelectedFlip} />
            ))}
          </div>
        )}
      </div>

      {/* Recent results coin strip */}
      {recentResults.length > 0 && (
        <div style={S.ticker}>
          <RotateCcw size={12} color="#555" />
          <span style={{ fontSize: 11, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", flexShrink: 0 }}>Recent</span>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {recentResults.map((side, i) => (
              <img key={i} src={side === "heads" ? Heads : Trails} alt={side} style={{ width: 24, height: 24, objectFit: "contain" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
