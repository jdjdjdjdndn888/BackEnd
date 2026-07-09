import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useModal } from "../../utils/ModalContext";
import UserContext from "../../utils/user.js";
import AccountStyles from "./account.module.css";
import { Bobux } from "../../assets/exports.jsx";
import { api, discordOAuthURL } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import toast from "react-hot-toast";
import { useSpring, animated } from "react-spring";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { getrole, getLevelProgress } from "../../utils/getrole";
import { BarChart2, History, MonitorPlay, LogOut, Settings } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return String(dateStr); }
}

const TABS = [
  { id: "general",    label: "General",    icon: Settings    },
  { id: "statistics", label: "Statistics", icon: BarChart2   },
  { id: "history",    label: "History",    icon: History     },
  { id: "sessions",   label: "Sessions",   icon: MonitorPlay },
];

const S = {
  page:    { boxSizing: "border-box", background: "#0c0c0c", minHeight: "100%", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex" },
  sidebar: { width: 200, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4 },
  main:    { flex: 1, padding: "28px 28px", overflowY: "auto", minWidth: 0 },
  sideLabel: { fontSize: 10, letterSpacing: "0.12em", color: "#444", textTransform: "uppercase", padding: "0 8px", marginBottom: 6, marginTop: 4 },
  sideBtn: (active) => ({ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#fff" : "#666", background: active ? "rgba(255,255,255,0.07)" : "transparent", border: "none", borderRadius: 6, cursor: "pointer", textAlign: "left", transition: "background 0.15s, color 0.15s" }),
  card:    { background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, overflow: "hidden", marginBottom: 20 },
  section: { padding: "18px 20px" },
  label:   { fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 8 },
  input:   { width: "100%", background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#888", outline: "none", boxSizing: "border-box" },
  divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "0 0" },
  btnOutline: { fontSize: 12, padding: "7px 14px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, background: "transparent", color: "#ccc", cursor: "pointer" },
  btnPrimary: { fontSize: 12, padding: "7px 14px", border: "none", borderRadius: 6, background: "#fff", color: "#000", fontWeight: 600, cursor: "pointer" },
  btnDanger:  { fontSize: 12, padding: "7px 14px", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, background: "rgba(239,68,68,0.06)", color: "#f87171", cursor: "pointer" },
};

export default function Account() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const { userData, setUserData } = useContext(UserContext);
  const { setModalState } = useModal();
  const [history, setHistory] = useState(userData?.history || []);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil((history.length || 0) / 10);

  const wagerAmount = userData?.wager || 0;
  const wonAmount   = userData?.won   || 0;
  const lostAmount  = userData?.lost  || 0;
  const level = userData?.level || 0;
  const role  = getrole(userData?.rank, level);
  const { pct } = getLevelProgress(level);

  const wagerAnim = useSpring({ number: wagerAmount, from: { number: 0 }, config: { duration: 1000 } });
  const wonAnim   = useSpring({ number: wonAmount,   from: { number: 0 }, config: { duration: 1000 } });
  const lostAnim  = useSpring({ number: lostAmount,  from: { number: 0 }, config: { duration: 1000 } });

  useEffect(() => {
    if (!userData) { toast.error("Login to do that!"); navigate("/"); return; }
    setHistoryLoading(true);
    fetch(`${api}/me`, { method: "POST", headers: { authorization: `Bearer ${getauth()}` } })
      .then((r) => r.json())
      .then((d) => { if (d?.data?.history) setHistory(d.data.history); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [userData, navigate]);

  const unlinkDiscord = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/me/discord/unlink`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getauth()}` } });
      const data = await res.json();
      if (res.ok) { toast.success("Successfully unlinked Discord!"); if (userData) { userData.discordid = null; userData.discordusername = null; } }
      else toast.error(data.message || "Could not unlink Discord");
    } catch { toast.error("An error occurred."); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("bloxyspin");
    localStorage.removeItem("token");
    toast.success("Successfully logged out!");
    setUserData(null);
    navigate("/");
  };

  return (
    <div style={S.page}>
      {/* ── Sidebar ── */}
      <nav style={S.sidebar}>
        <div style={S.sideLabel}>Account</div>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} style={S.sideBtn(activeTab === id)} onClick={() => setActiveTab(id)}>
            <Icon size={14} style={{ flexShrink: 0 }} />
            {label}
          </button>
        ))}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />
        <button style={{ ...S.sideBtn(false), color: "#f87171" }} onClick={handleLogout}>
          <LogOut size={14} style={{ flexShrink: 0 }} />
          Log out
        </button>
      </nav>

      {/* ── Main content ── */}
      <div style={S.main}>
        {/* Profile card */}
        <div style={S.card}>
          <div style={{ padding: "20px 22px", display: "flex", alignItems: "center", gap: 18 }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", border: `2px solid ${role.color}55`, padding: 2 }}>
                <img src={userData?.thumbnail} alt={userData?.username}
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: `2px solid ${role.color}`, display: "block" }} />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{userData?.username}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: role.bg, border: `1px solid ${role.border}`, color: role.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{role.name}</span>
              </div>
              {/* Level bar */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", maxWidth: 200 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: role.color, borderRadius: 2, transition: "width 0.8s ease", boxShadow: `0 0 6px ${role.color}66` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 200, marginTop: 4, fontSize: 10, color: "#555" }}>
                  <span>Lv {level}</span>
                  <span>{pct}% → Lv {role.nextLevel ?? "Max"}</span>
                </div>
              </div>
              {userData?.discordid && (
                <span style={{ fontSize: 12, color: "#888" }}>🎮 {userData.discordusername || "Linked"}</span>
              )}
            </div>

            {/* Discord button */}
            <button
              onClick={() => userData?.discordid ? unlinkDiscord() : (location.href = discordOAuthURL)}
              disabled={loading}
              style={userData?.discordid ? S.btnDanger : S.btnOutline}
            >
              {loading ? "..." : userData?.discordid ? "Unlink Discord" : "Link Discord"}
            </button>
          </div>

          {/* Game levels strip */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex" }}>
            {[{ tag: "PS99", name: `Lv ${level} · ${role.name}` }, { tag: "BB", name: "Lv 0 · User" }, { tag: "TS", name: "Lv 0 · User" }].map(({ tag, name }, i) => (
              <div key={tag} style={{ flex: 1, padding: "12px 16px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 4 }}>{tag}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── General tab ── */}
        {activeTab === "general" && (
          <div style={S.card}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Account Settings</div>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {[{ label: "User Identity", desc: "Your unique platform identifier.", val: userData?.userid || "—" },
                  { label: "Referred By",   desc: "The user who invited you.",       val: "Coming soon..." }].map(({ label, desc, val }) => (
                  <div key={label}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>{desc}</div>
                    <input readOnly value={val} style={S.input} />
                  </div>
                ))}
              </div>
              <div style={S.divider} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Discord Account</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{userData?.discordid ? `Connected as ${userData.discordusername || "Unknown"}` : "Link your Discord to unlock perks."}</div>
                </div>
                <button onClick={() => userData?.discordid ? unlinkDiscord() : (location.href = discordOAuthURL)} disabled={loading}
                  style={userData?.discordid ? S.btnDanger : S.btnPrimary}>
                  {loading ? "..." : userData?.discordid ? "Unlink Discord" : "Link Discord"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Statistics tab ── */}
        {activeTab === "statistics" && (
          <div style={S.card}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Statistics</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
              {[{ label: "Wagered", anim: wagerAnim, color: "#fff" }, { label: "Won", anim: wonAnim, color: "#4ade80" }, { label: "Lost", anim: lostAnim, color: "#f87171" }].map(({ label, anim, color }, i) => (
                <div key={label} style={{ padding: "22px 20px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
                    <img src={Bobux} alt="Bobux" style={{ width: 18, height: 18, objectFit: "contain" }} />
                    <animated.span style={{ fontSize: 22, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
                      {anim.number.interpolate((v) => Math.floor(v).toLocaleString())}
                    </animated.span>
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── History / Sessions tab ── */}
        {(activeTab === "history" || activeTab === "sessions") && (
          <div style={S.card}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>
                {activeTab === "history" ? "Transaction History" : "Sessions"}
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>{historyLoading ? "Loading..." : `Page ${page} of ${totalPages || 1}`}</div>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {["Type", "Date", "Amount"].map((h) => (
                <span key={h} style={{ fontSize: 10, letterSpacing: "0.1em", color: "#444", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {historyLoading ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "#555", fontSize: 13 }}>Loading...</div>
            ) : history.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center", color: "#444", fontSize: 13 }}>No history yet.</div>
            ) : (
              [...history]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice((page - 1) * 10, page * 10)
                .map((item, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "11px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <span style={{ fontSize: 13, color: "#ccc" }}>{item.type}</span>
                    <span style={{ fontSize: 12, color: "#555" }}>{formatDate(item.date)}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: String(item.amount).startsWith("-") ? "#f87171" : "#4ade80" }}>
                      {String(item.amount).startsWith("-") ? item.amount : `+${item.amount}`}
                    </span>
                  </div>
                ))
            )}

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {[{ icon: FaChevronLeft, label: "Previous", onClick: () => setPage((p) => Math.max(p - 1, 1)), disabled: page === 1 },
                { icon: FaChevronRight, label: "Next", onClick: () => setPage((p) => Math.min(p + 1, totalPages)), disabled: page >= totalPages }
              ].map(({ icon: Icon, label, onClick, disabled }) => (
                <button key={label} onClick={onClick} disabled={disabled}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: disabled ? "#333" : "#888", background: "transparent", border: "none", cursor: disabled ? "not-allowed" : "pointer" }}>
                  {label === "Previous" && <Icon />}
                  {label}
                  {label === "Next" && <Icon />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
