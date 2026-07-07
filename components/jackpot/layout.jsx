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
    fetch(`${api}/jackpot`, {
      mode: "cors",
      method: "GET",
    })
      .then(async (res) => {
        const data = await res.json();
        setJackpotData(data.gameData);
        setJackpotEntries(data.entries || []);
      })
      .catch((error) => console.error("Failed to fetch jackpot!", error));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof timeRemaining === "number" && timeRemaining > 0) {
        setTimeRemaining((prev) => prev - 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const handleJackpotUpdate = useCallback((data) => {
    setJackpotData(data.gameData);
    setJackpotEntries(data.entries || []);

    if (data.entries.length === 0) {
      setJackpotData((prevData) => ({
        ...prevData,
        result: null,
      }));
    }
  }, []);

  const handleTimeUpdate = (time) => {
    const timeString = String(time);
    if (timeString.includes("...")) {
      setTimeRemaining("0s");
      setShowWinner(false);
    } else {
      setTimeRemaining(`${timeString}s`);
    }
  };

  useEffect(() => {
    if (jackpotData.result) {
      audioRef.current = new Audio(Money);
      audioRef.current
        .play()
        .catch((error) => console.error("Audio playback error:", error));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [jackpotData.result]);

  useEffect(() => {
    socket.on("JACKPOT_UPDATE", handleJackpotUpdate);
    socket.on("JACKPOT_TIME_UPDATE", handleTimeUpdate);
    return () => {
      socket.off("JACKPOT_UPDATE", handleJackpotUpdate);
      socket.off("JACKPOT_TIME_UPDATE", handleTimeUpdate);
    };
  }, [socket, handleJackpotUpdate, handleTimeUpdate]);

  return (
    <div className="box-border min-h-full flex flex-wrap items-center justify-evenly gap-8 p-4">
      <Wheel
        jackpotData={jackpotData}
        jackpotEntries={jackpotEntries}
        showWinner={showWinner}
        timeRemaining={timeRemaining}
        setShowWinner={setShowWinner}
      />

      <div className="flex flex-col w-[min(90vw,22rem)] rounded-xl border border-solid border-[#1e2035] bg-[#12141f] overflow-hidden" style={{ height: "32rem" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2035]">
          <span className="text-xs font-bold uppercase tracking-widest text-[#42496B]">Entries</span>
          <span className="text-xs font-bold text-[#8B5CF6]">{jackpotEntries.length}/50</span>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
          {jackpotEntries.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-8">
              <p className="text-sm font-bold text-white">No entries yet</p>
              <p className="text-xs text-[#42496B]">Be the first to place a bet!</p>
            </div>
          ) : jackpotEntries.map((entry, index) => {
            const toRender = entry.items.slice(0, 4);
            const pct = Math.round((entry.value / jackpotData.value) * 100 * 100) / 100;
            return (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-xl border border-solid border-[#1e2035] bg-[#0f1220] p-3 transition-colors hover:border-[#252839]"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={entry.thumbnail}
                    alt={entry.username}
                    onClick={() => setModalState(<Profile userid={entry.joinerid} />)}
                    className="h-8 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-[#1e2035] object-cover transition-all hover:border-[#8B5CF6]"
                  />
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{ background: COLORS[index], color: "rgb(20,20,20)" }}
                  >
                    {entry.username}
                  </span>
                  <span className="ml-auto text-xs font-bold text-white">{pct}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {toRender.map((item, i) => (
                    <img key={i} className="h-9 w-9 rounded-lg border border-[#1e2035] object-contain bg-[#12141f]" src={item.itemimage} alt="" />
                  ))}
                  {entry.items.length > 4 && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2035] bg-[#12141f] text-xs font-bold text-white">
                      +{entry.items.length - 4}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Place bet button */}
        <div className="border-t border-[#1e2035] p-3">
          <button
            onClick={() => setModalState(userData ? <JoinJackpot /> : <LoginModal />)}
            className="w-full cursor-pointer rounded-xl border-none py-2.5 text-sm font-bold text-white tracking-wide transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}
            disabled={jackpotEntries.length >= 50 || jackpotData.result}
          >
            {jackpotEntries.length >= 50
              ? "Jackpot Full"
              : showWinner && jackpotData.result
                ? "Starting soon..."
                : jackpotData.result
                  ? "Rolling..."
                  : `Place a Bet (${timeRemaining})`}
          </button>
        </div>
      </div>
    </div>
  );
}