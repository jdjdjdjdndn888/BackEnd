import React, { useState, useEffect, useCallback, useRef } from "react";
import { useModal } from "../../utils/ModalContext";
import S from "./deposit.module.css";
import toast from "react-hot-toast";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import Profile from "./profile.jsx";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatGems(n) {
  if (!n || n === 0) return "0";
  if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1).replace(/\.0$/, "") + "T";
  if (n >= 1_000_000_000)     return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000)         return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000)             return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function useTimer() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

function timeSince(date) {
  if (!date) return null;
  const s = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
  }
  const d = Math.floor(s / 86400);
  return `${d}d ago`;
}

function formatAbsolute(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Inventory Panel ───────────────────────────────────────────────────────────
function InventoryPanel({ bot }) {
  useTimer(); // live relative timestamps

  const hasInventory = bot.inventorySnapshot && bot.inventorySnapshot.length > 0;
  const lastSeenStr  = bot.lastSeen ? timeSince(bot.lastSeen) : null;

  return (
    <div className={S.inventoryPanel}>
      <div className={S.inventoryHeader}>
        <p className={S.inventoryTitle}>Bot Inventory</p>
        {lastSeenStr && (
          <span className={S.inventoryLastSeen}>Updated {lastSeenStr}</span>
        )}
      </div>

      <div className={S.inventoryStats}>
        {/* Gems */}
        <div className={S.inventoryStat}>
          <span className={S.inventoryStatIcon}>💎</span>
          <span className={S.inventoryStatLabel}>Gems</span>
          <span className={S.inventoryStatValue}>{formatGems(bot.gems || 0)}</span>
          <span className={S.inventoryStatSub}>{(bot.gems || 0).toLocaleString()} total</span>
        </div>
        {/* Pets */}
        <div className={S.inventoryStat}>
          <span className={S.inventoryStatIcon}>🐾</span>
          <span className={S.inventoryStatLabel}>Huges &amp; Titanics</span>
          <span className={S.inventoryStatValue}>{(bot.hugeCount || 0).toLocaleString()}</span>
          <span className={S.inventoryStatSub}>pets in stock</span>
        </div>
      </div>

      {hasInventory ? (
        <div className={S.petGrid}>
          {bot.inventorySnapshot.map((pet, i) => (
            <div key={i} className={S.petChip}>
              <span className={S.petChipCount}>×{pet.count}</span>
              <span className={S.petChipName}>{pet.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={S.inventoryEmpty}>
          {bot.inGame
            ? "Inventory not reported yet — check back in a moment."
            : "Inventory data unavailable while bot is offline."}
        </div>
      )}
    </div>
  );
}

// ── Bot Card ──────────────────────────────────────────────────────────────────
function BotCard({ bot, setModalState }) {
  useTimer(); // live status timers
  const [invOpen, setInvOpen] = useState(false);

  const online      = !!bot.online;
  const inGame      = !!bot.inGame;
  const lastSeenStr = bot.lastSeen   ? timeSince(bot.lastSeen)   : null;
  const leftAgoStr  = bot.lastLeftAt ? timeSince(bot.lastLeftAt) : null;
  const leftAbsStr  = bot.lastLeftAt ? formatAbsolute(bot.lastLeftAt) : null;

  // Three states:
  //  inGame          → green  "In Game"
  //  online !inGame  → amber  "Not In Game"
  //  !online         → red    "Offline"
  let statusLabel, statusClass, dotClass, statusSymbol;
  if (inGame) {
    statusLabel  = lastSeenStr ? `In Game · ${lastSeenStr}` : "In Game";
    statusClass  = S.statusBadgeOnline;
    dotClass     = S.statusDotOnline;
    statusSymbol = "●";
  } else if (online) {
    statusLabel  = leftAgoStr ? `Not In Game · left ${leftAgoStr}` : "Not In Game";
    statusClass  = S.statusBadgeNotInGame;
    dotClass     = S.statusDotNotInGame;
    statusSymbol = "●";
  } else {
    statusLabel  = leftAgoStr ? `Offline · left ${leftAgoStr}` : "Offline";
    statusClass  = S.statusBadgeOffline;
    dotClass     = S.statusDotOffline;
    statusSymbol = "○";
  }

  const handleJoin = () => {
    if (!online) return toast.error("Bot is offline!");
    if (!inGame)  return toast.error("Bot is not in game right now — check back soon!");
    window.open(bot.link, "_blank");
  };

  return (
    <div className={S.botCard}>
      <div className={S.botCardMain}>
        {/* Avatar */}
        <div className={S.botAvatarWrap}>
          <img
            src={bot.pfp}
            alt={bot.name}
            className={S.botAvatar}
            onClick={() => setModalState(<Profile userid={bot.userid || 1} />)}
          />
          <span className={`${S.statusDot} ${dotClass}`} />
        </div>

        {/* Info */}
        <div className={S.botInfo}>
          <div className={S.botNameRow}>
            <span className={S.botName}>{bot.name}</span>
            <span className={`${S.statusBadge} ${statusClass}`}>
              {statusSymbol + " "}{statusLabel}
            </span>
          </div>

          <div className={S.botMeta}>
            {typeof bot.gems === "number" && (
              <>
                <span className={S.botMetaStat}>
                  <span className={S.botMetaStatIcon}>💎</span>
                  <span className={S.botMetaStatValue}>{formatGems(bot.gems)}</span>
                </span>
                <span className={S.botMetaStatSep} />
              </>
            )}
            {typeof bot.hugeCount === "number" && (
              <span className={S.botMetaStat}>
                <span className={S.botMetaStatIcon}>🐾</span>
                <span className={S.botMetaStatValue}>{bot.hugeCount} pets</span>
              </span>
            )}
            {online && !inGame && leftAbsStr && (
              <>
                {(typeof bot.gems === "number" || typeof bot.hugeCount === "number") && (
                  <span className={S.botMetaStatSep} />
                )}
                <span className={S.botMetaStat}>
                  <span style={{ color: "#fbbf24", fontSize: 10 }}>
                    Left: {leftAbsStr}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={S.botCardActions}>
          <button
            className={`${S.btnJoin} ${!online ? S.btnJoinOffline : !inGame ? S.btnJoinNotInGame : ""}`}
            onClick={handleJoin}
          >
            {!online ? "Offline" : inGame ? "Join →" : "Not In Game"}
          </button>
          <button
            className={`${S.btnInventory} ${invOpen ? S.btnInventoryOpen : ""}`}
            onClick={() => setInvOpen((v) => !v)}
          >
            {invOpen ? "Hide Inv ▲" : "Inventory ▾"}
          </button>
        </div>
      </div>

      {/* Not-in-game sub-banner */}
      {online && !inGame && bot.lastLeftAt && (
        <div style={{ padding: "0 16px 12px" }}>
          <div className={S.notInGameBanner}>
            <span className={S.notInGameBannerDot}>●</span>
            <span className={S.notInGameBannerText}>
              Bot script is not running —{" "}
              <span className={S.notInGameBannerTime}>
                hasn't been in game since {leftAgoStr || leftAbsStr}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Offline sub-banner */}
      {!online && bot.lastLeftAt && (
        <div style={{ padding: "0 16px 12px" }}>
          <div className={S.offlineBanner}>
            <span className={S.offlineBannerDot}>●</span>
            <span className={S.offlineBannerText}>
              Bot is offline —{" "}
              <span className={S.offlineBannerTime}>
                hasn't been back since {leftAgoStr || leftAbsStr}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Inventory drawer */}
      {invOpen && <InventoryPanel bot={bot} />}
    </div>
  );
}

// ── Bot List ──────────────────────────────────────────────────────────────────
function BotList({ game }) {
  const { setModalState } = useModal();
  const [loading, setLoading]         = useState(false);
  const [bots, setBots]               = useState([]);
  const [responseCode, setResponseCode] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setResponseCode("");
    setBots([]);
    fetch(`${api}/bots/${game}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.bots)  setBots(data.bots);
        if (data.code)  setResponseCode(data.code);
      })
      .catch(() => toast.error("Could not fetch bots!"))
      .finally(() => setLoading(false));
  }, [game]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 s to keep status fresh
  useEffect(() => {
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return (
    <div className={S.loaderWrap}><div className={S.loader} /></div>
  );

  if (!bots.length) return (
    <div className={S.noBots}>
      <p className={S.noBotsTitle}>No bots available</p>
      <p className={S.noBotsText}>
        All bots are currently offline or being set up.<br />
        Join our Discord for updates.
      </p>
      <button
        className={S.btnJoin}
        onClick={() => window.open("https://discord.gg/5gAJ8mBh", "_blank")}
      >
        Join Discord
      </button>
    </div>
  );

  return (
    <div className={S.botListSection}>
      <p className={S.sectionLabel}>Available Bots</p>

      {responseCode && (
        <div className={S.codeBanner}>
          <span className={S.codeBannerIcon}>🔑</span>
          <div className={S.codeBannerText}>
            <p className={S.codeBannerLabel}>Your Trade Code</p>
            <p className={S.codeBannerValue}>{responseCode}</p>
            <p className={S.codeBannerHint}>The bot will say this code when trading with you</p>
          </div>
        </div>
      )}

      {bots.map((bot, i) => (
        <BotCard key={bot._id || i} bot={bot} setModalState={setModalState} />
      ))}
    </div>
  );
}

// ── Item Search ───────────────────────────────────────────────────────────────
function ItemSearch() {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [searched,    setSearched]    = useState(false);
  const [searching,   setSearching]   = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [reqName,     setReqName]     = useState("");
  const [reqValue,    setReqValue]    = useState("");
  const [reqImage,    setReqImage]    = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const debounce = useRef(null);

  const search = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setSearching(true);
    try {
      const r = await fetch(`${api}/items/search?q=${encodeURIComponent(q)}&game=PS99`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const d = await r.json();
      setResults(d.items || []);
      setSearched(true);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setShowRequest(false);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(v), 400);
  };

  const submitRequest = async () => {
    if (!reqName.trim() || !reqValue) return toast.error("Name and value are required.");
    setSubmitting(true);
    try {
      const r = await fetch(`${api}/items/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ itemname: reqName, itemvalue: Number(reqValue), itemimage: reqImage }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success(d.message);
        setShowRequest(false);
        setReqName(""); setReqValue(""); setReqImage("");
      } else toast.error(d.message || "Failed to send request.");
    } catch { toast.error("Request failed."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className={S.searchSection}>
      <p className={S.searchLabel}>Search Depositable Items</p>

      <div className={S.searchInputWrap}>
        <input
          className={S.searchInput}
          value={query}
          onChange={handleChange}
          placeholder="Type an item name (e.g. Huge Cat)..."
        />
        {searching && <span className={S.searchSpinner}>searching…</span>}
      </div>

      {searched && !searching && (
        results.length > 0 ? (
          <div className={S.itemGrid}>
            {results.map((item) => (
              <div key={item.itemid} className={S.itemCard}>
                {item.itemimage && (
                  <img src={item.itemimage} alt={item.itemname} className={S.itemCardImg} />
                )}
                <p className={S.itemCardName}>{item.itemname}</p>
                <p className={S.itemCardValue}>R${(item.itemvalue || 0).toLocaleString()}</p>
                <span className={S.itemCardTag}>✓ Depositable</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={S.noItemFound}>
            <p>No item found for "{query}"</p>
            <button
              className={S.btnRequest}
              onClick={() => { setShowRequest(true); setReqName(query.trim()); }}
            >
              + Request to Add
            </button>
          </div>
        )
      )}

      {showRequest && (
        <div className={S.requestForm}>
          <p className={S.requestFormTitle}>Request Item to be Added</p>
          <input className={S.requestInput} value={reqName}
            onChange={(e) => setReqName(e.target.value)} placeholder="Item name *" />
          <input className={S.requestInput} value={reqValue} type="number" min="1"
            onChange={(e) => setReqValue(e.target.value)} placeholder="Value in R$ *" />
          <input className={S.requestInput} value={reqImage}
            onChange={(e) => setReqImage(e.target.value)} placeholder="Image URL (optional)" />
          <div className={S.requestActions}>
            <button className={S.btnSubmit} onClick={submitRequest} disabled={submitting}>
              {submitting ? "Sending…" : "Send Request"}
            </button>
            <button className={S.btnCancel} onClick={() => setShowRequest(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function Deposit() {
  const { setModalState } = useModal();
  const [tab,       setTab]       = useState("PS99");
  const [isClosing, setIsClosing] = useState(false);

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => setModalState(null), 200);
  };

  const tabs = ["PS99", "SAB"];

  return (
    <div className={S.blurbg} onClick={closeModal}>
      <div
        className={`${S.modal} ${isClosing ? S.shrinkOut : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={S.closeButton} onClick={closeModal}>×</button>

        {/* Header */}
        <div className={S.header}>
          <h1 className={S.depositTitle}>Deposit</h1>
          <div className={S.tabRow}>
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`${S.tab} ${tab === t ? S.tabActive : S.tabInactive}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Bot list */}
        <BotList game={tab} />

        {/* Item search — PS99 only */}
        {tab === "PS99" && <ItemSearch />}

        {/* Footer */}
        <div className={S.footerNote}>
          <span className={S.footerNoteIcon}>⚠️</span>
          <p className={S.footerNoteText}>
            Always verify the bot's username matches exactly before trading.
            Scammers often impersonate bots with similar-looking names.
          </p>
        </div>
      </div>
    </div>
  );
}
