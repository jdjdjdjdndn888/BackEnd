import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { io } from "socket.io-client";
import "./index.css";

import UserContext from "../utils/user.js";
import SocketContext from "../utils/socket.js";
import { ModalProvider, useModal } from "../utils/ModalContext.jsx";
import { NotificationsProvider } from "../utils/NotificationsContext.jsx";
import { api } from "../config.js";
import { getauth } from "../utils/getauth.js";

import { FaCommentDots, FaTimes, FaBullhorn } from "react-icons/fa";

import Header from "../components/header/header.jsx";
import Sidenav from "../components/sidenav/Sidenav.jsx";
import { Home } from "../components/Home/Home.jsx";
import Coinflip from "../components/coinflip/layout.jsx";
import JackpotPage from "../components/jackpot/layout.jsx";
import Account from "../components/account/account.jsx";
import LinkDiscord from "../components/discord/linker.jsx";
import Upgrader from "../components/upgrader/Upgrader.jsx";
import Chat from "../components/chat/Chat.jsx";
import Admin from "../components/admin/Admin.jsx";
import Trades from "../components/trades/Trades.jsx";
import DicePage from "../components/dice/layout.jsx";
import BlackjackPage from "../components/blackjack/layout.jsx";
import NormalBlackjack from "../components/normalblackjack/NormalBlackjack.jsx";
import NormalMines from "../components/normalmines/NormalMines.jsx";
import NormalWallet from "../components/normalwallet/NormalWallet.jsx";
import MinesPage from "../components/mines/layout.jsx";
import RpsPage      from "../components/rps/layout.jsx";
import SupportPage  from "../components/support/SupportPage.jsx";
import CasesPage    from "../components/cases/layout.jsx";
import Referral     from "../components/referral/Referral.jsx";

// Vercel's edge proxy cannot upgrade HTTP connections to WebSockets, so
// routing socket.io through the Vercel rewrite (`/socket.io/*`) always gets
// a 200 handshake response instead of a 101 upgrade, and the WebSocket
// connection fails. Connect straight to the backend host instead.
const BACKEND_URL =
  import.meta.env.VITE_SOCKET_URL || "https://api.gemtide.win";

const socket = io(BACKEND_URL, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  autoConnect: true,
  auth: { token: getauth() },
});

function ModalRenderer() {
  const { modalState } = useModal();
  return modalState || null;
}

function AnnouncementBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div
      style={{
        background:
          "linear-gradient(90deg, rgba(139,92,246,0.12) 0%, rgba(109,40,217,0.06) 50%, rgba(139,92,246,0.12) 100%)",
        borderBottom: "1px solid rgba(139,92,246,0.22)",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
      className="flex items-center gap-3 px-4 py-2"
    >
      {/* Scrolling shimmer */}
      <div className="announcement-shimmer" />

      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: "linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)",
          borderRadius: "0 2px 2px 0",
          flexShrink: 0,
        }}
      />

      {/* Icon bubble */}
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "rgba(139,92,246,0.18)",
          border: "1px solid rgba(139,92,246,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginLeft: 6,
        }}
      >
        <FaBullhorn size={11} style={{ color: "#a78bfa" }} />
      </div>

      {/* Badge + message */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#a78bfa",
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.28)",
            borderRadius: 4,
            padding: "2px 6px",
            flexShrink: 0,
            lineHeight: 1.6,
          }}
        >
          Announcement
        </span>
        <span
          style={{
            color: "#ddd6fe",
            fontSize: 12.5,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1,
          }}
        >
          {message}
        </span>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss announcement"
        className="announcement-dismiss"
        style={{ flexShrink: 0 }}
      >
        <FaTimes size={9} />
      </button>
    </div>
  );
}

function App() {
  const [userData, setUserData] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [announcement, setAnnouncement] = useState(null);

  const fetchMe = () => {
    const token = getauth();
    if (!token) return;
    fetch(`${api}/me`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) setUserData(data.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchMe();
  }, []);

  // When an admin resets all balances, force-refresh user data so the
  // displayed balance immediately drops to 0 for every connected client.
  useEffect(() => {
    socket.on("BALANCE_RESET", fetchMe);
    return () => socket.off("BALANCE_RESET", fetchMe);
  }, []);

  // Owner/admin announcement banner — shown at the top of every page until dismissed.
  useEffect(() => {
    const handler = ({ message }) => setAnnouncement(message);
    socket.on("ANNOUNCEMENT", handler);
    return () => socket.off("ANNOUNCEMENT", handler);
  }, []);

  // Re-authenticate when the logged-in user changes.
  // Use a "reauth" event so we never disconnect/reconnect — a full reconnect
  // was burning the old per-IP rate-limit slots and breaking live updates.
  const prevUserIdRef = useRef(null);
  useEffect(() => {
    if (!userData) return;
    if (userData.userid === prevUserIdRef.current) return;
    prevUserIdRef.current = userData.userid;
    const token = getauth();
    if (!token) return;
    socket.auth = { token };
    if (socket.connected) {
      socket.emit("reauth", { token });
    } else {
      socket.connect();
    }
  }, [userData]);

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      <SocketContext.Provider value={socket}>
        <NotificationsProvider>
          <ModalProvider>
            <BrowserRouter>
              <div className="flex h-screen bg-[#0f1420] overflow-hidden">
                <Sidenav mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
                <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                  <AnnouncementBanner message={announcement} onDismiss={() => setAnnouncement(null)} />
                  <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
                  <main className="flex flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto min-w-0">
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/coinflip" element={<Coinflip />} />
                        <Route path="/jackpot" element={<JackpotPage />} />
                        <Route path="/upgrader" element={<Upgrader />} />
                        <Route path="/profile" element={<Account />} />
                        <Route path="/discord/linked" element={<LinkDiscord />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/trades" element={<Trades />} />
                        <Route path="/dice" element={<DicePage />} />
                        <Route path="/blackjack" element={<BlackjackPage />} />
                        <Route path="/normal-blackjack" element={<NormalBlackjack />} />
                        <Route path="/normal-mines" element={<NormalMines />} />
                        <Route path="/normal-wallet" element={<NormalWallet />} />
                        <Route path="/mines" element={<MinesPage />} />
                        <Route path="/rps" element={<RpsPage />} />
                        <Route path="/support" element={<SupportPage />} />
                        <Route path="/cases" element={<CasesPage />} />
                        <Route path="/refferal/:code" element={<Referral />} />
                        <Route path="/referral/:code" element={<Referral />} />
                      </Routes>
                    </div>
                    <aside className="hidden lg:flex flex-col w-[17rem] shrink-0 border-l border-[#252839] bg-[#171925] overflow-hidden">
                      <Chat />
                    </aside>
                  </main>
                </div>
              </div>

              {/* Mobile-only chat toggle + drawer — chat sidebar is desktop-only above (lg:flex),
                  so mobile gets a small floating button instead, present on every page. */}
              <button
                onClick={() => setMobileChatOpen((v) => !v)}
                aria-label={mobileChatOpen ? "Close chat" : "Open chat"}
                className="lg:hidden fixed bottom-4 right-4 z-[60] w-11 h-11 rounded-full bg-[#171925] border border-[#252839] shadow-lg shadow-black/40 flex items-center justify-center text-[#ccc] active:scale-95 transition-transform"
              >
                {mobileChatOpen ? <FaTimes size={16} /> : <FaCommentDots size={18} />}
              </button>

              {mobileChatOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
                  <div
                    className="absolute inset-0 bg-black/60"
                    onClick={() => setMobileChatOpen(false)}
                  />
                  <div className="relative h-[70vh] max-h-[80vh] bg-[#171925] border-t border-[#252839] rounded-t-2xl overflow-hidden flex flex-col">
                    <Chat />
                  </div>
                </div>
              )}

              <ModalRenderer />
            </BrowserRouter>
            <Toaster position="top-right" />
          </ModalProvider>
        </NotificationsProvider>
      </SocketContext.Provider>
    </UserContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
