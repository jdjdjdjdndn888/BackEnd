import { NavLink } from "react-router-dom";
import { useModal } from "@/utils/ModalContext";
import { HomeIcon } from "@/assets/icons/HomeIcon";
import { MarketPlaceIcon } from "@/assets/icons/MarketPlaceIcon";
import { LeaderboardIcon } from "@/assets/icons/LeaderboardIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Leaderboard from "@/components/popup/leaderboard";
import { useLocation } from "react-router-dom";

const navItems = [
  { label: "Home",         icon: HomeIcon,        href: "/" },
  { label: "Coinflip",     icon: () => <img src="/coinflip-icon.png"  alt="Coinflip"      className="w-8 h-8 object-contain" />, href: "/coinflip"  },
  { label: "Dice",         icon: () => <img src="/dice-icon.png"      alt="Dice"          className="w-8 h-8 object-contain" />, href: "/dice"      },
  { label: "Jackpot",      icon: () => <img src="/jackpot-icon.png"   alt="Jackpot"       className="w-8 h-8 object-contain" />, href: "/jackpot"   },
  { label: "BlackJack 1v1",icon: () => <img src="/blackjack-icon.png" alt="BlackJack 1v1" className="w-8 h-8 object-contain" />, href: "/blackjack" },
  { label: "Upgrader",     icon: () => <img src="/upgrader-icon.png"  alt="Upgrader"      className="w-8 h-8 object-contain" />, href: "/upgrader"  },
  { label: "Trades",       icon: MarketPlaceIcon, href: "/trades"    },
];

export default function Sidenav() {
  const { setModalState } = useModal();
  const location = useLocation();

  return (
    <aside style={{
      display: "none",
      width: 72,
      flexShrink: 0,
      flexDirection: "column",
      background: "#0c0c0c",
      borderRight: "1px solid rgba(255,255,255,0.07)",
      height: "100%",
      zIndex: 20,
    }}
      className="lg:flex"
    >
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "var(--header-height)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 6px",
      }}>
        <NavLink to="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <img src="/logo-ps99bet.png" alt="PS99Bet" style={{ height: 32, width: "auto", objectFit: "contain" }} draggable={false} />
        </NavLink>
      </div>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 4, flex: 1 }}>
        <TooltipProvider delayDuration={0}>
          {navItems.map(({ label, icon: Icon, href }) => {
            const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
            return (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={href}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 44, height: 44, borderRadius: 10,
                      transition: "background 0.15s",
                      background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                      outline: isActive ? "1px solid rgba(255,255,255,0.15)" : "none",
                      color: isActive ? "#fff" : "#555",
                    }}
                    className="[&>svg]:w-5 [&>svg]:h-5 hover:bg-[rgba(255,255,255,0.05)]"
                  >
                    <Icon />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#111] border border-[rgba(255,255,255,0.1)] text-white text-xs px-3 py-1.5 rounded-lg">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setModalState(<Leaderboard />)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 44, height: 44, borderRadius: 10,
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "#555", transition: "background 0.15s, color 0.15s",
                }}
                className="[&>svg]:w-5 [&>svg]:h-5 hover:bg-[rgba(255,255,255,0.05)] hover:!text-white"
              >
                <LeaderboardIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#111] border border-[rgba(255,255,255,0.1)] text-white text-xs px-3 py-1.5 rounded-lg">
              Leaderboard
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>

      {/* Discord */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <a
          href="https://discord.gg/MH7rp8jh7E"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 10, transition: "background 0.15s" }}
          className="hover:bg-[rgba(88,101,242,0.12)]"
        >
          <img src="/discord.png" alt="Discord" style={{ width: 48, height: 48, objectFit: "contain" }} draggable={false} />
        </a>
      </div>
    </aside>
  );
}
