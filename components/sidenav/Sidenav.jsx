import { useState, useEffect } from "react";
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
  { label: "Home",      href: "/",          icon: HomeIcon,        img: null                  },
  { label: "Coinflip",  href: "/coinflip",  icon: null,            img: "/coinflip-icon.png"  },
  { label: "Dice",      href: "/dice",      icon: null,            img: "/dice-icon.png"      },
  { label: "Jackpot",   href: "/jackpot",   icon: null,            img: "/jackpot-icon.png"   },
  { label: "Blackjack", href: "/blackjack", icon: null,            img: "/blackjack-icon.png" },
  { label: "Mines",     href: "/mines",     icon: null,            img: "/mines-gem.png"      },
  { label: "Upgrader",  href: "/upgrader",  icon: null,            img: "/upgrader-icon.png"  },
  { label: "Trades",    href: "/trades",    icon: MarketPlaceIcon, img: null                  },
];

function NavIcon({ icon: Icon, img, active }) {
  if (img) return (
    <img src={img} alt="" style={{ width: 22, height: 22, objectFit: "contain", opacity: active ? 1 : 0.55, transition: "opacity 0.18s", flexShrink: 0 }} />
  );
  return (
    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: active ? 1 : 0.45, transition: "opacity 0.18s", color: "#fff", flexShrink: 0 }}
      className="[&>svg]:w-[18px] [&>svg]:h-[18px]">
      <Icon />
    </span>
  );
}

// ── Hamburger icon ─────────────────────────────────────────────────────────────
function HamburgerIcon({ open }) {
  const bar = {
    display: "block",
    width: 18,
    height: 2,
    borderRadius: 2,
    background: "#888",
    transition: "opacity 0.2s, transform 0.25s",
  };
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, cursor: "pointer" }}>
      <span style={{ ...bar, ...(open ? { transform: "rotate(45deg) translate(4px, 4px)" } : {}) }} />
      <span style={{ ...bar, ...(open ? { opacity: 0 } : {}) }} />
      <span style={{ ...bar, ...(open ? { transform: "rotate(-45deg) translate(4px, -4px)" } : {}) }} />
    </span>
  );
}

export default function Sidenav({ mobileOpen = false, onMobileClose = () => {} }) {
  const { setModalState } = useModal();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);

  // Close mobile drawer on route change
  useEffect(() => { onMobileClose(); }, [location.pathname]);

  const W = collapsed ? 62 : 210;

  const navContent = (isMobile = false) => (
    <>
      {/* ── Logo + hamburger ── */}
      <div style={{
        height: "var(--header-height)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
        gap: 10,
        justifyContent: (isMobile || !collapsed) ? "space-between" : "center",
      }}>
        {(isMobile || !collapsed) && (
          <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", overflow: "hidden" }}>
            <img src="/logo-gemtide.png" alt="GemTide" draggable={false}
              style={{ height: 28, width: "auto", objectFit: "contain", flexShrink: 0 }} />
          </NavLink>
        )}
        {isMobile ? (
          <button
            onClick={onMobileClose}
            style={{ background: "none", border: "none", padding: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, flexShrink: 0 }}
            className="hover:!bg-[rgba(255,255,255,0.06)] transition-colors"
            title="Close menu"
          >
            <HamburgerIcon open={true} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed((c) => !c)}
            style={{ background: "none", border: "none", padding: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, flexShrink: 0 }}
            className="hover:!bg-[rgba(255,255,255,0.06)] transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <HamburgerIcon open={collapsed} />
          </button>
        )}
      </div>

      {/* ── Game links ── */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 8px", gap: 2, overflowY: "auto", overflowX: "hidden" }}>

        {(isMobile || !collapsed) && (
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#333", padding: "8px 8px 4px", whiteSpace: "nowrap" }}>
            Games
          </p>
        )}
        {!isMobile && collapsed && <div style={{ height: 12 }} />}

        {NAV_ITEMS.map(({ label, href, icon, img }) => {
          const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
          const showLabel = isMobile || !collapsed;
          return (
            <TooltipProvider key={href} delayDuration={(isMobile || !collapsed) ? 600 : 80}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div style={{ position: "relative" }}>
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
                        gap: showLabel ? 11 : 0,
                        padding: showLabel ? "9px 10px 9px 14px" : "9px 0",
                        justifyContent: showLabel ? "flex-start" : "center",
                        borderRadius: 9,
                        textDecoration: "none",
                        background: isActive ? "rgba(255,255,255,0.07)" : "transparent",
                        transition: "background 0.15s",
                        overflow: "hidden",
                      }}
                      className="group hover:!bg-[rgba(255,255,255,0.04)]"
                    >
                      <NavIcon icon={icon} img={img} active={isActive} />
                      {showLabel && (
                        <span style={{
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? "#fff" : "#555",
                          transition: "color 0.15s",
                          letterSpacing: "0.01em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                          className="group-hover:!text-[rgba(255,255,255,0.65)]"
                        >
                          {label}
                        </span>
                      )}
                    </NavLink>
                  </div>
                </TooltipTrigger>
                {!isMobile && collapsed && (
                  <TooltipContent side="right" sideOffset={10}
                    style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 12, borderRadius: 8, padding: "5px 10px" }}>
                    {label}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 8px" }} />

        {(isMobile || !collapsed) && (
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#333", padding: "4px 8px", whiteSpace: "nowrap" }}>
            More
          </p>
        )}

        {/* Leaderboard */}
        <TooltipProvider delayDuration={(isMobile || !collapsed) ? 600 : 80}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => { setModalState(<Leaderboard />); if (isMobile) onMobileClose(); }}
                  style={{
                    display: "flex", alignItems: "center",
                    gap: (isMobile || !collapsed) ? 11 : 0,
                    padding: (isMobile || !collapsed) ? "9px 10px 9px 14px" : "9px 0",
                    justifyContent: (isMobile || !collapsed) ? "flex-start" : "center",
                    borderRadius: 9, width: "100%",
                    background: "transparent", border: "none", cursor: "pointer",
                    transition: "background 0.15s",
                    overflow: "hidden",
                  }}
                  className="group hover:!bg-[rgba(255,255,255,0.04)]"
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4, color: "#fff", transition: "opacity 0.15s", flexShrink: 0 }}
                    className="[&>svg]:w-[18px] [&>svg]:h-[18px] group-hover:!opacity-70">
                    <LeaderboardIcon />
                  </span>
                  {(isMobile || !collapsed) && (
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#555", letterSpacing: "0.01em", whiteSpace: "nowrap" }}
                      className="group-hover:!text-[rgba(255,255,255,0.65)]">
                      Leaderboard
                    </span>
                  )}
                </button>
              </div>
            </TooltipTrigger>
            {!isMobile && collapsed && (
              <TooltipContent side="right" sideOffset={10}
                style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 12, borderRadius: 8, padding: "5px 10px" }}>
                Leaderboard
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </nav>

      {/* ── Discord ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "10px 8px", flexShrink: 0 }}>
        <TooltipProvider delayDuration={(isMobile || !collapsed) ? 600 : 80}>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://discord.gg/MH7rp8jh7E"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center",
                  gap: (isMobile || !collapsed) ? 11 : 0,
                  padding: (isMobile || !collapsed) ? "9px 10px 9px 14px" : "9px 0",
                  justifyContent: (isMobile || !collapsed) ? "flex-start" : "center",
                  borderRadius: 9, textDecoration: "none",
                  transition: "background 0.15s",
                  opacity: 0.45,
                  overflow: "hidden",
                }}
                className="group hover:!bg-[rgba(88,101,242,0.12)] hover:!opacity-90"
              >
                <img src="/discord.png" alt="Discord" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} draggable={false} />
                {(isMobile || !collapsed) && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", letterSpacing: "0.01em", whiteSpace: "nowrap" }}>Discord</span>
                )}
              </a>
            </TooltipTrigger>
            {!isMobile && collapsed && (
              <TooltipContent side="right" sideOffset={10}
                style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 12, borderRadius: 8, padding: "5px 10px" }}>
                Discord
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex"
        id="sidenav"
        style={{
          width: W,
          flexShrink: 0,
          flexDirection: "column",
          background: "#080808",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          height: "100%",
          zIndex: 20,
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}
      >
        {navContent(false)}
      </aside>

      {/* ── Mobile left drawer ── */}
      <div className="lg:hidden">
        {/* Backdrop */}
        {mobileOpen && (
          <div
            onClick={onMobileClose}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.55)",
              zIndex: 40,
            }}
          />
        )}
        {/* Drawer */}
        <aside
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            height: "100%",
            width: 220,
            background: "#080808",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            zIndex: 50,
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {navContent(true)}
        </aside>
      </div>
    </>
  );
}
