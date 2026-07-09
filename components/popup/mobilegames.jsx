import { useNavigate, useLocation } from "react-router-dom";
import { useModal } from "../../utils/ModalContext.jsx";
import mobilechatstyle from "../chat/mobilechat.module.css";

const GAMES = [
  { label: "Home",      href: "/",          icon: () => <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> },
  { label: "Coinflip",  href: "/coinflip",  img: "/coinflip-icon.png"  },
  { label: "Dice",      href: "/dice",      img: "/dice-icon.png"      },
  { label: "Jackpot",   href: "/jackpot",   img: "/jackpot-icon.png"   },
  { label: "Blackjack", href: "/blackjack", img: "/blackjack-icon.png" },
  { label: "Mines",     href: "/mines",     img: "/mines-gem.png"      },
  { label: "Upgrader",  href: "/upgrader",  img: "/upgrader-icon.png"  },
  { label: "Trades",    href: "/trades",    icon: () => <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zm-4 9a1 1 0 11-2 0 1 1 0 012 0zm0-2a3 3 0 100 6 3 3 0 000-6zm10 3a1 1 0 11-2 0 1 1 0 012 0zm0-2a3 3 0 100 6 3 3 0 000-6z" /></svg> },
];

export default function MobileGames() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setModalState } = useModal();

  const go = (href) => {
    navigate(href);
    setModalState(null);
  };

  return (
    <div className={mobilechatstyle.chat} style={{ display: "flex", flexDirection: "column", padding: "12px", gap: 6, overflowY: "auto" }}>
      <p style={{ color: "#444", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", margin: "4px 4px 6px" }}>
        Games
      </p>

      {GAMES.map(({ label, href, icon: Icon, img }) => {
        const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
        return (
          <button
            key={href}
            onClick={() => go(href)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: isActive ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.05)",
              background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              transition: "all 0.15s",
            }}
          >
            {/* Icon */}
            <span style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
              color: isActive ? "#fff" : "#555",
            }}>
              {img
                ? <img src={img} alt={label} style={{ width: 22, height: 22, objectFit: "contain" }} />
                : <Icon />
              }
            </span>

            {/* Label */}
            <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? "#fff" : "#666" }}>
              {label}
            </span>

            {/* Active dot */}
            {isActive && (
              <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
