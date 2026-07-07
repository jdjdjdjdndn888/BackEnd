import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { useModal } from "../../utils/ModalContext";
import UserContext from "../../utils/user.js";
import SocketContext from "../../utils/socket.js";
import toast from "react-hot-toast";
import LoginModal from "../popup/login.jsx";
import { api } from "../../config.js";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { WalletIcon } from "@/assets/icons/WalletIcon";
import { formatLargeNumber } from "@/utils/value";
import { Dices } from "lucide-react";
import CreateDice from "./Create/createdice.jsx";
import DiceRow from "./DiceRow.jsx";
import DiceHistory from "./history/history.jsx";
import DiceView from "./View/view.jsx";

export default function DiceLayout() {
  const { setModalState } = useModal();
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const { userData } = useContext(UserContext);
  const socket = useContext(SocketContext);
  const [sortCriteria, setSortCriteria] = useState("high");
  const [gameFilter, setGameFilter] = useState("all");
  const [countdowns, setCountdowns] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdowns((prev) => {
        const next = {};
        Object.entries(prev).forEach(([id, c]) => { if (c > 1) next[id] = c - 1; });
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const sortGames = useCallback(
    (list) => list.sort((a, b) =>
      sortCriteria === "high"
        ? (b.requirements.static || 0) - (a.requirements.static || 0)
        : (a.requirements.static || 0) - (b.requirements.static || 0)
    ),
    [sortCriteria]
  );

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch(`${api}/dice/games`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const filtered = data.data.filter((g) => gameFilter === "all" || g.game === gameFilter);
      setGames(sortGames(filtered));
    } catch {
      toast.error("Failed to fetch dice games");
    }
  }, [gameFilter, sortGames]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  useEffect(() => {
    socket.on("NEW_DICE", (g) => {
      setGames((prev) => sortGames([g, ...prev]));
    });
    socket.on("DICE_UPDATE", (updated) => {
      setGames((prev) => {
        if (!prev.find((g) => g._id === updated._id)?.winnercoin && updated.PlayerTwo) {
          setCountdowns((c) => ({ ...c, [updated._id]: 5 }));
        }
        return sortGames(prev.map((g) => g._id === updated._id ? updated : g));
      });

      setSelectedGame((prevSelected) => {
        if (prevSelected?._id === updated._id) {
          setModalState(
            <DiceView game={updated} onClose={() => setSelectedGame(null)} />
          );
          return updated;
        }
        return prevSelected;
      });
    });
    socket.on("DICE_CANCEL", (data) => {
      setGames((prev) => sortGames(prev.filter((g) => g._id !== data._id)));
      setCountdowns((prev) => { const n = { ...prev }; delete n[data._id]; return n; });
    });
    return () => {
      socket.off("NEW_DICE");
      socket.off("DICE_UPDATE");
      socket.off("DICE_CANCEL");
    };
  }, [socket, sortGames]);

  const totalGames = games.length;
  const totalValue = useMemo(() => games.reduce((s, g) => s + (g.requirements.static || 0), 0), [games]);
  const totalItems = useMemo(() => games.reduce((s, g) => s + g.PlayerOne.items.length + (g.PlayerTwo?.items?.length ?? 0), 0), [games]);

  return (
    <div className="box-border p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(3,calc((100%-2*0.5rem)/3))]">
        <StatCard title="Rooms" value={totalGames.toLocaleString()} />
        <StatCard title="Value" value={<><WalletIcon className="w-4 text-[#8B5CF6]" /> {formatLargeNumber(totalValue)}</>} />
        <StatCard title="Items" value={totalItems.toLocaleString()} />
      </div>

      <div className="my-3 flex items-center gap-2.5">
        <div className="mr-auto flex gap-2">
          <button
            onClick={() => {
              setModalState(null);
              setTimeout(() => setModalState(
                userData ? <CreateDice onCreate={() => {}} onClose={() => setModalState(null)} /> : <LoginModal />
              ));
            }}
            className="min-w-[90px] cursor-pointer rounded-xl border-none bg-[#8B5CF6] px-4 py-2 text-center text-sm font-bold text-white tracking-wide transition-all hover:bg-[#7C3AED] active:scale-95"
          >
            Create
          </button>
          <button
            className="min-w-[90px] cursor-pointer rounded-xl border border-solid border-[#1e2035] bg-[#12141f] px-4 py-2 text-center text-sm font-bold text-[#8B93B8] tracking-wide transition-all hover:border-[#252839] hover:text-white active:scale-95"
            onClick={() => setModalState(userData ? <DiceHistory /> : <LoginModal />)}
          >
            History
          </button>
        </div>

        <div className="hidden sm:contents">
          <Select onValueChange={setSortCriteria} value={sortCriteria}>
            <SelectTrigger className="h-10 w-44 rounded-xl border border-[#1e2035] bg-[#12141f] px-3 text-sm font-semibold text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1C1F2D] border border-[#252839] rounded-xl p-1 mt-1">
              <SelectItem className="text-sm text-[#ccc] hover:bg-[#202331] rounded-lg cursor-pointer px-3 py-2 mt-1" value="high">Highest to Lowest</SelectItem>
              <SelectItem className="text-sm text-[#ccc] hover:bg-[#202331] rounded-lg cursor-pointer px-3 py-2 mt-1" value="low">Lowest to Highest</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={setGameFilter} value={gameFilter}>
            <SelectTrigger className="h-10 w-36 rounded-xl border border-[#1e2035] bg-[#12141f] px-3 text-sm font-semibold text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1C1F2D] border border-[#252839] rounded-xl p-1 mt-1">
              <SelectItem className="text-sm text-[#ccc] hover:bg-[#202331] rounded-lg cursor-pointer px-3 py-2 mt-1" value="all">All Games</SelectItem>
              <SelectItem className="text-sm text-[#ccc] hover:bg-[#202331] rounded-lg cursor-pointer px-3 py-2 mt-1" value="MM2">MM2</SelectItem>
              <SelectItem className="text-sm text-[#ccc] hover:bg-[#202331] rounded-lg cursor-pointer px-3 py-2 mt-1" value="PS99">PS99</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#1e2035] bg-[#0d0f1a] py-24 text-center">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#8B5CF615] border border-[#8B5CF630] text-[#8B5CF6]">
            <Dices className="w-6 h-6" />
          </span>
          <div>
            <p className="text-base font-bold text-white">No Active Dice Games</p>
            <p className="text-sm text-[#42496B] mt-1">Come back later or create one</p>
          </div>
          <p className="text-xs font-mono font-medium text-[#2a2e44]">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {games.map((g) => (
            <DiceRow
              key={g._id}
              game={g}
              countdowns={countdowns}
              userData={userData}
              setSelectedGame={setSelectedGame}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const StatCard = ({ title, value }) => (
  <div className="rounded-xl border border-solid border-[#1e2035] bg-[#12141f] px-4 py-3">
    <strong className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">{value}</strong>
    <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-[#42496B]">{title}</p>
  </div>
);
