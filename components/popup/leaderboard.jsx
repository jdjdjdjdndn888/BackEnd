import React, { useState, useEffect } from "react";
import { useModal } from "../../utils/ModalContext";
import { api } from "../../config.js";

export default function Leaderboard() {
  const { setModalState } = useModal();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${api}/leaderboard`, { method: "GET" });
        const data = await res.json();
        if (data.leaderboard) setLeaderboard(data.leaderboard);
      } catch (e) {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={() => setModalState(null)}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#1a1f30] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
          onClick={() => setModalState(null)}
        >
          ✕
        </button>
        <h2 className="mb-4 text-xl font-bold text-white">Leaderboard</h2>
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-gray-400">No data available.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((user, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-[#252b3b] px-4 py-3">
                <span className="font-bold text-yellow-400">#{i + 1}</span>
                <span className="text-white">{user.username}</span>
                <span className="text-green-400">{user.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
