import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MobileChat from "../chat/mobilechat.jsx";
import MobileHome from "../popup/mobilehome.jsx";
import MobileGames from "../popup/mobilegames.jsx";
import { useModal } from "../../utils/ModalContext.jsx";

const TABS = [
  {
    key: "home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
  },
  {
    key: "game",
    label: "Games",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
      </svg>
    ),
  },
  {
    key: "chat",
    label: "Chat",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export default function Footer() {
  const [activeTab, setActiveTab] = useState(null);
  const { setModalState, modalState } = useModal();
  const location = useLocation();
  const navigate = useNavigate();

  const handleTabClick = (tab) => {
    if (activeTab === tab) {
      setActiveTab(null);
      setModalState(null);
      return;
    }
    setActiveTab(tab);
    if (tab === "home")  setModalState(<MobileHome navigate={navigate} location={location} />);
    if (tab === "game")  setModalState(<MobileGames />);
    if (tab === "chat")  setModalState(<MobileChat />);
  };

  // Sync when modal is closed externally
  useEffect(() => {
    if (!modalState) setActiveTab(null);
  }, [modalState]);

  // Close game modal on route changes
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveTab(null);
      setModalState(null);
    }
  }, [location.pathname]);

  return (
    <div
      className="lg:hidden"
      style={{
        height: "var(--footer-height)",
        background: "#080808",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Inner pill container */}
      <div style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "4px",
        gap: 2,
        position: "relative",
      }}>
        {TABS.map(({ key, label, icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => handleTabClick(key)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: isActive ? 7 : 0,
                padding: isActive ? "9px 18px" : "9px 16px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background: isActive ? "#fff" : "transparent",
                color: isActive ? "#000" : "rgba(255,255,255,0.3)",
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                width: isActive ? "auto" : 46,
                justifyContent: "center",
              }}
              className="hover:!text-white"
            >
              <span style={{
                display: "flex",
                alignItems: "center",
                transition: "transform 0.18s ease",
                transform: isActive ? "scale(0.9)" : "scale(1)",
                flexShrink: 0,
              }}>
                {icon}
              </span>
              {isActive && (
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.01em" }}>
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
