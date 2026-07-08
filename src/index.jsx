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

import Header from "../components/header/header.jsx";
import Footer from "../components/footer/footer.jsx";
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
import MobileChat from "../components/chat/mobilechat.jsx";

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || "";

const socket = io(BACKEND_URL, {
  path: "/socket.io",
  transports: ["websocket"],
  autoConnect: true,
  auth: { token: getauth() },
});

function ModalRenderer() {
  const { modalState } = useModal();
  return modalState || null;
}

function App() {
  const [userData, setUserData] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

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

  // Re-authenticate the socket only when the logged-in user actually changes
  // (not on every UPDATE_ME, which would cause an infinite reconnect loop)
  const prevUserIdRef = useRef(null);
  useEffect(() => {
    if (!userData) return;
    if (userData.userid === prevUserIdRef.current) return;
    prevUserIdRef.current = userData.userid;
    const token = getauth();
    if (!token) return;
    socket.auth = { token };
    socket.disconnect();
    socket.connect();
  }, [userData]);

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      <SocketContext.Provider value={socket}>
        <NotificationsProvider>
          <ModalProvider>
            <BrowserRouter>
              <div className="flex h-screen bg-[#0f1420] overflow-hidden">
                <Sidenav />
                <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                  <Header />
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
                      </Routes>
                    </div>
                    <aside className="hidden lg:flex flex-col w-[17rem] shrink-0 border-l border-[#252839] bg-[#171925] overflow-hidden">
                      <Chat />
                    </aside>
                  </main>
                  <Footer />
                  {/* Mobile floating chat button */}
                  <button
                    onClick={() => setShowMobileChat((v) => !v)}
                    className="lg:hidden fixed bottom-5 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full border-none cursor-pointer shadow-lg transition-transform hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}
                    aria-label="Toggle Chat"
                  >
                    {showMobileChat ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    )}
                  </button>
                  {showMobileChat && (
                    <div className="lg:hidden">
                      <MobileChat />
                    </div>
                  )}
                </div>
              </div>
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
