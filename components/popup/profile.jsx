import React, { useContext, useEffect, useState } from "react";
import { useModal } from "../../utils/ModalContext";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import Tip from "../tip/tip.jsx";

// ── Rank metadata ────────────────────────────────────────────────────────────
const RANK_META = {
  OWNER:         { label: "Owner",         color: "#FF6B6B", glow: "#FF6B6B" },
  CO_OWNER:      { label: "Co-Owner",      color: "#FF8C69", glow: "#FF8C69" },
  ADMIN:         { label: "Admin",         color: "#FF9F43", glow: "#FF9F43" },
  TRUSTED_STAFF: { label: "Trusted Staff", color: "#A29BFE", glow: "#A29BFE" },
  MODERATOR:     { label: "Moderator",     color: "#54A0FF", glow: "#54A0FF" },
  TRIAL_STAFF:   { label: "Trial Staff",   color: "#74B9FF", glow: "#74B9FF" },
  MIDDLEMAN:     { label: "Middleman",     color: "#00CEC9", glow: "#00CEC9" },
  USER:          { label: "User",          color: "#8B5CF6", glow: "#8B5CF6" },
};

function getRank(rank) {
  return RANK_META[rank?.toUpperCase?.().replace(/ /g, "_")] || RANK_META.USER;
}

function fmt(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000)         return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toLocaleString();
}

// ── Sparkle SVG (4-pointed star) ────────────────────────────────────────────
function Sparkle({ size = 12, color = "#fff", style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path
        d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
        fill={color}
      />
    </svg>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Profile({ userId }) {
  const { setModalState } = useModal();
  const { userData } = useContext(UserContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!userId) { setLoading(false); setError("No user specified."); return; }
    fetch(`${api}/users/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userid: userId }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setProfile(d.data); else setError(d.message || "User not found."); })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [userId]);

  const openTip = () => setModalState(<Tip userId={userId} onClose={() => setModalState(null)} />);

  const rank   = getRank(profile?.rank);
  const isSelf = userData?.userid === userId;

  const totalWager = Number(profile?.wager) || 0;
  const level      = Number(profile?.level) || 1;

  // Win-rate calculation
  const totalWon  = Number(profile?.won)  || 0;
  const totalLost = Number(profile?.lost) || 0;
  const totalGames = totalWon + totalLost;
  const winRate = totalGames > 0 ? Math.round((totalWon / totalGames) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
      onClick={() => setModalState(null)}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0D0F1C", border: "1px solid rgba(139,92,246,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => setModalState(null)}
          className="absolute right-4 top-4 z-20 text-[#4A506B] hover:text-white bg-transparent border-none text-lg cursor-pointer leading-none transition-colors"
        >
          ✕
        </button>

        {/* ── Loading / Error ─────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-[#68749C] text-sm">
            <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>Loading…</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center py-20 text-red-400 text-sm px-6 text-center">
            {error}
          </div>
        )}

        {/* ── Profile content ─────────────────────────────────────────────── */}
        {!loading && profile && (
          <>
            {/* Header glow zone */}
            <div className="relative px-6 pt-10 pb-6 flex flex-col items-center" style={{ overflow: "hidden" }}>

              {/* Radial gem-glow backdrop */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(ellipse 70% 55% at 50% 0%, ${rank.glow}28 0%, transparent 75%)`,
                  pointerEvents: "none",
                }}
              />

              {/* Decorative sparkles */}
              <Sparkle size={10} color={rank.color} style={{ position: "absolute", top: 18, left: "22%", opacity: 0.7, animation: "twinkle 2.4s ease-in-out infinite" }} />
              <Sparkle size={7}  color={rank.color} style={{ position: "absolute", top: 32, right: "20%", opacity: 0.5, animation: "twinkle 3.1s ease-in-out infinite 0.6s" }} />
              <Sparkle size={6}  color="#fff"        style={{ position: "absolute", top: 12, left: "38%", opacity: 0.3, animation: "twinkle 2.8s ease-in-out infinite 1.2s" }} />
              <Sparkle size={8}  color={rank.color} style={{ position: "absolute", top: 50, left: "14%", opacity: 0.35, animation: "twinkle 3.6s ease-in-out infinite 0.3s" }} />
              <Sparkle size={5}  color="#fff"        style={{ position: "absolute", top: 24, right: "33%", opacity: 0.25, animation: "twinkle 2.2s ease-in-out infinite 1.8s" }} />

              {/* Avatar with glow ring */}
              <div className="relative z-10 mb-4">
                {/* Outer glow halo */}
                <div
                  style={{
                    position: "absolute",
                    inset: -6,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${rank.glow}55 0%, transparent 70%)`,
                    filter: "blur(8px)",
                  }}
                />
                {/* Ring */}
                <div
                  style={{
                    padding: 3,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${rank.color}, ${rank.color}66)`,
                    boxShadow: `0 0 20px ${rank.glow}80, 0 0 40px ${rank.glow}30`,
                  }}
                >
                  <div style={{ padding: 2, borderRadius: "50%", background: "#0D0F1C" }}>
                    <img
                      src={profile.thumbnail}
                      alt={profile.username}
                      style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                </div>

                {/* Level badge */}
                <div
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -6,
                    background: `linear-gradient(135deg, ${rank.color}, ${rank.color}cc)`,
                    borderRadius: 20,
                    padding: "2px 7px",
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#fff",
                    boxShadow: `0 0 10px ${rank.glow}80`,
                    border: "1.5px solid #0D0F1C",
                    whiteSpace: "nowrap",
                  }}
                >
                  Lv {level}
                </div>
              </div>

              {/* Username + rank badge */}
              <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.3px", textAlign: "center" }}>
                {profile.username}
              </h2>
              {profile.displayname && profile.displayname !== profile.username && (
                <p style={{ color: "#68749C", fontSize: 11, margin: "2px 0 0", textAlign: "center" }}>{profile.displayname}</p>
              )}

              <div
                style={{
                  marginTop: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: `${rank.color}18`,
                  border: `1px solid ${rank.color}44`,
                  boxShadow: `0 0 12px ${rank.glow}30`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: rank.color,
                  letterSpacing: "0.3px",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: rank.color, boxShadow: `0 0 6px ${rank.glow}` }} />
                {rank.label}
              </div>

              {/* Discord linked */}
              {profile.discordusername && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    borderRadius: 10,
                    background: "rgba(88,101,242,0.1)",
                    border: "1px solid rgba(88,101,242,0.25)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#7289DA",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                  @{profile.discordusername}
                </div>
              )}
            </div>

            {/* ── Divider ─────────────────────────────────────────────────── */}
            <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)", margin: "0 0" }} />

            {/* ── Stats ───────────────────────────────────────────────────── */}
            <div style={{ padding: "20px 20px 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {[
                  { label: "Wagered",  value: totalWager, icon: "💎", color: "#8B5CF6" },
                  { label: "Won",      value: totalWon,   icon: "🏆", color: "#4ADE80" },
                  { label: "Lost",     value: totalLost,  icon: "📉", color: "#F87171" },
                ].map(({ label, value, icon, color }) => (
                  <div
                    key={label}
                    style={{
                      background: "#13162A",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12,
                      padding: "12px 8px",
                      textAlign: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Subtle inner glow top */}
                    <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
                      R${fmt(value)}
                    </div>
                    <div style={{ fontSize: 10, color: "#4A506B", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Win rate bar */}
              {totalGames > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "#4A506B", fontWeight: 600 }}>Win Rate</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: winRate >= 50 ? "#4ADE80" : "#F87171" }}>
                      {winRate}%
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 10, background: "#1A1D2E", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${winRate}%`,
                        borderRadius: 10,
                        background: winRate >= 50
                          ? "linear-gradient(90deg,#22C55E,#4ADE80)"
                          : "linear-gradient(90deg,#DC2626,#F87171)",
                        boxShadow: winRate >= 50 ? "0 0 8px #4ADE8088" : "0 0 8px #F8717188",
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: "#4A506B", marginTop: 4, textAlign: "right" }}>
                    {totalWon}W · {totalLost}L
                  </div>
                </div>
              )}
            </div>

            {/* ── Wager tier badge ────────────────────────────────────────── */}
            <WagerTier wager={totalWager} />

            {/* ── Tip button ─────────────────────────────────────────────── */}
            {!isSelf && (
              <div style={{ padding: "16px 20px 20px" }}>
                <button
                  onClick={openTip}
                  style={{
                    width: "100%",
                    padding: "11px 0",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    background: "linear-gradient(135deg,#8B5CF6,#7C3AED)",
                    boxShadow: "0 0 20px rgba(139,92,246,0.35), 0 4px 15px rgba(0,0,0,0.3)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    transition: "opacity 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 28px rgba(139,92,246,0.55), 0 4px 15px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(139,92,246,0.35), 0 4px 15px rgba(0,0,0,0.3)"; }}
                >
                  💎 Send Tip
                </button>
              </div>
            )}

            {isSelf && <div style={{ height: 20 }} />}
          </>
        )}
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes twinkle {
          0%,100% { opacity: 0.15; transform: scale(0.85); }
          50%      { opacity: 0.8;  transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

// ── Wager tier display ───────────────────────────────────────────────────────
const TIERS = [
  { label: "Legend",      min: 1_000_000_000, color: "#FF6B6B", icon: "👑", glow: "#FF6B6B" },
  { label: "Whale",       min: 500_000_000,   color: "#FF9F43", icon: "🐋", glow: "#FF9F43" },
  { label: "High Roller", min: 100_000_000,   color: "#A29BFE", icon: "💜", glow: "#A29BFE" },
  { label: "Diamond",     min: 50_000_000,    color: "#74B9FF", icon: "💎", glow: "#74B9FF" },
  { label: "Gold",        min: 10_000_000,    color: "#FFD700", icon: "🥇", glow: "#FFD700" },
  { label: "Silver",      min: 1_000_000,     color: "#C0C0C0", icon: "🥈", glow: "#C0C0C0" },
  { label: "Bronze",      min: 100_000,       color: "#CD7F32", icon: "🥉", glow: "#CD7F32" },
];

function WagerTier({ wager }) {
  const tier = TIERS.find((t) => wager >= t.min);
  if (!tier) return null;

  // Progress to next tier
  const idx = TIERS.indexOf(tier);
  const nextTier = idx > 0 ? TIERS[idx - 1] : null;
  const progress = nextTier
    ? Math.min(100, Math.round(((wager - tier.min) / (nextTier.min - tier.min)) * 100))
    : 100;

  return (
    <div style={{ margin: "14px 20px 0", padding: "12px 14px", borderRadius: 12, background: "#13162A", border: `1px solid ${tier.color}22` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{tier.icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: tier.color, lineHeight: 1, textShadow: `0 0 10px ${tier.glow}88` }}>
              {tier.label}
            </div>
            <div style={{ fontSize: 10, color: "#4A506B", marginTop: 2 }}>Wager Tier</div>
          </div>
        </div>
        {nextTier && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#4A506B" }}>Next: {nextTier.label}</div>
            <div style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{progress}%</div>
          </div>
        )}
      </div>
      {nextTier && (
        <div style={{ marginTop: 8, height: 4, borderRadius: 10, background: "#1A1D2E", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 10,
              background: `linear-gradient(90deg, ${tier.color}99, ${tier.color})`,
              boxShadow: `0 0 8px ${tier.glow}88`,
            }}
          />
        </div>
      )}
    </div>
  );
}
