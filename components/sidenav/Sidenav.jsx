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
  { label: "Home",          href: "/",          icon: HomeIcon,        img: null             },
  { label: "Coinflip",      href: "/coinflip",  icon: null,            img: "/coinflip-icon.png"  },
  { label: "Dice",          href: "/dice",      icon: null,            img: "/dice-icon.png"      },
  { label: "Jackpot",       href: "/jackpot",   icon: null,            img: "/jackpot-icon.png"   },
  { label: "Blackjack",     href: "/blackjack", icon: null,            img: "/blackjack-icon.png" },
  { label: "Upgrader",      href: "/upgrader",  icon: null,            img: "/upgrader-icon.png"  },
  { label: "Trades",        href: "/trades",    icon: MarketPlaceIcon, img: null             },
];

function NavIcon({ icon: Icon, img, active }) {
  if (img) return <img src={img} alt="" style={{ width: 22, height: 22, objectFit: "contain", opacity: active ? 1 : 0.55, transition: "opacity 0.18s" }} />;
  return (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: active ? 1 : 0.45, transition: "opacity 0.18s", color: "#fff" }}
      className="[&>svg]:w-[18px] [&>svg]:h-[18px]">
      <Icon />
    </span>
  );
}

export default function Sidenav() {
  const { setModalState } = useModal();
  const location = useLocation();

  return (
    <aside className="hidden lg:flex" style={{
      width: 210,
      flexShrink: 0,
      flexDirection: "column",
      background: "#080808",
      borderRight: "1px solid rgba(255,255,255,0.05)",
      height: "100%",
      zIndex: 20,
    }}>

      {/* ── Logo ── */}
      <div style={{
        height: "var(--header-height)",
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
        gap: 10,
      }}>
        <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/logo-ps99bet.png" alt="PS99Bet" draggable={false}
            style={{ height: 28, width: "auto", objectFit: "contain" }} />
        </NavLink>
      </div>

      {/* ── Game links ── */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 10px", gap: 2, overflowY: "auto" }}>

        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#333", padding: "8px 8px 4px" }}>
          Games
        </p>

        {NAV_ITEMS.map(({ label, href, icon, img }) => {
          const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
          return (
            <div key={href} style={{ position: "relative" }}>
              {/* Left indicator */}
              {isActive && (
                <span style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: 18,
                  borderRadius: "0 3px 3px 0",
                  background: "#fff",
                  boxShadow: "0 0 8px rgba(255,255,255,0.45)",
                }} />
              )}
              <NavLink
                to={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "9px 10px 9px 14px",
                  borderRadius: 9,
                  textDecoration: "none",
                  background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
                  transition: "background 0.15s",
                }}
                className="group hover:!bg-[rgba(255,255,255,0.04)]"
              >
                <NavIcon icon={icon} img={img} active={isActive} />
                <span style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#fff" : "#555",
                  transition: "color 0.15s",
                  letterSpacing: "0.01em",
                }}
                  className="group-hover:!text-[rgba(255,255,255,0.65)]"
                >
                  {label}
                </span>
              </NavLink>
            </div>
          );
        })}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 8px" }} />

        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#333", padding: "4px 8px" }}>
          More
        </p>

        {/* Leaderboard */}
        <div style={{ position: "relative" }}>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setModalState(<Leaderboard />)}
                  style={{
                    display: "flex", alignItems: "center", gap: 11,
                    padding: "9px 10px 9px 14px",
                    borderRadius: 9, width: "100%",
                    background: "transparent", border: "none", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  className="group hover:!bg-[rgba(255,255,255,0.04)]"
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4, color: "#fff", transition: "opacity 0.15s" }}
                    className="[&>svg]:w-[18px] [&>svg]:h-[18px] group-hover:!opacity-70">
                    <LeaderboardIcon />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#555", letterSpacing: "0.01em" }}
                    className="group-hover:!text-[rgba(255,255,255,0.65)]">
                    Leaderboard
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}
                style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 12, borderRadius: 8, padding: "5px 10px" }}>
                Leaderboard
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </nav>

      {/* ── Discord ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "10px", flexShrink: 0 }}>
        <a
          href="https://discord.gg/MH7rp8jh7E"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 11,
            padding: "9px 10px 9px 14px",
            borderRadius: 9, textDecoration: "none",
            transition: "background 0.15s",
            opacity: 0.45,
          }}
          className="group hover:!bg-[rgba(88,101,242,0.12)] hover:!opacity-90"
        >
          <img src="/discord.png" alt="Discord" style={{ width: 22, height: 22, objectFit: "contain" }} draggable={false} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", letterSpacing: "0.01em" }}>Discord</span>
        </a>
      </div>
    </aside>
  );
}
