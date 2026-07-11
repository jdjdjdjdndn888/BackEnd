import { useState, useEffect, useContext, useRef } from "react";
import toast from "react-hot-toast";
import SocketContext from "../../utils/socket";
import { getauth } from "../../utils/getauth";
import { api } from "../../config.js";
import Giveaways from "./giveaway.jsx";
import { getrole, getDisplayLevel } from "../../utils/getrole";
import "./picker.css";
import { Message } from "./Message";
import { ChatInput } from "./ChatInput";
import { memo } from "react";
import { RulesIcon } from "@/assets/icons/RulesIcon";
import UserContext from "../../utils/user.js";
import NotifyModal from "../notifications/NotifyModal.jsx";
import Tip from "../tip/tip.jsx";
import { useModal } from "../../utils/ModalContext.jsx";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [canSend, setCanSend] = useState(true);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const socket = useContext(SocketContext);
  const { userData } = useContext(UserContext);
  const { setModalState } = useModal();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`${api}/chat/latest`, { method: "POST" });
        if (response.ok) {
          const data = await response.json();
          setMessages(
            data.messages.map((msg) => {
              const displayLevel = getDisplayLevel(msg.rank, msg.level);
              const { name, color, image } = getrole(msg.rank, displayLevel);
              return { ...msg, level: displayLevel, rankImage: image, roleName: name, usernameColor: color };
            }),
          );
        }
      } catch {}
    };
    fetchMessages();

    const handleSocketMessage = (msg) => {
      const displayLevel = getDisplayLevel(msg.rank, msg.level);
      const { name, color, image } = getrole(msg.rank, displayLevel);
      setMessages((prev) => [...prev, { ...msg, level: displayLevel, rankImage: image, roleName: name, usernameColor: color }].slice(-30));
    };

    const handlePurge = () => setMessages([]);

    socket.on("MESSAGE", handleSocketMessage);
    socket.on("ONLINE_UPDATE", setOnlineCount);
    socket.on("CHAT_PURGED", handlePurge);
    return () => {
      socket.off("MESSAGE", handleSocketMessage);
      socket.off("ONLINE_UPDATE");
      socket.off("CHAT_PURGED", handlePurge);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  const isOwner = userData?.rank === "OWNER" || userData?.rank === "ADMIN";

  const sendMessage = async () => {
    if (!canSend || !message.trim()) return toast.error("Enter a message!");

    if (message.trim().toLowerCase() === "!notify") {
      if (!isOwner) return toast.error("You don't have permission for that.");
      setMessage("");
      setShowNotifyModal(true);
      return;
    }

    if (message.trim().toLowerCase().startsWith("/tip")) {
      if (!userData) return toast.error("You must be logged in to tip!");
      setMessage("");
      setModalState(<Tip onClose={() => setModalState(null)} />);
      return;
    }

    setCanSend(false);
    setMessage("");
    try {
      const response = await fetch(`${api}/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ msgcontent: message }),
      });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.message);
      }
    } catch {
      toast.error("Could not send your message!");
    }
    setTimeout(() => setCanSend(true), 2000);
  };

  return (
    <div style={{
      boxSizing: "border-box", display: "flex", height: "100%", minWidth: 0,
      flexGrow: 1, flexDirection: "column",
      background: "#0c0c0c",
      borderLeft: "1px solid rgba(255,255,255,0.07)",
    }}
      className="lg:py-0 py-4"
    >
      {showNotifyModal && <NotifyModal onClose={() => setShowNotifyModal(false)} />}

      <Giveaways />
      <Messages messages={messages} messagesEndRef={messagesEndRef} />

      {/* Input area */}
      <div style={{ marginTop: "auto", padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <ChatInput canSend={canSend} message={message} sendMessage={sendMessage} setMessage={setMessage} />

        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "block", width: 8, height: 8, borderRadius: "50%", background: "#3AFF4E", boxShadow: "0 0 5px #3AFF4E", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{onlineCount}</span>

          {isOwner && (
            <button
              onClick={() => setShowNotifyModal(true)}
              style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.08)", color: "#fff" }}
            >
              📣
            </button>
          )}

          <button
            style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "#333", transition: "color 0.15s", display: "flex" }}
            className="hover:!text-[#666] [&>svg]:w-4"
            aria-label="Chat Rules"
          >
            <RulesIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

const Messages = memo(({ messages, messagesEndRef }) => (
  <div style={{ flexGrow: 1, overflowY: "auto", scrollBehavior: "auto" }}>
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 6, padding: "10px 14px" }}>
      {messages.map((msg, i) => <Message key={i} msg={msg} />)}
      <span style={{ position: "absolute", bottom: 0 }} ref={messagesEndRef} />
    </div>
  </div>
));
