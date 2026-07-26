import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import UserContext from "../../utils/user.js";
import SocketContext from "../../utils/socket.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import { useNavigate } from "react-router-dom";
import { useSeo } from "../../utils/useSeo.js";

const CATEGORY_LABELS = {
  general: "General",
  payment: "Payment",
  bug:     "Bug Report",
  account: "Account",
  other:   "Other",
};
const CATEGORY_COLORS = {
  general: "#8b5cf6",
  payment: "#f59e0b",
  bug:     "#ef4444",
  account: "#3b82f6",
  other:   "#6b7280",
};
const STAFF_RANK_COLORS = {
  OWNER:         "#f97316",
  CO_OWNER:      "#f97316",
  ADMIN:         "#ef4444",
  TRUSTED_STAFF: "#8b5cf6",
  MODERATOR:     "#22c55e",
  TRIAL_STAFF:   "#3b82f6",
  MIDDLEMAN:     "#eab308",
  USER:          "#6b7280",
  SYSTEM:        "#6b7280",
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

// ── Create Ticket Modal ───────────────────────────────────────────────────────
function CreateTicketModal({ onClose, onCreated }) {
  const [subject,  setSubject]  = useState("");
  const [category, setCategory] = useState("general");
  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return toast.error("Fill in all fields");
    setLoading(true);
    try {
      const res = await fetch(`${api}/support/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ subject, category, message }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to create ticket"); return; }
      toast.success("Ticket created!");
      onCreated(data.ticket);
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}>
      <div className="relative w-full max-w-lg bg-[#131520] border border-[#252839] rounded-2xl shadow-2xl p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <img src="/ticket-icon.png" alt="" className="w-6 h-6 object-contain" /> Open Support Ticket
          </h2>
          <button onClick={onClose}
            className="text-[#68749C] hover:text-white bg-transparent border-none text-xl cursor-pointer">✕</button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-[#68749C] uppercase tracking-wider mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORY_LABELS).map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => setCategory(val)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                  style={{
                    borderColor: category === val ? CATEGORY_COLORS[val] : "#252839",
                    background:  category === val ? `${CATEGORY_COLORS[val]}22` : "transparent",
                    color:       category === val ? CATEGORY_COLORS[val] : "#68749C",
                  }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#68749C] uppercase tracking-wider mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief description of your issue..."
              maxLength={120}
              className="w-full bg-[#1a1d2b] border border-[#252839] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#42496B] outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="block text-xs text-[#68749C] uppercase tracking-wider mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={5}
              maxLength={2000}
              className="w-full bg-[#1a1d2b] border border-[#252839] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#42496B] outline-none focus:border-white/20 resize-none"
            />
            <p className="text-[10px] text-[#42496B] mt-1 text-right">{message.length}/2000</p>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors disabled:opacity-50 cursor-pointer">
            {loading ? "Creating…" : "Open Ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Ticket List Item ──────────────────────────────────────────────────────────
function TicketItem({ ticket, active, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-4 py-3 border-b border-[#1a1d2b] transition-colors cursor-pointer"
      style={{ background: active ? "rgba(255,255,255,0.05)" : "transparent" }}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-white leading-tight truncate flex-1">{ticket.subject}</p>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
          style={{
            background: ticket.status === "open" ? "rgba(34,197,94,0.15)" : "rgba(107,114,128,0.15)",
            color:      ticket.status === "open" ? "#22c55e"               : "#6b7280",
          }}>
          {ticket.status === "open" ? "Open" : "Closed"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: `${CATEGORY_COLORS[ticket.category]}22`, color: CATEGORY_COLORS[ticket.category] }}>
          {CATEGORY_LABELS[ticket.category]}
        </span>
        <span className="text-[10px] text-[#42496B] truncate">{ticket.username}</span>
        <span className="text-[10px] text-[#42496B] ml-auto shrink-0">{timeAgo(ticket.createdAt)}</span>
        {ticket.ownerPinged && (
          <img src="/ticket-icons/owner-alert.png" alt="Owner pinged" title="Owner pinged" className="w-3 h-3 object-contain shrink-0" />
        )}
      </div>
    </button>
  );
}

// ── Ticket Chat View ──────────────────────────────────────────────────────────
function TicketView({ ticketId, currentUser, onClose, onClosed }) {
  const socket = useContext(SocketContext);
  const [ticket,   setTicket]   = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStaff,  setIsStaff]  = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [closing,  setClosing]  = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/support/tickets/${ticketId}`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTicket(data.ticket);
        setMessages(data.messages);
        setIsStaff(data.isStaff);
        setCanClose(data.canClose);
      } else {
        toast.error(data.message || "Failed to load ticket");
      }
    } catch { toast.error("Failed to load ticket"); }
    finally { setLoading(false); }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  // Real-time messages
  useEffect(() => {
    const handler = (msg) => {
      setMessages(prev => [...prev, msg]);
    };
    socket.on(`TICKET_MSG_${ticketId}`, handler);
    return () => socket.off(`TICKET_MSG_${ticketId}`, handler);
  }, [socket, ticketId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update ticket status in real-time
  useEffect(() => {
    const handler = ({ type, ticketId: tid, ticket: updated }) => {
      if (tid !== ticketId) return;
      if (type === "closed") { setTicket(updated); onClosed?.(tid); }
    };
    socket.on("TICKET_UPDATE", handler);
    return () => socket.off("TICKET_UPDATE", handler);
  }, [socket, ticketId]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${api}/support/tickets/${ticketId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ message: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to send message"); return; }
      setInput("");
      if (input.trim().toLowerCase() === "/getowner") {
        toast.success("Owner has been notified!");
      }
    } catch { toast.error("Failed to send message"); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const close = async () => {
    if (!canClose || closing) return;
    setClosing(true);
    try {
      const res = await fetch(`${api}/support/tickets/${ticketId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to close ticket"); return; }
      toast.success("Ticket closed");
    } catch { toast.error("Failed to close ticket"); }
    finally { setClosing(false); }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[#42496B] text-sm">Loading ticket…</div>
    </div>
  );

  if (!ticket) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[#42496B] text-sm">Ticket not found.</div>
    </div>
  );

  const isClosed = ticket.status === "closed";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-3.5 border-b border-[#252839] shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-bold text-sm truncate">{ticket.subject}</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                background: isClosed ? "rgba(107,114,128,0.15)" : "rgba(34,197,94,0.15)",
                color:      isClosed ? "#6b7280"                : "#22c55e",
              }}>
              {isClosed ? "Closed" : "Open"}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${CATEGORY_COLORS[ticket.category]}22`, color: CATEGORY_COLORS[ticket.category] }}>
              {CATEGORY_LABELS[ticket.category]}
            </span>
          </div>
          <p className="text-[11px] text-[#42496B] mt-0.5">
            Opened by <span className="text-[#68749C]">{ticket.username}</span>
            {isClosed && ticket.closedBy && <> · Closed by <span className="text-[#68749C]">{ticket.closedBy}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {canClose && !isClosed && (
            <button onClick={close} disabled={closing}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-colors bg-transparent cursor-pointer disabled:opacity-40">
              {closing ? "Closing…" : "Close Ticket"}
            </button>
          )}
          <button onClick={onClose}
            className="text-[#68749C] hover:text-white bg-transparent border-none text-lg cursor-pointer leading-none">✕</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const isMe = msg.userId === currentUser?.userid;
          const isSystem = msg.isSystem;

          if (isSystem) {
            const sysIcon = /escalated/i.test(msg.message)
              ? "/ticket-icons/owner-alert.png"
              : /closed/i.test(msg.message)
              ? "/ticket-icons/ticket-closed.png"
              : null;
            return (
              <div key={msg._id} className="flex justify-center">
                <span className="flex items-center gap-1.5 text-[11px] text-[#42496B] bg-[#1a1d2b] px-3 py-1.5 rounded-full border border-[#252839]">
                  {sysIcon && <img src={sysIcon} alt="" className="w-3.5 h-3.5 object-contain" />}
                  {msg.message}
                </span>
              </div>
            );
          }

          return (
            <div key={msg._id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
              {msg.thumbnail
                ? <img src={msg.thumbnail} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                : <div className="w-8 h-8 rounded-full bg-[#252839] flex items-center justify-center text-xs text-[#68749C] shrink-0 mt-0.5">
                    {msg.username?.[0]?.toUpperCase() || "?"}
                  </div>
              }
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                <div className={`flex items-center gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                  <span className="text-xs font-semibold" style={{ color: STAFF_RANK_COLORS[msg.rank] || "#fff" }}>
                    {msg.username}
                  </span>
                  {msg.rank && msg.rank !== "USER" && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                      style={{ background: `${STAFF_RANK_COLORS[msg.rank]}22`, color: STAFF_RANK_COLORS[msg.rank] }}>
                      {msg.rank.replace(/_/g, " ")}
                    </span>
                  )}
                  <span className="text-[9px] text-[#42496B]">{timeAgo(msg.createdAt)}</span>
                </div>
                <div className="px-3 py-2 rounded-xl text-sm text-white leading-relaxed break-words"
                  style={{
                    background: isMe ? "rgba(139,92,246,0.2)" : "#1a1d2b",
                    border: `1px solid ${isMe ? "rgba(139,92,246,0.3)" : "#252839"}`,
                    borderRadius: isMe ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                  }}>
                  {msg.message}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isClosed ? (
        <div className="px-4 py-3 border-t border-[#252839] shrink-0">
          {isStaff && (
            <p className="text-[10px] text-[#42496B] mb-1.5">
              Tip: type <code className="bg-[#1a1d2b] px-1 rounded">/getowner</code> to escalate to the owner
            </p>
          )}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              rows={2}
              maxLength={2000}
              className="flex-1 bg-[#1a1d2b] border border-[#252839] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#42496B] outline-none focus:border-white/20 resize-none"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="px-4 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors disabled:opacity-40 cursor-pointer self-end py-2.5">
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-[#252839] shrink-0 text-center">
          <p className="text-sm text-[#42496B]">This ticket is closed.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Support Page ─────────────────────────────────────────────────────────
export default function SupportPage() {
  useSeo({
    title: "Support | GemTide Pet Sim 99 Help Center",
    description:
      "Get help with deposits, withdrawals, and games on GemTide, the Pet Simulator 99 betting site. Open a ticket and our team will assist you.",
    path: "/support",
  });
  const { userData } = useContext(UserContext);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  const [tickets,       setTickets]       = useState([]);
  const [isStaff,       setIsStaff]       = useState(false);
  const [activeId,      setActiveId]      = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [filter,        setFilter]        = useState("open");
  const [loading,       setLoading]       = useState(true);

  const loadTickets = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    try {
      const res = await fetch(`${api}/support/tickets?status=${filter}`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const data = await res.json();
      if (res.ok) { setTickets(data.tickets); setIsStaff(data.isStaff); }
    } catch {}
    finally { setLoading(false); }
  }, [userData, filter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Real-time ticket list updates
  useEffect(() => {
    const handler = ({ type, ticket, ticketId }) => {
      if (type === "new") {
        setTickets(prev => {
          if (filter === "open") return [ticket, ...prev];
          return prev;
        });
      }
      if (type === "closed") {
        setTickets(prev => prev.map(t =>
          t._id === ticketId ? { ...t, status: "closed" } : t
        ).filter(t => filter === "all" ? true : t.status === filter));
      }
    };
    socket.on("TICKET_UPDATE", handler);
    return () => socket.off("TICKET_UPDATE", handler);
  }, [socket, filter]);

  if (!userData) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6" style={{ minHeight: "70vh" }}>
      <img src="/ticket-icon.png" alt="" className="w-16 h-16 object-contain mb-2" />
      <h2 className="text-white text-xl font-bold">Log in to access Support</h2>
      <p className="text-[#68749C] text-sm">You must be logged in to open or view support tickets.</p>
    </div>
  );

  const filteredTickets = tickets.filter(t => filter === "all" || t.status === filter);

  return (
    <div className="flex h-full min-h-0" style={{ background: "#0f1117" }}>

      {/* ── Left Panel: Ticket List ── */}
      <div className="w-80 shrink-0 border-r border-[#252839] flex flex-col min-h-0 bg-[#0c0e16]">
        {/* Header */}
        <div
          className="px-4 py-4 border-b border-[#252839] shrink-0 bg-cover bg-center"
          style={{ backgroundImage: "linear-gradient(180deg, rgba(12,14,22,0.55), rgba(12,14,22,0.9)), url(/ticket-banner.png)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-white font-bold text-base flex items-center gap-2">
              <img src="/ticket-icon.png" alt="" className="w-5 h-5 object-contain" /> Support
            </h1>
            <button onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 transition-colors cursor-pointer">
              + New Ticket
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-1.5">
            {[["open", "Open"], ["closed", "Closed"], ["all", "All"]].map(([val, lbl]) => (
              <button key={val}
                onClick={() => { setFilter(val); setActiveId(null); }}
                className="flex-1 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                style={{
                  background: filter === val ? "rgba(255,255,255,0.08)" : "transparent",
                  color:      filter === val ? "#fff"                   : "#42496B",
                  border: `1px solid ${filter === val ? "rgba(255,255,255,0.12)" : "transparent"}`,
                }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-[#42496B] text-sm py-10">Loading…</div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <img src="/ticket-icon.png" alt="" className="w-10 h-10 object-contain mb-3 opacity-30" />
              <p className="text-[#42496B] text-sm">No {filter === "all" ? "" : filter} tickets</p>
              {filter === "open" && !isStaff && (
                <button onClick={() => setShowCreate(true)}
                  className="mt-3 px-4 py-2 rounded-lg border border-[#252839] text-xs text-[#68749C] hover:text-white hover:border-white/20 transition-colors cursor-pointer bg-transparent">
                  Open your first ticket
                </button>
              )}
            </div>
          ) : (
            filteredTickets.map(t => (
              <TicketItem
                key={t._id}
                ticket={t}
                active={activeId === t._id}
                onClick={() => setActiveId(t._id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right Panel: Ticket View ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeId ? (
          <TicketView
            key={activeId}
            ticketId={activeId}
            currentUser={userData}
            onClose={() => setActiveId(null)}
            onClosed={() => loadTickets()}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <img src="/ticket-icon.png" alt="" className="w-20 h-20 object-contain opacity-20" />
            <div>
              <h2 className="text-white font-bold text-lg mb-1">Select a ticket</h2>
              <p className="text-[#42496B] text-sm">
                {isStaff
                  ? "Choose a ticket from the list to view and respond."
                  : "Select a ticket or open a new one to get help."}
              </p>
            </div>
            {!isStaff && (
              <button onClick={() => setShowCreate(true)}
                className="mt-2 px-5 py-2.5 rounded-lg bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors cursor-pointer">
                Open a Ticket
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={(ticket) => {
            setShowCreate(false);
            setFilter("open");
            setTickets(prev => [ticket, ...prev]);
            setActiveId(ticket._id);
          }}
        />
      )}
    </div>
  );
}
