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
import { getrole, getLevelProgress, getDisplayLevel } from "../../utils/getrole";
import { BarChart2, History, MonitorPlay, LogOut, Settings, Link2 } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return String(dateStr); }
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

const TABS = [
  { id: "general",    label: "General",    icon: Settings    },
  { id: "statistics", label: "Statistics", icon: BarChart2   },
  { id: "history",    label: "History",    icon: History     },
  { id: "sessions",   label: "Sessions",   icon: MonitorPlay },
  { id: "affiliate",  label: "Affiliate",  icon: Link2       },
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

function AffiliateTab() {
  const { userData } = useContext(UserContext);
  const [data, setData]         = useState(null);
  const [fetching, setFetching] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [useInput, setUseInput]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [using, setUsing]       = useState(false);
  const [claiming, setClaiming] = useState(null);

  const fetchData = () => {
    setFetching(true);
    fetch(`${api}/affiliate/mine`, { headers: { authorization: `Bearer ${getauth()}` } })
      .then((r) => r.json())
      .then((d) => { setData(d); setCodeInput(d.myCode || ""); })
      .catch(() => toast.error("Could not load affiliate data"))
      .finally(() => setFetching(false));
  };
  useEffect(fetchData, []);

  const saveCode = async () => {
    if (!codeInput.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${api}/affiliate/setcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ code: codeInput.trim() }),
      });
      const d = await r.json();
      if (r.ok) { toast.success(d.message); fetchData(); }
      else toast.error(d.message || "Failed to set code");
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  };

  const useCode = async () => {
    if (!useInput.trim()) return;
    setUsing(true);
    try {
      const r = await fetch(`${api}/affiliate/usecode`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ code: useInput.trim() }),
      });
      const d = await r.json();
      if (r.ok) { toast.success(d.message); setUseInput(""); fetchData(); }
      else toast.error(d.message || "Failed to use code");
    } catch { toast.error("Network error"); }
    finally { setUsing(false); }
  };

  const claim = async (useid, username) => {
    setClaiming(useid);
    try {
      const r = await fetch(`${api}/affiliate/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ useid }),
      });
      const d = await r.json();
      if (r.ok) { toast.success(d.message); fetchData(); }
      else toast.error(d.message || "Could not claim");
    } catch { toast.error("Network error"); }
    finally { setClaiming(null); }
  };

  const fmtM = (n) => `${(n / 1_000_000).toFixed(1)}M`;
  const bar  = (val, max) => Math.min(100, Math.round((val / max) * 100));

  if (fetching) return <div style={{ padding: 40, textAlign: "center", color: "#555", fontSize: 13 }}>Loading…</div>;

  const req = data?.requirements || { deposit: 10_000_000, wager: 30_000_000, reward: 100_000_000 };

  return (
    <div>
      {/* ── Set your code ── */}
      <div style={S.card}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Your Affiliate Code</div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 14, lineHeight: 1.6 }}>
            Share your code with others. When they deposit <strong style={{ color: "#fff" }}>10M gems</strong> and wager <strong style={{ color: "#fff" }}>30M gems</strong>, you can claim <strong style={{ color: "#8B5CF6" }}>100M gems</strong> per referral.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="e.g. TEDDE99"
              maxLength={20}
              style={{ ...S.input, flex: 1, color: "#fff" }}
            />
            <button onClick={saveCode} disabled={saving || !codeInput.trim()} style={S.btnPrimary}>
              {saving ? "Saving…" : data?.myCode ? "Update" : "Set Code"}
            </button>
          </div>
          {data?.myCode && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
              Current code: <span style={{ color: "#8B5CF6", fontWeight: 700, fontFamily: "monospace" }}>{data.myCode}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Use a code ── */}
      <div style={S.card}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Use Someone's Code</div>
        </div>
        <div style={{ padding: 20 }}>
          {data?.usedCode ? (
            <div style={{ fontSize: 13, color: "#888" }}>
              You are using code <span style={{ color: "#8B5CF6", fontWeight: 700, fontFamily: "monospace" }}>{data.usedCode}</span>. Keep depositing and wagering to reward them!
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 14 }}>Enter a friend's affiliate code to support them.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={useInput}
                  onChange={(e) => setUseInput(e.target.value)}
                  placeholder="Enter code…"
                  maxLength={20}
                  style={{ ...S.input, flex: 1, color: "#fff" }}
                />
                <button onClick={useCode} disabled={using || !useInput.trim()} style={S.btnPrimary}>
                  {using ? "Applying…" : "Apply Code"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Referrals ── */}
      {data?.myCode && (
        <div style={S.card}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", fontWeight: 600 }}>Referrals</div>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              {[["Claimable", data.totals?.claimable, "#4ade80"], ["Pending", data.totals?.pending, "#f59e0b"], ["Claimed", data.totals?.claimed, "#6B7280"]].map(([l, n, c]) => (
                <span key={l} style={{ color: c }}>{n} {l}</span>
              ))}
            </div>
          </div>
          {!data.uses?.length ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#444", fontSize: 13 }}>Nobody has used your code yet. Share it!</div>
          ) : (
            data.uses.map((u) => (
              <div key={u._id} style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</span>
                  {u.claimed ? (
                    <span style={{ fontSize: 11, color: "#6B7280", background: "rgba(107,114,128,0.1)", border: "1px solid rgba(107,114,128,0.2)", padding: "3px 10px", borderRadius: 20 }}>Claimed</span>
                  ) : u.claimable ? (
                    <button
                      onClick={() => claim(u._id, u.username)}
                      disabled={claiming === u._id}
                      style={{ ...S.btnPrimary, background: "linear-gradient(135deg,#8B5CF6,#7C3AED)", color: "#fff", border: "none" }}
                    >
                      {claiming === u._id ? "Claiming…" : `Claim ${fmtM(req.reward)} Gems`}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", padding: "3px 10px", borderRadius: 20 }}>Pending</span>
                  )}
                </div>
                {/* Progress bars */}
                {[
                  { label: "Deposit", value: u.depositProgress, max: req.deposit, met: u.depositMet, color: "#4ade80" },
                  { label: "Wager",   value: u.wagerProgress,   max: req.wager,   met: u.wagerMet,   color: "#8B5CF6" },
                ].map(({ label, value, max, met, color }) => (
                  <div key={label} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", marginBottom: 3 }}>
                      <span>{label}</span>
                      <span style={{ color: met ? color : "#555" }}>{fmtM(Math.min(value, max))} / {fmtM(max)} {met ? "✓" : ""}</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${bar(value, max)}%`, background: met ? color : "#333", borderRadius: 2, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

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
  const level = getDisplayLevel(userData?.rank, userData?.level || 0);
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

  const isMobile = useIsMobile();

  const handleLogout = () => {
    localStorage.removeItem("bloxyspin");
    localStorage.removeItem("token");
    toast.success("Successfully logged out!");
    setUserData(null);
    navigate("/");
  };

  return (
    <div style={{ ...S.page, flexDirection: isMobile ? "column" : "row" }}>

      {/* ── Sidebar — vertical on desktop, horizontal pill tabs on mobile ── */}
      {isMobile ? (
        <nav style={{
          display: "flex", flexDirection: "row", overflowX: "auto", gap: 6,
          padding: "10px 14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0, scrollbarWidth: "none",
        }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px 8px", fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? "#8B5CF6" : "#555", background: "transparent",
                border: "none", borderBottom: active ? "2px solid #8B5CF6" : "2px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                transition: "color 0.15s, border-color 0.15s",
              }}>
                <Icon size={13} style={{ flexShrink: 0 }} />
                {label}
              </button>
            );
          })}
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px 8px", fontSize: 12, fontWeight: 500,
            color: "#f87171", background: "transparent",
            border: "none", borderBottom: "2px solid transparent",
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            marginLeft: "auto",
          }}>
            <LogOut size={13} style={{ flexShrink: 0 }} />
            Logout
          </button>
        </nav>
      ) : (
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
      )}

      {/* ── Main content ── */}
      <div style={{ ...S.main, padding: isMobile ? "14px" : "28px 28px" }}>
        {/* Profile card */}
        <div style={S.card}>
          <div style={{ padding: isMobile ? "14px" : "20px 22px", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 12 : 18 }}>
            {/* Avatar row on mobile */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: isMobile ? 56 : 72, height: isMobile ? 56 : 72, borderRadius: "50%", border: `2px solid ${role.color}55`, padding: 2 }}>
                  <img src={userData?.thumbnail} alt={userData?.username}
                    style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: `2px solid ${role.color}`, display: "block" }} />
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: "#fff" }}>{userData?.username}</span>
                  <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: role.bg, border: `1px solid ${role.border}`, color: role.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{role.name}</span>
                </div>
                {/* Level bar */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", maxWidth: isMobile ? "100%" : 200 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: role.color, borderRadius: 2, transition: "width 0.8s ease", boxShadow: `0 0 6px ${role.color}66` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", maxWidth: isMobile ? "100%" : 200, marginTop: 3, fontSize: 10, color: "#555" }}>
                    <span>Lv {level}</span>
                    <span>{pct}% → Lv {role.nextLevel ?? "Max"}</span>
                  </div>
                </div>
                {userData?.discordid && (
                  <span style={{ fontSize: 11, color: "#888" }}>🎮 {userData.discordusername || "Linked"}</span>
                )}
              </div>

              {/* Discord button — right of avatar row */}
              <button
                onClick={() => userData?.discordid ? unlinkDiscord() : (location.href = discordOAuthURL)}
                disabled={loading}
                style={{ ...(userData?.discordid ? S.btnDanger : S.btnOutline), flexShrink: 0, fontSize: isMobile ? 11 : 12 }}
              >
                {loading ? "..." : userData?.discordid ? "Unlink" : "Link Discord"}
              </button>
            </div>
          </div>

          {/* Game levels strip */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex" }}>
            {[{ tag: "PS99", name: `Lv ${level} · ${role.name}` }, { tag: "BB", name: "Lv 0 · User" }, { tag: "TS", name: "Lv 0 · User" }].map(({ tag, name }, i) => (
              <div key={tag} style={{ flex: 1, padding: isMobile ? "10px 12px" : "12px 16px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 3 }}>{tag}</div>
                <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 600, color: "#fff" }}>{name}</div>
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
            <div style={{ padding: isMobile ? "14px" : "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 20 }}>
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
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: 12, marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Discord Account</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{userData?.discordid ? `Connected as ${userData.discordusername || "Unknown"}` : "Link your Discord to unlock perks."}</div>
                </div>
                <button onClick={() => userData?.discordid ? unlinkDiscord() : (location.href = discordOAuthURL)} disabled={loading}
                  style={{ ...(userData?.discordid ? S.btnDanger : S.btnPrimary), alignSelf: isMobile ? "flex-start" : "auto" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)" }}>
              {[{ label: "Wagered", anim: wagerAnim, color: "#fff" }, { label: "Won", anim: wonAnim, color: "#4ade80" }, { label: "Lost", anim: lostAnim, color: "#f87171" }].map(({ label, anim, color }, i) => (
                <div key={label} style={{ padding: isMobile ? "16px 14px" : "22px 20px", borderRight: !isMobile && i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", borderBottom: isMobile && i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", alignItems: "center", justifyContent: isMobile ? "space-between" : "center", flexDirection: isMobile ? "row" : "column", textAlign: isMobile ? "left" : "center" }}>
                  <div style={{ fontSize: 12, letterSpacing: "0.08em", color: "#555", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <img src={Bobux} alt="Bobux" style={{ width: 16, height: 16, objectFit: "contain" }} />
                    <animated.span style={{ fontSize: isMobile ? 16 : 22, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
                      {anim.number.interpolate((v) => Math.floor(v).toLocaleString())}
                    </animated.span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Affiliate tab ── */}
        {activeTab === "affiliate" && <AffiliateTab />}

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
