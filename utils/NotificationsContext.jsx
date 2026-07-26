import { createContext, useContext, useState, useEffect, useCallback } from "react";
import SocketContext from "./socket.js";
import UserContext from "./user.js";
import { api } from "../config.js";
import { getauth } from "./getauth.js";

const NotificationsContext = createContext({ notifications: [], unreadCount: 0, markRead: () => {}, dismiss: () => {}, respondTrade: async () => {} });

export function NotificationsProvider({ children }) {
  const socket = useContext(SocketContext);
  const { userData } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handle = (data) => {
      if (data.target && data.target !== "all" && data.target !== userData?.userid) return;
      setNotifications((prev) => [
        { ...data, id: `${Date.now()}-${Math.random()}`, time: new Date().toLocaleTimeString(), unread: true },
        ...prev,
      ].slice(0, 50));
    };
    socket.on("NOTIFICATION", handle);
    return () => socket.off("NOTIFICATION", handle);
  }, [socket, userData]);

  const markRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const respondTrade = useCallback(async (requestid, action, notifId) => {
    try {
      const res = await fetch(`${api}/trades/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ requestid, action }),
      });
      const data = await res.json();
      if (res.ok) {
        dismiss(notifId);
        return { ok: true, message: data.message };
      }
      return { ok: false, message: data.message };
    } catch {
      return { ok: false, message: "Something went wrong" };
    }
  }, [dismiss]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, dismiss, respondTrade }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}

export default NotificationsContext;
