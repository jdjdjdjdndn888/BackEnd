import { useState, useRef, useEffect, useCallback } from "react";
import { getrole, getLevelProgress, LEVEL_TIERS } from "@/utils/getrole";
import { ChevronDown, Zap, Star, Shield, Trophy } from "lucide-react";

const PERK_ICONS = [Zap, Star, Shield, Trophy];

/** Get next tier object from LEVEL_TIERS based on nextLevel threshold */
function getNextTier(currentRole) {
  if (!currentRole.nextLevel) return null;
  return LEVEL_TIERS.find((t) => t.minLevel === currentRole.nextLevel) ?? null;
}

/**
 * Level progress widget shown in the header.
 * Displays current level and next rank threshold; opens a popover
 * on click showing XP progress bar and the NEXT rank's perks.
 */
export default function LevelWidget({ level = 0, rank }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const role = getrole(rank, level);
  const { pct } = getLevelProgress(level);
  const nextTier = getNextTier(role);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Level progress — click to see next rank perks"
        className="flex items-center gap-2 rounded-xl border border-[#1e2035] bg-[#13151f] px-3 py-1.5 transition-all hover:border-[#252839] hover:bg-[#1a1d2e] active:scale-95"
      >
        {/* Rank dot */}
        <span
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black"
          style={{ background: role.bg, border: `1px solid ${role.border}`, color: role.color }}
        >
          {level}
        </span>

        <div className="flex flex-col items-start leading-none gap-0.5">
          <span className="text-[10px] font-semibold text-[#42496B] uppercase tracking-wider">
            {role.name}
          </span>
          {role.nextLevel ? (
            <span className="text-xs font-bold text-white">
              Lv {level}{" "}
              <span className="text-[#42496B]">→</span>{" "}
              <span style={{ color: role.color }}>{role.nextLevel}</span>
            </span>
          ) : (
            <span className="text-xs font-bold" style={{ color: role.color }}>
              Max Rank ✦
            </span>
          )}
        </div>

        <ChevronDown
          className="h-3 w-3 flex-shrink-0 text-[#42496B] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Level progress details"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-2xl border border-[#1e2035] bg-[#0f1220] shadow-2xl"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px #1e2035" }}
        >
          {/* Header gradient */}
          <div
            className="relative overflow-hidden px-5 pt-5 pb-4"
            style={{ background: `linear-gradient(135deg, ${role.bg}, transparent)` }}
          >
            <div className="mb-1 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: role.color }}>
                  {role.name}
                </p>
                <p className="text-lg font-black text-white">Level {level}</p>
              </div>
              {role.nextLevel && (
                <div className="text-right">
                  <p className="text-xs text-[#42496B]">Next rank</p>
                  <p className="text-sm font-bold" style={{ color: nextTier?.color ?? role.color }}>
                    {role.nextName}
                  </p>
                  <p className="text-xs text-[#42496B]">at Lv {role.nextLevel}</p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {role.nextLevel ? (
              <div className="mt-3">
                <div className="mb-1.5 flex justify-between text-[11px] font-semibold">
                  <span className="text-[#6B7280]">Progress</span>
                  <span style={{ color: role.color }}>{pct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1a1d2e]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${role.color}99, ${role.color})`,
                      boxShadow: `0 0 8px ${role.color}66`,
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#42496B]">
                  {pct}% to Lv {role.nextLevel} ({role.nextName})
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-[#1e2035] bg-[#13151f] px-3 py-2 text-center">
                <p className="text-xs font-bold" style={{ color: role.color }}>
                  ✦ Maximum rank achieved ✦
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-[#1e2035]" />

          {/* NEXT rank perks — sourced from the next tier object */}
          {nextTier && (
            <div className="px-5 py-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#42496B]">
                {nextTier.name} Perks
              </p>
              <div className="flex flex-col gap-2">
                {nextTier.perks.map((perk, i) => {
                  const Icon = PERK_ICONS[i % PERK_ICONS.length];
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <span
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ background: nextTier.bg, border: `1px solid ${nextTier.border}` }}
                      >
                        <Icon className="h-3 w-3" style={{ color: nextTier.color }} />
                      </span>
                      <span className="text-xs text-[#8B93B8]">{perk}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer hint */}
          <div className="border-t border-[#1e2035] px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#2a2e44]">
              Keep wagering to level up and unlock perks
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
