import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "@/utils/user";
import SocketContext from "@/utils/socket";
import { api } from "@/config";
import { getauth } from "@/utils/getauth";
import { useModal } from "@/utils/ModalContext";
import LoginModal from "@/components/popup/login";
import toast from "react-hot-toast";
import "./cases.css";

const GEM = () => (
  <svg viewBox="0 0 32 32" style={{ width: "0.85em", height: "0.85em", verticalAlign: "middle", marginRight: 3 }}>
    <polygon points="16,2 28,10 16,30 4,10" fill="#38bdf8" stroke="#1e3a5f" strokeWidth="1.5"/>
    <polygon points="16,2 22,10 16,18 10,10" fill="#bae6fd" opacity="0.55"/>
  </svg>
);

const RARITY_COLORS = {
  common:    { bg: "#1a2a1a", border: "#2d4a2d", text: "#4ade80", glow: "rgba(74,222,128,0.3)", icon: "/images/cases/rarity-common.png" },
  uncommon:  { bg: "#1a2535", border: "#2d4a6a", text: "#38bdf8", glow: "rgba(56,189,248,0.3)", icon: "/images/cases/rarity-uncommon.png" },
  rare:      { bg: "#1e1a35", border: "#4a2d7a", text: "#a78bfa", glow: "rgba(167,139,250,0.3)", icon: "/images/cases/rarity-rare.png" },
  epic:      { bg: "#2a1a35", border: "#7a2d9a", text: "#e879f9", glow: "rgba(232,121,249,0.4)", icon: "/images/cases/rarity-epic.png" },
  legendary: { bg: "#2a1e0a", border: "#9a6a0a", text: "#fbbf24", glow: "rgba(251,191,36,0.5)", icon: "/images/cases/rarity-legendary.png" },
};

// ── Custom rarity emoji badge (replaces plain text label) ──────────────────
function RarityBadge({ rarity, size = 14 }) {
  const rc = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  return (
    <img
      src={rc.icon}
      alt={rarity}
      title={rarity}
      className="rarity-emoji"
      style={{ width: size, height: size }}
    />
  );
}

function fmt(n) {
  if (!n && n !== 0) return "0";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

// ── Reel animation component ─────────────────────────────────────────────────
function CaseReel({ items, wonItem, rolling, onDone }) {
  const reelRef = useRef(null);
  const ITEM_W = 120; // px per item slot
  const VISIBLE = 7;
  const PAD = 3;

  useEffect(() => {
    if (!rolling || !wonItem || !items.length) return;

    const track = reelRef.current;
    if (!track) return;

    // Build a long list: random shuffled items × many, then place winner near end
    const pool = [];
    const repeated = 40;
    for (let i = 0; i < repeated; i++) {
      pool.push(...[...items].sort(() => Math.random() - 0.5));
    }
    // Place winner at position ~ (repeated-4) * items.length + middle
    const winnerIdx = Math.floor(pool.length * 0.8);
    pool[winnerIdx] = wonItem;

    // Set items on DOM
    track.innerHTML = pool.map(item => {
      const rc = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
      return `<div class="reel-item" style="background:${rc.bg};border:1.5px solid ${rc.border};box-shadow:0 0 12px ${rc.glow}">
        <img src="${item.itemimage}" alt="${item.itemname}" style="width:64px;height:64px;object-fit:contain;"/>
        <div class="reel-item-name" style="color:${rc.text}">${item.itemname}</div>
      </div>`;
    }).join("");

    // Animate
    const totalW = pool.length * ITEM_W;
    const centerOffset = (VISIBLE / 2) * ITEM_W - ITEM_W / 2;
    const targetX = winnerIdx * ITEM_W - centerOffset;

    track.style.transition = "none";
    track.style.transform = "translateX(0)";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.style.transition = `transform 5s cubic-bezier(0.05, 0.98, 0.35, 1)`;
        track.style.transform = `translateX(-${targetX}px)`;
        setTimeout(onDone, 5200);
      });
    });
  }, [rolling]);

  return (
    <div className="reel-outer">
      <div className="reel-window">
        <div className="reel-track" ref={reelRef} />
        <div className="reel-center-marker" />
      </div>
    </div>
  );
}

// ── Item card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, small }) {
  const rc = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
  return (
    <div className={`case-item-card ${small ? "small" : ""}`}
      style={{ background: rc.bg, border: `1.5px solid ${rc.border}`, boxShadow: `0 0 10px ${rc.glow}` }}>
      <img src={item.itemimage} alt={item.itemname} />
      <div className="case-item-name" style={{ color: rc.text }}>{item.itemname}</div>
      <div className="case-item-value"><GEM />{fmt(item.itemvalue)}</div>
      <div className="case-item-rarity" style={{ color: rc.text }}><RarityBadge rarity={item.rarity} size={12} />{item.rarity}</div>
    </div>
  );
}

// ── Win modal ─────────────────────────────────────────────────────────────────
function WinModal({ item, onClose }) {
  const rc = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
  return (
    <div className="win-overlay" onClick={onClose}>
      <div className="win-modal" onClick={e => e.stopPropagation()}
        style={{ border: `2px solid ${rc.border}`, boxShadow: `0 0 60px ${rc.glow}` }}>
        <div className="win-label" style={{ color: rc.text }}>YOU WON</div>
        <img src={item.itemimage} alt={item.itemname} className="win-img" />
        <div className="win-name" style={{ color: rc.text }}>{item.itemname}</div>
        <div className="win-value"><GEM />{fmt(item.itemvalue)} gems</div>
        <div className="win-rarity" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
          <RarityBadge rarity={item.rarity} size={16} />{item.rarity.toUpperCase()}
        </div>
        <button className="win-close-btn" onClick={onClose}>Continue →</button>
      </div>
    </div>
  );
}

// ── Case open modal ───────────────────────────────────────────────────────────
function CaseOpenModal({ caseDoc, onClose, onWin }) {
  const { userData, setUserData } = useContext(UserContext);
  const { setModalState } = useModal();
  const [phase, setPhase] = useState("idle"); // idle | rolling | won
  const [wonItem, setWonItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (!userData) { setModalState(<LoginModal />); return; }
    if (loading || phase === "rolling") return;
    setLoading(true);

    try {
      const res = await fetch(`${api}/cases/${caseDoc._id}/open`, {
        method: "POST",
        headers: { authorization: `Bearer ${getauth()}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message || "Failed to open case"); setLoading(false); return; }

      setWonItem(data.data.wonItem);
      setPhase("rolling");
      setLoading(false);

      // Update user balance
      if (setUserData && data.data.newBalance !== undefined) {
        setUserData(prev => prev ? { ...prev, balance: data.data.newBalance } : prev);
      }
    } catch (e) {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  const handleReelDone = () => setPhase("won");

  const canOpen = userData && userData.balance >= caseDoc.cost;

  return (
    <div className="case-open-overlay" onClick={onClose}>
      <div className="case-open-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-x" onClick={onClose}>✕</button>
        <div className="case-open-header">
          <img src={caseDoc.image} alt={caseDoc.name} className="case-open-img" />
          <div>
            <div className="case-open-title">{caseDoc.name}</div>
            <div className="case-open-cost"><GEM />{fmt(caseDoc.cost)} gems</div>
          </div>
        </div>

        {/* Reel */}
        {(phase === "rolling" || phase === "won") && wonItem && (
          <CaseReel
            items={caseDoc.items}
            wonItem={wonItem}
            rolling={phase === "rolling"}
            onDone={handleReelDone}
          />
        )}

        {/* Items in case */}
        {phase === "idle" && (
          <div className="case-items-preview">
            <div className="preview-label">Items in this case</div>
            <div className="preview-grid">
              {caseDoc.items.map((item, i) => (
                <ItemCard key={i} item={item} small />
              ))}
            </div>
          </div>
        )}

        {/* Open button */}
        <div className="case-open-actions">
          <button
            className={`open-btn ${!canOpen ? "disabled" : ""} ${loading ? "loading" : ""}`}
            onClick={handleOpen}
            disabled={loading || phase === "rolling" || (userData && !canOpen)}
          >
            {loading ? "Opening…" :
             phase === "rolling" ? "Rolling…" :
             !userData ? "Login to Open" :
             !canOpen ? `Need ${fmt(caseDoc.cost)} gems` :
             `Open for ${fmt(caseDoc.cost)} gems`}
          </button>
          {userData && canOpen && phase === "idle" && (
            <div className="balance-hint">Balance: <GEM />{fmt(userData.balance)}</div>
          )}
        </div>

        {phase === "won" && wonItem && <WinModal item={wonItem} onClose={onClose} />}
      </div>
    </div>
  );
}

// ── Main Cases Page ───────────────────────────────────────────────────────────
export default function CasesPage() {
  const [caseList, setCaseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [liveOpens, setLiveOpens] = useState([]);
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${api}/cases`)
      .then(r => r.json())
      .then(d => { if (d.success) setCaseList(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch(`${api}/cases/history`)
      .then(r => r.json())
      .then(d => { if (d.success) setLiveOpens(d.data.slice(0, 20)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onOpen = (data) => {
      setLiveOpens(prev => [data, ...prev].slice(0, 20));
    };
    socket.on("CASE_OPEN", onOpen);
    return () => socket.off("CASE_OPEN", onOpen);
  }, [socket]);

  return (
    <div className="cases-page">
      {/* ── Hero banner ── */}
      <div className="cases-hero">
        <img src="/images/cases/hero-banner.jpg" alt="" className="cases-hero-banner" />
        <div className="cases-hero-bg" />
        <div className="cases-hero-content">
          <div className="cases-hero-eyebrow">✨ NEW GAME ✨</div>
          <h1 className="cases-hero-title">
            <span className="cases-hero-title-accent">PS99</span> Cases
          </h1>
          <p className="cases-hero-sub">Spend gems. Spin the reel. Win rare items.</p>
          <div className="cases-hero-rarities">
            {Object.keys(RARITY_COLORS).map((r) => (
              <div key={r} className="cases-hero-rarity-chip" style={{ borderColor: RARITY_COLORS[r].border, background: RARITY_COLORS[r].bg }}>
                <RarityBadge rarity={r} size={18} />
                <span style={{ color: RARITY_COLORS[r].text }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cases-body">
        {/* ── Live feed ── */}
        {liveOpens.length > 0 && (
          <div className="cases-live-feed">
            <div className="live-dot" /><span className="live-label">Live Opens</span>
            <div className="live-items">
              {liveOpens.map((open, i) => {
                const rc = RARITY_COLORS[open.itemWon?.rarity] || RARITY_COLORS.common;
                return (
                  <div key={i} className="live-item" style={{ borderColor: rc.border }}>
                    {open.thumbnail && <img src={open.thumbnail} alt="" className="live-avatar" />}
                    <span className="live-user">{open.username || open.user}</span>
                    <span className="live-sep">·</span>
                    <RarityBadge rarity={open.itemWon?.rarity} size={13} />
                    <span className="live-won" style={{ color: rc.text }}>{open.itemWon?.itemname}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Cases grid ── */}
        <div className="cases-section-label">Available Cases</div>
        {loading ? (
          <div className="cases-loading">Loading cases…</div>
        ) : caseList.length === 0 ? (
          <div className="cases-empty">No cases available right now. Check back soon!</div>
        ) : (
          <div className="cases-grid">
            {caseList.map(c => (
              <div key={c._id} className="case-card" onClick={() => setSelectedCase(c)}>
                <div className="case-card-img-wrap">
                  <img src={c.image} alt={c.name} className="case-card-img" />
                  <div className="case-card-glow" />
                </div>
                <div className="case-card-body">
                  <div className="case-card-name">{c.name}</div>
                  <div className="case-card-items-row">
                    {c.items.slice(0, 4).map((item, i) => {
                      const rc = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
                      return (
                        <div key={i} className="case-card-preview-item"
                          style={{ border: `1px solid ${rc.border}`, background: rc.bg }}>
                          <img src={item.itemimage} alt={item.itemname} />
                          <img src={rc.icon} alt={item.rarity} className="case-card-preview-rarity" />
                        </div>
                      );
                    })}
                    {c.items.length > 4 && (
                      <div className="case-card-more">+{c.items.length - 4}</div>
                    )}
                  </div>
                  <button className="case-card-btn">
                    <GEM />{fmt(c.cost)} — Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Case open modal ── */}
      {selectedCase && (
        <CaseOpenModal
          caseDoc={selectedCase}
          onClose={() => setSelectedCase(null)}
          onWin={() => {}}
        />
      )}
    </div>
  );
}
