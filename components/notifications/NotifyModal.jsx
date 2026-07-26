import { useState } from "react";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import toast from "react-hot-toast";

const TYPES = [
  { value: "info",    label: "📣 Announcement", color: "#8B5CF6" },
  { value: "success", label: "✅ Good News",    color: "#10B981" },
  { value: "warning", label: "⚠️ Warning",       color: "#F59E0B" },
  { value: "alert",   label: "🚨 Alert",          color: "#EF4444" },
];

export default function NotifyModal({ onClose }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !message.trim()) return toast.error("Fill in all fields.");
    setSending(true);
    try {
      const res = await fetch(`${api}/admin/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), type }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Notification sent to all users!");
        onClose();
      } else {
        toast.error(d.message || "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  const selectedType = TYPES.find(t => t.value === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-[#1e2035] bg-[#0d0f1a] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button className="absolute right-4 top-4 text-gray-400 hover:text-white bg-transparent border-none text-xl cursor-pointer" onClick={onClose}>×</button>

        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">📣</span>
          <div>
            <h2 className="text-base font-bold text-white">Broadcast Notification</h2>
            <p className="text-xs text-[#6B7280]">Sends to all online users instantly</p>
          </div>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold border cursor-pointer transition-all bg-transparent ${type === t.value ? "border-[#8B5CF6] text-white bg-[#8B5CF615]" : "border-[#1e2035] text-[#6B7280] hover:border-[#8B5CF660]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Title (e.g. Site Maintenance)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
          className="mb-3 w-full rounded-xl border border-[#1e2035] bg-[#13151f] px-4 py-2.5 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]"
        />
        <textarea
          placeholder="Message body..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={300}
          rows={3}
          className="mb-4 w-full rounded-xl border border-[#1e2035] bg-[#13151f] px-4 py-2.5 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6] resize-none"
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#1e2035] bg-transparent py-2.5 text-sm text-[#6B7280] hover:text-white cursor-pointer transition-colors">Cancel</button>
          <button
            onClick={send}
            disabled={sending || !title.trim() || !message.trim()}
            className="flex-1 rounded-xl border-none py-2.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}
          >
            {sending ? "Sending..." : "📣 Broadcast"}
          </button>
        </div>
      </div>
    </div>
  );
}
