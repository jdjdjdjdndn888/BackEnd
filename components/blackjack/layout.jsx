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
import { Spade } from "lucide-react";
import CreateBlackjack from "./Create/createblackjack.jsx";
import BlackjackRow from "./BlackjackRow.jsx";
import BlackjackHistory from "./history/history.jsx";
import BlackjackView from "./View/view.jsx";

export default function BlackjackLayout() {
  const { setModalState } = useModal();
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const { userData } = useContext(UserContext);
  const socket = useContext(SocketContext);
  const [sortCriteria, setSortCriteria] = useState("high");
  const [gameFilter, setGameFilter] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
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
      const res = await fetch(`${api}/blackjack/games`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const filtered = data.data.filter((g) => gameFilter === "all" || g.game === gameFilter);
      setGames(sortGames(filtered));
    } catch {
      toast.error("Failed to fetch blackjack games");
    }
  }, [gameFilter, sortGames]);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  useEffect(() => {
    socket.on("NEW_BLACKJACK", (g) => {
      setGames((prev) => sortGames([g, ...prev]));
    });
    socket.on("BLACKJACK_UPDATE", (updated) => {
      setGames((prev) => sortGames(prev.map((g) => g._id === updated._id ? updated : g)));

      setSelectedGame((prevSelected) => {
        if (prevSelected?._id === updated._id) {
          setModalState(
            <BlackjackView game={updated} onClose={() => setSelectedGame(null)} />
          );
          return updated;
        }
        return prevSelected;
      });
    });
    socket.on("BLACKJACK_CANCEL", (data) => {
      setGames((prev) => sortGames(prev.filter((g) => g._id !== data._id)));
    });
    return () => {
      socket.off("NEW_BLACKJACK");
      socket.off("BLACKJACK_UPDATE");
      socket.off("BLACKJACK_CANCEL");
    };
  }, [socket, sortGames]);

  const totalGames = games.length;
  const totalValue = useMemo(() => games.reduce((s, g) => s + (g.requirements.static || 0), 0), [games]);
  const totalItems = useMemo(() => games.reduce((s, g) => s + g.PlayerOne.items.length + (g.PlayerTwo?.items?.length ?? 0), 0), [games]);

  return (
    <div className="box-border p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatCard title="Rooms" value={totalGames.toLocaleString()} />
        <StatCard title="Value" value={<><WalletIcon className="w-5 text-[#8B5CF6]" /> {formatLargeNumber(totalValue)}</>} />
        <StatCard title="Items" value={totalItems.toLocaleString()} />
      </div>

      <div className="my-2.5 flex items-center gap-2.5">
        <div className="mr-auto flex gap-2.5">
          <button
            onClick={() => {
              setModalState(null);
              setTimeout(() => setModalState(
                userData ? <CreateBlackjack onCreate={() => {}} onClose={() => setModalState(null)} /> : <LoginModal />
              ));
            }}
            className="min-w-24 cursor-pointer rounded-lg border-none bg-[#8B5CF6] p-2.5 text-base font-semibold text-white transition-colors hover:bg-[#7C3AED]"
          >
            Create
          </button>
          <button
            className="min-w-24 cursor-pointer rounded-lg border-none bg-[#2A2E44] p-2.5 text-base font-semibold text-white transition-colors hover:opacity-80"
            onClick={() => setModalState(userData ? <BlackjackHistory /> : <LoginModal />)}
          >
            History
          </button>
        </div>

        <div className="hidden sm:contents">
          <Select onValueChange={setSortCriteria} value={sortCriteria}>
            <SelectTrigger className="h-10 w-44 rounded-lg border border-[#252839] bg-[#1C1F2E] px-3 text-sm text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1C1F2D] border border-[#252839] rounded-lg p-1 mt-1">
              <SelectItem className="text-white hover:bg-[#252839] rounded cursor-pointer px-3 py-2" value="high">Highest to Lowest</SelectItem>
              <SelectItem className="text-white hover:bg-[#252839] rounded cursor-pointer px-3 py-2" value="low">Lowest to Highest</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={setGameFilter} value={gameFilter}>
            <SelectTrigger className="h-10 w-36 rounded-lg border border-[#252839] bg-[#1C1F2E] px-3 text-sm text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1C1F2D] border border-[#252839] rounded-lg p-1 mt-1">
              <SelectItem className="text-white hover:bg-[#252839] rounded cursor-pointer px-3 py-2" value="all">All Games</SelectItem>
              <SelectItem className="text-white hover:bg-[#252839] rounded cursor-pointer px-3 py-2" value="MM2">MM2</SelectItem>
              <SelectItem className="text-white hover:bg-[#252839] rounded cursor-pointer px-3 py-2" value="PS99">PS99</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#252839] py-24 text-center">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#8B5CF620] text-[#8B5CF6]">
            <Spade className="w-7 h-7" />
          </span>
          <p className="text-lg font-semibold text-white">No Active Blackjack Games</p>
          <p className="text-sm text-[#6B7280]">Come Back Later Or Create One</p>
          <p className="text-xs font-medium text-[#42496B]">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {games.map((g) => (
            <BlackjackRow
              key={g._id}
              game={g}
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
  <div className="rounded-md border border-solid border-[#252839] px-3 pb-3 pt-2 text-sm font-bold text-[#6B7280]">
    <strong className="flex items-center gap-1 text-xl text-white">{value}</strong>
    <p>{title}</p>
  </div>
);
