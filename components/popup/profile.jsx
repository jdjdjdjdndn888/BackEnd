import React, { useContext, useEffect, useState } from "react";
import { useModal } from "../../utils/ModalContext";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import Tip from "../tip/tip.jsx";

const rankMeta = {
  OWNER:  { label: "Owner",     color: "#FF6B6B" },
  ADMIN:  { label: "Admin",     color: "#FF9F43" },
  MOD:    { label: "Moderator", color: "#54A0FF" },
  USER:   { label: "User",      color: "#68749C" },
};

function getRank(rank) {
  return rankMeta[rank?.toUpperCase?.()] || rankMeta.USER;
}

export default function Profile({ userId }) {
  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) { setLoading(false); setError("No user specified."); return; }
    fetch(`${api}/users/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userid: userId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProfile(d.data);
        else setError(d.message || "User not found.");
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [userId]);

  const openTip = () => {
    setModalState(
      <Tip userId={userId} onClose={() => setModalState(null)} />
    );
  };

  const rank = getRank(profile?.rank);
  const isSelf = userData?.userid === userId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={() => setModalState(null)}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[#131520] border border-[#252839] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer z-10"
          onClick={() => setModalState(null)}
        >
          ✕
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#68749C] text-sm">
            Loading...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-red-400 text-sm px-6 text-center">
            {error}
          </div>
        ) : (
          <>
            <div
              className="px-6 pt-8 pb-5 flex flex-col items-center gap-3"
              style={{ background: "linear-gradient(160deg,#1a1f35 0%,#131520 100%)" }}
            >
              <div className="relative">
                <img
                  src={profile.thumbnail}
                  alt={profile.username}
                  className="w-20 h-20 rounded-full border-2 object-cover"
                  style={{ borderColor: rank.color }}
                />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-white leading-tight">
                  {profile.username}
                </h2>
                {profile.displayname && profile.displayname !== profile.username && (
                  <p className="text-xs text-[#68749C]">{profile.displayname}</p>
                )}
                <span
                  className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: rank.color + "22", color: rank.color }}
                >
                  {rank.label}
                </span>
              </div>

              {profile.discordusername && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#5865F2] text-xs font-semibold">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                  @{profile.discordusername}
                </div>
              )}

              <div className="w-full grid grid-cols-3 gap-2 mt-1">
                {[
                  { label: "Wagered", value: profile.wager ?? 0 },
                  { label: "Won",     value: profile.won   ?? 0 },
                  { label: "Lost",    value: profile.lost  ?? 0 },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center rounded-xl bg-[#1C1F2E] border border-[#252839] py-2 px-1"
                  >
                    <span className="text-xs font-bold text-white">
                      R${Number(value).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#68749C] mt-0.5">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {!isSelf && (
              <div className="px-6 pb-6">
                <button
                  onClick={openTip}
                  className="w-full rounded-xl py-2.5 text-sm font-bold text-white border-none cursor-pointer transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}
                >
                  💜 Send Tip
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
