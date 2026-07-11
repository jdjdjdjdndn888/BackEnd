import { useNavigate, useLocation } from "react-router-dom";
import { useModal } from "../../utils/ModalContext.jsx";
import mobilechatstyle from "../chat/mobilechat.module.css";

const GAMES = [
  { label: "Home",      href: "/",          img: "/nav-home.png"       },
  { label: "Coinflip",  href: "/coinflip",  img: "/nav-coinflip.png"   },
  { label: "Dice",      href: "/dice",      img: "/nav-dice.png"       },
  { label: "Jackpot",   href: "/jackpot",   img: "/jackpot-icon.png"   },
  { label: "Blackjack", href: "/blackjack", img: "/nav-blackjack.png"  },
  { label: "Mines",     href: "/mines",     img: "/mines-gem.png"      },
  { label: "Upgrader",  href: "/upgrader",  img: "/upgrader-icon.png"  },
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
