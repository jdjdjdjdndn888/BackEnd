import { useNavigate, useLocation } from "react-router-dom";
import { useModal } from "../../utils/ModalContext.jsx";
import { Coins, Dices, TrendingUp, ShoppingBag, Home } from "lucide-react";
import mobilechatstyle from "../chat/mobilechat.module.css";

const GAMES = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Coinflip", icon: Coins, href: "/coinflip" },
  { label: "Jackpot", icon: Dices, href: "/jackpot" },
  { label: "Upgrader", icon: TrendingUp, href: "/upgrader" },
  { label: "Trades", icon: ShoppingBag, href: "/trades" },
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
    <div className={mobilechatstyle.chat} style={{ display: "flex", flexDirection: "column", padding: "1rem", gap: "0.75rem", overflowY: "auto" }}>
      <p style={{ color: "#6B7280", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
        Navigate
      </p>
      {GAMES.map(({ label, icon: Icon, href }) => {
        const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
        return (
          <button
            key={href}
            onClick={() => go(href)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              padding: "0.875rem 1rem",
              borderRadius: "12px",
              border: isActive ? "1px solid #8B5CF640" : "1px solid #1e2035",
              background: isActive ? "#8B5CF615" : "#131623",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              transition: "all 0.15s",
            }}
          >
            <span style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: isActive ? "#8B5CF620" : "#0d0f1a",
              color: isActive ? "#8B5CF6" : "#42496B",
              flexShrink: 0,
            }}>
              <Icon size={18} />
            </span>
            <span style={{
              fontSize: "15px",
              fontWeight: 600,
              color: isActive ? "#fff" : "#8B93B8",
            }}>
              {label}
            </span>
            {isActive && (
              <span style={{
                marginLeft: "auto",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#8B5CF6",
                flexShrink: 0,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
