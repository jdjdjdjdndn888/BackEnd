import { NavLink, useLocation } from "react-router-dom";
import { useModal } from "@/utils/ModalContext";
import { HomeIcon } from "@/assets/icons/HomeIcon";
import { MarketPlaceIcon } from "@/assets/icons/MarketPlaceIcon";
import { LeaderboardIcon } from "@/assets/icons/LeaderboardIcon";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import Leaderboard from "@/components/popup/leaderboard";

const NAV_ITEMS = [
  { label: "Home",          icon: HomeIcon,        href: "/" },
  { label: "Coinflip",      icon: () => <img src="/coinflip-icon.png"  alt="" className="w-7 h-7 object-contain drop-shadow-sm" />, href: "/coinflip"  },
  { label: "Dice",          icon: () => <img src="/dice-icon.png"      alt="" className="w-7 h-7 object-contain drop-shadow-sm" />, href: "/dice"      },
  { label: "Jackpot",       icon: () => <img src="/jackpot-icon.png"   alt="" className="w-7 h-7 object-contain drop-shadow-sm" />, href: "/jackpot"   },
  { label: "BlackJack 1v1", icon: () => <img src="/blackjack-icon.png" alt="" className="w-7 h-7 object-contain drop-shadow-sm" />, href: "/blackjack" },
  { label: "Upgrader",      icon: () => <img src="/upgrader-icon.png"  alt="" className="w-7 h-7 object-contain drop-shadow-sm" />, href: "/upgrader"  },
  { label: "Trades",        icon: MarketPlaceIcon, href: "/trades"    },
];

export default function Sidenav() {
  const { setModalState } = useModal();
  const location = useLocation();

  return (
    <aside className="hidden lg:flex" style={{
      width: 72,
      flexShrink: 0,
      flexDirection: "column",
      background: "#080808",
      borderRight: "1px solid rgba(255,255,255,0.05)",
      height: "100%",
      zIndex: 20,
      position: "relative",
    }}>

      {/* ── Logo ── */}
      <div style={{
        height: "var(--header-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}>
        <NavLink to="/" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img
            src="/logo-ps99bet.png"
            alt="PS99Bet"
            draggable={false}
            style={{ height: 30, width: "auto", objectFit: "contain", filter: "brightness(1.05)" }}
          />
        </NavLink>
      </div>

      {/* ── Nav Items ── */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0", gap: 2, overflowY: "auto" }}>
        <TooltipProvider delayDuration={100}>
          {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
            const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
            return (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  {/* Full-width row so the left indicator can span the sidebar edge */}
                  <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", padding: "2px 0" }}>
                    {/* Left-edge active indicator */}
                    {isActive && (
                      <span style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 3,
                        height: 22,
                        borderRadius: "0 3px 3px 0",
                        background: "#ffffff",
                        boxShadow: "0 0 8px rgba(255,255,255,0.5)",
                        pointerEvents: "none",
                      }} />
                    )}
                    <NavLink
                      to={href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        transition: "background 0.18s ease, opacity 0.18s ease",
                        background: isActive
                          ? "rgba(255,255,255,0.08)"
                          : "transparent",
                        opacity: isActive ? 1 : 0.35,
                        color: "#fff",
                        textDecoration: "none",
                      }}
                      className="[&>svg]:w-[18px] [&>svg]:h-[18px] hover:!bg-[rgba(255,255,255,0.06)] hover:!opacity-70"
                    >
                      <Icon />
                    </NavLink>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={10}
                  style={{
                    background: "#141414",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "5px 10px",
                    borderRadius: 8,
                    letterSpacing: "0.01em",
                  }}
                >
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* ── Separator ── */}
          <div style={{ width: 28, height: 1, background: "rgba(255,255,255,0.06)", margin: "6px 0" }} />

          {/* ── Leaderboard ── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", padding: "2px 0" }}>
                <button
                  type="button"
                  onClick={() => setModalState(<Leaderboard />)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 44, height: 44, borderRadius: 12,
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "#fff", opacity: 0.3,
                    transition: "background 0.18s, opacity 0.18s",
                  }}
                  className="[&>svg]:w-[18px] [&>svg]:h-[18px] hover:!bg-[rgba(255,255,255,0.06)] hover:!opacity-65"
                >
                  <LeaderboardIcon />
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={10}
              style={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                padding: "5px 10px",
                borderRadius: 8,
              }}
            >
              Leaderboard
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>

      {/* ── Discord ── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 0",
        flexShrink: 0,
      }}>
        <a
          href="https://discord.gg/MH7rp8jh7E"
          target="_blank"
          rel="noopener noreferrer"
          title="Join our Discord"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 44, height: 44, borderRadius: 12,
            transition: "background 0.18s, opacity 0.18s",
            opacity: 0.4,
          }}
          className="hover:!bg-[rgba(88,101,242,0.18)] hover:!opacity-90"
        >
          <img src="/discord.png" alt="Discord" style={{ width: 26, height: 26, objectFit: "contain" }} draggable={false} />
        </a>
      </div>
    </aside>
  );
}
