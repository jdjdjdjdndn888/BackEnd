import { useState } from "react";
import { useNotifications } from "../../utils/NotificationsContext.jsx";
import toast from "react-hot-toast";

export default function NotificationsPanel({ onClose }) {
  const { notifications, markRead, dismiss, respondTrade } = useNotifications();

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute right-4 top-[4.5rem] w-80 rounded-2xl border border-[#1e2035] bg-[#0d0f1a] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2035]">
          <h3 className="text-sm font-bold text-white">Notifications</h3>
          {notifications.length > 0 && (
            <button onClick={markRead} className="text-xs text-[#8B5CF6] hover:underline bg-transparent border-none cursor-pointer">
              Clear all
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[#6B7280]">
              <span className="text-3xl mb-2">🔔</span>
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotifItem key={n.id} n={n} dismiss={dismiss} respondTrade={respondTrade} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NotifItem({ n, dismiss, respondTrade }) {
  const [loading, setLoading] = useState(null);

  const handleRespond = async (action) => {
    setLoading(action);
    const result = await respondTrade(n.requestId, action, n.id);
    setLoading(null);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.message || "Something went wrong");
    }
  };

  return (
    <div className={`flex gap-3 px-4 py-3 border-b border-[#1e2035] last:border-0 ${n.unread ? "bg-[#8B5CF615]" : ""}`}>
      <span className="flex-shrink-0 mt-0.5 flex items-center justify-center w-5 h-5">{typeIcon(n.type)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-semibold text-white truncate">{n.title}</p>
          <button
            onClick={() => dismiss(n.id)}
            className="text-[#42496B] hover:text-[#6B7280] bg-transparent border-none cursor-pointer text-xs flex-shrink-0 leading-none mt-0.5"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{n.message}</p>
        {n.type === "trade_request" && n.requestId && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => handleRespond("accept")}
              disabled={!!loading}
              className="flex-1 py-1 rounded-md text-xs font-semibold border-none cursor-pointer text-white transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
            >
              {loading === "accept" ? "..." : "✅ Accept"}
            </button>
            <button
              onClick={() => handleRespond("decline")}
              disabled={!!loading}
              className="flex-1 py-1 rounded-md text-xs font-semibold border-none cursor-pointer text-white transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}
            >
              {loading === "decline" ? "..." : "❌ Decline"}
            </button>
          </div>
        )}
        <p className="text-[10px] text-[#42496B] mt-1">{n.time}</p>
      </div>
    </div>
  );
}

const TICKET_ICON_SRC = {
  ticket_escalated: "/ticket-icons/owner-alert.png",
  ticket_reply:      "/ticket-icon.png",
  ticket_closed:     "/ticket-icons/ticket-closed.png",
};

function typeIcon(type) {
  if (TICKET_ICON_SRC[type]) {
    return <img src={TICKET_ICON_SRC[type]} alt="" className="w-5 h-5 object-contain" />;
  }
  switch (type) {
    case "success":       return <span className="text-xl">✅</span>;
    case "warning":       return <span className="text-xl">⚠️</span>;
    case "alert":         return <span className="text-xl">🚨</span>;
    case "trade_request": return <span className="text-xl">🔄</span>;
    default:              return <span className="text-xl">📣</span>;
  }
}
