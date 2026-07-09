import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MobileChat from "../chat/mobilechat.jsx";
import MobileHome from "../popup/mobilehome.jsx";
import MobileGames from "../popup/mobilegames.jsx";
import { useModal } from "../../utils/ModalContext.jsx";

export default function Footer() {
  const [activeTab, setActiveTab] = useState("game");
  const [indicatorPosition, setIndicatorPosition] = useState(null);
  const tabRefs = {
    home: useRef(null),
    game: useRef(null),
    chat: useRef(null),
  };

  const { setModalState, modalState } = useModal();
  const location = useLocation();
  const navigate = useNavigate();

  const updateIndicatorPosition = (tabName) => {
    if (!tabName || !tabRefs[tabName]?.current) return;
    const tabElement = tabRefs[tabName].current;
    const tabRect = tabElement.getBoundingClientRect();
    const parentRect = tabElement.parentElement.getBoundingClientRect();
    setIndicatorPosition({
      left: (tabRect.left - parentRect.left) + (tabRect.width * 0.25),
      width: tabRect.width * 0.5,
    });
  };

  const handleTabClick = (tab) => {
    if (activeTab === tab) {
      setActiveTab(null);
      setModalState(null);
      return;
    }
    setActiveTab(tab);
    updateIndicatorPosition(tab);
    switch (tab) {
      case "home": setModalState(<MobileHome navigate={navigate} location={location} />); break;
      case "game": setModalState(<MobileGames />); break;
      case "chat": setModalState(<MobileChat />); break;
    }
  };

  useEffect(() => {
    if (!modalState) {
      setActiveTab(null);
      setIndicatorPosition(null);
    } else {
      const tabTypeMap = { MobileHome, MobileChat, MobileGames };
      const tabKeyMap = { MobileHome: "home", MobileChat: "chat", MobileGames: "game" };
      const key = Object.keys(tabTypeMap).find((k) => modalState.type === tabTypeMap[k]);
      if (key) {
        const newTab = tabKeyMap[key];
        setActiveTab(newTab);
        updateIndicatorPosition(newTab);
      }
    }
  }, [modalState]);

  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveTab(null);
      setIndicatorPosition(null);
    } else if (activeTab === "game") {
      updateIndicatorPosition("game");
    }
  }, [location.pathname]);

  useEffect(() => {
    if (activeTab) updateIndicatorPosition(activeTab);
    const handleResize = () => { if (activeTab) updateIndicatorPosition(activeTab); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab]);

  const iconColor = (tab) => activeTab === tab ? "#fff" : "#555";

  return (
    <div
      className="lg:hidden"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "var(--footer-height)",
        background: "#0c0c0c",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "stretch", width: "80%", height: "100%", padding: "0 32px", position: "relative" }}>
        {/* Home */}
        <button ref={tabRefs.home} onClick={() => handleTabClick("home")}
          style={{ background: "transparent", border: "none", cursor: "pointer", flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" height="24" width="24" style={{ color: iconColor("home"), transition: "color 0.2s" }}>
            <path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z" />
          </svg>
        </button>

        {/* Game */}
        <button ref={tabRefs.game} onClick={() => handleTabClick("game")}
          style={{ background: "transparent", border: "none", cursor: "pointer", flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" height="24" width="24"
            style={{ color: activeTab === "game" && location.pathname === "/" ? "#fff" : "#555", transition: "color 0.2s" }}>
            <path d="M192 64C86 64 0 150 0 256S86 448 192 448H448c106 0 192-86 192-192s-86-192-192-192H192zM496 168a40 40 0 1 1 0 80 40 40 0 1 1 0-80zM392 304a40 40 0 1 1 80 0 40 40 0 1 1 -80 0zM168 200c0-13.3 10.7-24 24-24s24 10.7 24 24v32h32c13.3 0 24 10.7 24 24s-10.7 24-24 24H216v32c0 13.3-10.7 24-24 24s-24-10.7-24-24V280H136c-13.3 0-24-10.7-24-24s10.7-24 24-24h32V200z" />
          </svg>
        </button>

        {/* Chat */}
        <button ref={tabRefs.chat} onClick={() => handleTabClick("chat")}
          style={{ background: "transparent", border: "none", cursor: "pointer", flexGrow: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="24" width="24" style={{ color: iconColor("chat"), transition: "color 0.2s" }}>
            <path d="M64 0C28.7 0 0 28.7 0 64V352c0 35.3 28.7 64 64 64h96v80c0 6.1 3.4 11.6 8.8 14.3s11.9 2.1 16.8-1.5L309.3 416H448c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H64z" />
          </svg>
        </button>

        {/* Active indicator */}
        {indicatorPosition && (
          <div
            style={{
              position: "absolute", bottom: 0, height: 2,
              background: "#fff",
              borderRadius: "2px 2px 0 0",
              transition: "left 0.25s ease, width 0.25s ease",
              left: indicatorPosition.left + "px",
              width: indicatorPosition.width + "px",
            }}
          />
        )}
      </div>
    </div>
  );
}
