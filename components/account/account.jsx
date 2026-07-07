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
import {
  BarChart2,
  History,
  MonitorPlay,
  LogOut,
  Settings,
  User,
} from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(dateStr);
  }
}

const TABS = [
  { id: "general",    label: "General",    icon: Settings },
  { id: "statistics", label: "Statistics", icon: BarChart2 },
  { id: "history",    label: "History",    icon: History },
  { id: "sessions",   label: "Sessions",   icon: MonitorPlay },
];

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

  useEffect(() => {
    if (!userData) {
      toast.error("Login to do that!");
      navigate("/");
      return;
    }
    setHistoryLoading(true);
    fetch(`${api}/me`, {
      method: "POST",
      headers: { authorization: `Bearer ${getauth()}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d?.data?.history) setHistory(d.data.history); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [userData, navigate]);

  const wagerAnim = useSpring({ number: wagerAmount, from: { number: 0 }, config: { duration: 1000 } });
  const wonAnim   = useSpring({ number: wonAmount,   from: { number: 0 }, config: { duration: 1000 } });
  const lostAnim  = useSpring({ number: lostAmount,  from: { number: 0 }, config: { duration: 1000 } });

  const unlinkDiscord = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/me/discord/unlink`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getauth()}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Successfully unlinked Discord!");
        if (userData) { userData.discordid = null; userData.discordusername = null; }
      } else {
        toast.error(data.message || "Could not unlink Discord");
      }
    } catch {
      toast.error("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bloxyspin");
    localStorage.removeItem("token");
    toast.success("Successfully logged out!");
    setUserData(null);
    navigate("/");
  };

  return (
    <div className={AccountStyles.profileLayout}>
      {/* ── Sidebar ── */}
      <nav className={AccountStyles.sidebar}>
        <h2 className={AccountStyles.sidebarTitle}>Settings</h2>

        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`${AccountStyles.sidebarItem} ${activeTab === id ? AccountStyles.sidebarItemActive : ""}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </button>
        ))}

        <div className={AccountStyles.sidebarDivider} />

        <button
          type="button"
          className={`${AccountStyles.sidebarItem} ${AccountStyles.sidebarItemLogout}`}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Log out
        </button>
      </nav>

      {/* ── Main content ── */}
      <div className={AccountStyles.mainContent}>
        {/* Profile card */}
        <div className={AccountStyles.profileCard}>
          <div className={AccountStyles.avatarWrapper}>
            <div className={AccountStyles.avatarRing} style={{ borderColor: role.color + "55" }} />
            <img
              src={userData?.thumbnail}
              alt={userData?.username}
              className={AccountStyles.avatar}
              style={{ borderColor: role.color }}
            />
          </div>

          <div className={AccountStyles.profileInfo}>
            <h1 className={AccountStyles.profileName}>{userData?.username}</h1>
            <span
              className={AccountStyles.profileRankBadge}
              style={{ background: role.bg, border: `1px solid ${role.border}`, color: role.color }}
            >
              {role.name}
            </span>

            <div className={AccountStyles.levelSection}>
              <p className={AccountStyles.levelLabel}>
                Level Progress
              </p>
              <div className={AccountStyles.levelBarTrack}>
                <div
                  className={AccountStyles.levelBarFill}
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${role.color}99, ${role.color})`,
                    boxShadow: `0 0 6px ${role.color}66`,
                  }}
                />
              </div>
              <div className={AccountStyles.levelBarMeta}>
                <span>{pct}% to Lv {role.nextLevel ?? "Max"} {role.nextName ? `(${role.nextName})` : ""}</span>
                <span>Lv {level}</span>
              </div>
            </div>
          </div>

          {/* Discord button */}
          <div className={AccountStyles.discordWrapper}>
            <button
              onClick={() => userData?.discordid ? unlinkDiscord() : (location.href = discordOAuthURL)}
              className="button"
              disabled={loading}
            >
              {loading && (
                <div className={AccountStyles.loaderWrapperSmall}>
                  <div className={AccountStyles.loaderSmall} />
                </div>
              )}
              {userData?.discordid ? "Unlink Discord" : "Link Discord"}
            </button>
            {userData?.discordid && (
              <p className={AccountStyles.discordUsername}>
                {userData.discordusername || "Unknown"}
              </p>
            )}
          </div>
        </div>

        {/* Game level rows */}
        <div className={AccountStyles.gameLevels}>
          {[
            { tag: "PS99", name: `Lv ${level} - ${role.name}` },
            { tag: "BB",   name: `Lv 0 - User` },
            { tag: "TS",   name: `Lv 0 - User` },
          ].map(({ tag, name }) => (
            <div key={tag} className={AccountStyles.gameLevelCard}>
              <p className={AccountStyles.gameLevelTag}>{tag}</p>
              <p className={AccountStyles.gameLevelName}>{name}</p>
            </div>
          ))}
        </div>

        {/* Tab: General → Account Settings */}
        {activeTab === "general" && (
          <div className={AccountStyles.settingsSection}>
            <div className={AccountStyles.settingsSectionHeader}>
              <div className={AccountStyles.settingsSectionHeaderAccent} />
              <h3 className={AccountStyles.settingsSectionTitle}>Account Settings</h3>
            </div>
            <div className={AccountStyles.settingsGrid}>
              <div className={AccountStyles.settingsField}>
                <p className={AccountStyles.settingsFieldLabel}>User Identity</p>
                <p className={AccountStyles.settingsFieldDesc}>Your unique identifier on the platform.</p>
                <input
                  readOnly
                  value={userData?.userid || "—"}
                  className={AccountStyles.settingsInput}
                />
              </div>
              <div className={AccountStyles.settingsField}>
                <p className={AccountStyles.settingsFieldLabel}>Referred By</p>
                <p className={AccountStyles.settingsFieldDesc}>The user who invited you to the platform.</p>
                <input
                  readOnly
                  value="Coming soon..."
                  className={AccountStyles.settingsInput}
                />
              </div>
            </div>
            <div className={AccountStyles.settingsToggleRow}>
              <div className={AccountStyles.settingsToggleInfo}>
                <p className={AccountStyles.settingsFieldLabel}>Discord Account</p>
                <p className={AccountStyles.settingsFieldDesc}>
                  {userData?.discordid
                    ? `Connected as ${userData.discordusername || "Unknown"}`
                    : "Link your Discord to unlock perks."}
                </p>
              </div>
              <button
                className="button"
                disabled={loading}
                onClick={() => userData?.discordid ? unlinkDiscord() : (location.href = discordOAuthURL)}
                style={{ minWidth: 130, fontSize: 13, padding: "8px 16px" }}
              >
                {loading && (
                  <div className={AccountStyles.loaderWrapperSmall}>
                    <div className={AccountStyles.loaderSmall} />
                  </div>
                )}
                {userData?.discordid ? "Unlink Discord" : "Link Discord"}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Statistics */}
        {activeTab === "statistics" && (
          <div className={AccountStyles.statsGrid}>
            {[
              { label: "Wagered", anim: wagerAnim },
              { label: "Won",     anim: wonAnim },
              { label: "Lost",    anim: lostAnim },
            ].map(({ label, anim }) => (
              <div key={label} className={AccountStyles.statCard}>
                <div className={AccountStyles.statAmount}>
                  <img src={Bobux} alt="Bobux" className={AccountStyles.bobuxIcon} />
                  <animated.span>
                    {anim.number.interpolate((v) => Math.floor(v).toLocaleString())}
                  </animated.span>
                </div>
                <p className={AccountStyles.statLabel}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab: History */}
        {(activeTab === "history" || activeTab === "sessions") && (
          <div className={AccountStyles.historySection}>
            <div className={AccountStyles.historyHeader}>
              <span className={AccountStyles.historyTitle}>
                <div style={{ width: 3, height: 16, background: "#8B5CF6", borderRadius: 2, flexShrink: 0 }} />
                {activeTab === "history" ? "Transaction History" : "Sessions"}
              </span>
              <span className={AccountStyles.historyPageInfo}>
                {historyLoading ? "Loading..." : `Page ${page} of ${totalPages || 1}`}
              </span>
            </div>

            <div className={AccountStyles.historyTableHeader}>
              <p>Type</p>
              <p>Date</p>
              <p>Amount</p>
            </div>

            <div className={AccountStyles.historyList}>
              {historyLoading ? (
                <div className={AccountStyles.historyRow}>
                  <p style={{ gridColumn: "1/-1", color: "#42496B" }}>Loading...</p>
                </div>
              ) : history.length === 0 ? (
                <div className={AccountStyles.historyRow} style={{ padding: "32px 24px" }}>
                  <p style={{ gridColumn: "1/-1", color: "#42496B", textAlign: "center" }}>
                    No history yet.
                  </p>
                </div>
              ) : (
                [...history]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice((page - 1) * 10, page * 10)
                  .map((item, i) => (
                    <div key={i} className={AccountStyles.historyRow}>
                      <p>{item.type}</p>
                      <p>{formatDate(item.date)}</p>
                      <p style={{ color: String(item.amount).startsWith("-") ? "#FF6B6B" : "#4ADE80" }}>
                        {String(item.amount).startsWith("-") ? item.amount : `+${item.amount}`}
                      </p>
                    </div>
                  ))
              )}
            </div>

            <div className={AccountStyles.pagination}>
              <button
                className={AccountStyles.paginationBtn}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                <FaChevronLeft /> Previous
              </button>
              <button
                className={AccountStyles.paginationBtn}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
              >
                Next <FaChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
