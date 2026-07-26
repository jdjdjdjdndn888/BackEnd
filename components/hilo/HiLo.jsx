import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import { formatLargeNumber } from "../../utils/value";
import { useSeo } from "../../utils/useSeo";
import "./hilo.css";

function newOpId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function money(v) { return formatLargeNumber(Math.max(0, Math.floor(Number(v) || 0))); }

const CARD_LABELS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const CARD_SUITS  = ["♠","♥","♦","♣"];
const isRed = (card) => { const s = Math.floor(card / 13); return s === 1 || s === 2; };
const cardLabel = (card) => CARD_LABELS[card % 13];
const cardSuit  = (card) => CARD_SUITS[Math.floor(card / 13)];

// ── Playing Card ──────────────────────────────────────────────────────────────
function PlayingCard({ card, size = "lg", revealed = true, flipped = false }) {
  if (!revealed || card == null) return (
    <div className={`hl-card hl-card--${size} hl-card--back`}>
      <div className="hl-card-back-pattern" />
    </div>
  );
  const red = isRed(card);
  return (
    <div className={`hl-card hl-card--${size} ${red ? "hl-card--red" : "hl-card--black"} ${flipped ? "hl-card--new" : ""}`}>
      <div className="hl-card-corner hl-card-tl">
        <span className="hl-card-val">{cardLabel(card)}</span>
        <span className="hl-card-suit">{cardSuit(card)}</span>
      </div>
      <div className="hl-card-big-suit">{cardSuit(card)}</div>
      <div className="hl-card-corner hl-card-br">
        <span className="hl-card-val">{cardLabel(card)}</span>
        <span className="hl-card-suit">{cardSuit(card)}</span>
      </div>
    </div>
  );
}

// ── Guess Button ──────────────────────────────────────────────────────────────
function GuessBtn({ label, icon, mult, prob, color, onClick, disabled }) {
  return (
    <button
      className="hl-guess-btn"
      data-guess={label.toLowerCase()}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="hl-guess-icon">{icon}</span>
      <span className="hl-guess-label">{label}</span>
      {mult > 0
        ? <span className="hl-guess-mult">{mult.toFixed(2)}×</span>
        : <span className="hl-guess-mult" style={{ color: "#2a2a3a" }}>—</span>
      }
      {prob > 0 && <span className="hl-guess-prob">{(prob * 100).toFixed(1)}%</span>}
    </button>
  );
}

// ── History Row ───────────────────────────────────────────────────────────────
function HistoryRow({ entry }) {
  const icons = { higher: "↑", lower: "↓", equal: "=" };
  const red = isRed(entry.nextCard);
  return (
    <div className={`hl-hist-entry ${entry.win ? "hl-hist-entry--win" : "hl-hist-entry--loss"}`}>
      <span className="hl-hist-cards">
        <span className={`hl-hist-card ${isRed(entry.card) ? "hl-hist-red" : ""}`}>
          {cardLabel(entry.card)}{cardSuit(entry.card)}
        </span>
        <span className="hl-hist-arrow">{icons[entry.guess]}</span>
        <span className={`hl-hist-card ${red ? "hl-hist-red" : ""}`}>
          {cardLabel(entry.nextCard)}{cardSuit(entry.nextCard)}
        </span>
      </span>
      <span className="hl-hist-result">
        {entry.win
          ? <span className="hl-hist-win">{entry.roundMultiplier?.toFixed(2)}×</span>
          : <span className="hl-hist-loss">bust</span>
        }
      </span>
    </div>
  );
}

export default function HiLo() {
  useSeo({ title: "HiLo | GemTide", description: "Play HiLo card prediction at GemTide.", path: "/hilo" });
  const { userData } = useContext(UserContext);
  const navigate = useNavigate();

  const [wallet, setWallet]   = useState({ balance: 0 });
  const [game, setGame]       = useState(null);
  const [history, setHistory] = useState([]);
  const [bet, setBet]         = useState("1m");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [newCard, setNewCard] = useState(false); // trigger animation

  const authHdr = useCallback(() => ({ Authorization: `Bearer ${getauth()}` }), []);
  const jsonHdr = useCallback(() => ({ ...authHdr(), "Content-Type": "application/json" }), [authHdr]);

  const fetchAll = useCallback(async () => {
    try {
      const [wRes, gRes, hRes] = await Promise.all([
        fetch(`${api}/normal-wallet`, { headers: authHdr() }),
        fetch(`${api}/hilo/current`,  { headers: authHdr() }),
        fetch(`${api}/hilo/history`,  { headers: authHdr() }),
      ]);
      if (wRes.ok) { const d = await wRes.json(); setWallet(d.wallet || { balance: 0 }); }
      if (gRes.ok) { const d = await gRes.json(); setGame(d.data); }
      if (hRes.ok) { const d = await hRes.json(); setHistory(d.data || []); }
    } catch {}
    setLoading(false);
  }, [authHdr]);

  useEffect(() => {
    if (!userData) { navigate("/"); return; }
    fetchAll();
  }, [userData, navigate, fetchAll]);

  const refreshWallet = async () => {
    const wRes = await fetch(`${api}/normal-wallet`, { headers: authHdr() });
    if (wRes.ok) { const d = await wRes.json(); setWallet(d.wallet || { balance: 0 }); }
  };

  const handleCreate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(`${api}/hilo/create`, {
        method: "POST",
        headers: jsonHdr(),
        body: JSON.stringify({ bet, operationId: newOpId() }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || "Failed to start."); return; }
      setGame(d.data);
      await refreshWallet();
    } catch { toast.error("Network error."); }
    setBusy(false);
  };

  const handleGuess = async (guess) => {
    if (busy || !game) return;
    setBusy(true);
    try {
      const r = await fetch(`${api}/hilo/guess`, {
        method: "POST",
        headers: jsonHdr(),
        body: JSON.stringify({ guess }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || "Failed."); setBusy(false); return; }
      setNewCard(true);
      setTimeout(() => setNewCard(false), 400);
      setGame(d.data);
      if (d.data.status === "cashed_out") {
        toast.success(`🎉 Won ${money(d.data.payout)} credits!`);
        setHistory(h => [d.data, ...h.slice(0, 19)]);
        await refreshWallet();
      } else if (d.data.status === "busted") {
        toast.error("❌ Wrong guess! Better luck next time.");
        setHistory(h => [d.data, ...h.slice(0, 19)]);
      }
    } catch { toast.error("Network error."); }
    setBusy(false);
  };

  const handleCashout = async () => {
    if (busy || !game) return;
    setBusy(true);
    try {
      const r = await fetch(`${api}/hilo/cashout`, {
        method: "POST",
        headers: jsonHdr(),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || "Failed."); setBusy(false); return; }
      setGame(d.data);
      toast.success(`🎉 Cashed out ${money(d.data.payout)} credits at ${d.data.multiplierAtEnd?.toFixed(2)}×!`);
      setHistory(h => [d.data, ...h.slice(0, 19)]);
      await refreshWallet();
    } catch { toast.error("Network error."); }
    setBusy(false);
  };

  const handleNewGame = () => setGame(null);

  const isActive    = game?.status === "active";
  const isBusted    = game?.status === "busted";
  const isCashedOut = game?.status === "cashed_out";
  const odds        = game?.odds || {};
  const cumMult     = game?.cumulativeMultiplier ?? 1.0;

  if (loading) return (
    <div className="hl-page">
      <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Loading…</div>
    </div>
  );

  return (
    <div className="hl-page">
      {/* Top bar */}
      <div className="hl-topbar">
        <div className="hl-brand">
          <b>🃏 HiLo</b>
          <small>Predict higher, lower, or equal — cashout anytime</small>
        </div>
        <div className="hl-wallet-mini">
          <span>Credits</span>
          <strong>{money(wallet.balance)}</strong>
          <button className="hl-exchange-btn" onClick={() => navigate("/normal-wallet")}>Exchange</button>
        </div>
      </div>

      <div className="hl-layout">
        {/* ── Controls ── */}
        <div className="hl-controls">
          {!isActive ? (
            <>
              <label className="hl-label">Bet Amount</label>
              <input
                className="hl-input"
                value={bet}
                onChange={e => setBet(e.target.value)}
                placeholder="e.g. 1m"
                disabled={busy}
              />
              <div className="hl-quick-bets">
                {["1m","5m","10m","50m","100m","500m"].map(v => (
                  <button key={v} className="hl-quick" onClick={() => setBet(v)} disabled={busy}>{v}</button>
                ))}
              </div>

              <div className="hl-info-box" style={{ marginTop: 14 }}>
                <div className="hl-info-row"><span>House edge</span><strong>4%</strong></div>
                <div className="hl-info-row"><span>Deck size</span><strong>52 cards</strong></div>
                <div className="hl-info-row"><span>Equal pays</span><strong>~16×</strong></div>
              </div>

              <button className="hl-btn hl-btn--start" onClick={handleCreate} disabled={busy}>
                {busy ? "Starting…" : "Deal Cards"}
              </button>
            </>
          ) : (
            <>
              <div className="hl-live-info">
                <div className="hl-info-row"><span>Bet</span><strong>{money(game.bet)} cr</strong></div>
                <div className="hl-info-row"><span>Round</span><strong>#{game.round + 1}</strong></div>
                <div className="hl-info-row"><span>Multiplier</span>
                  <strong className="hl-mult-live">{cumMult.toFixed(3)}×</strong>
                </div>
                <div className="hl-info-row"><span>Cashout</span>
                  <strong className="hl-payout-live">{money(Math.floor(game.bet * cumMult))}</strong>
                </div>
              </div>
              {game.round > 0 && (
                <button className="hl-btn hl-btn--cashout" onClick={handleCashout} disabled={busy}>
                  💰 Cashout {money(Math.floor(game.bet * cumMult))}
                </button>
              )}
            </>
          )}

          {(isBusted || isCashedOut) && (
            <div className={`hl-result ${isBusted ? "hl-result--bust" : "hl-result--win"}`}>
              {isBusted
                ? <>❌ <strong>Wrong!</strong> Lost {money(game.bet)} credits</>
                : <>🎉 <strong>Won!</strong> +{money(game.payout)} ({game.multiplierAtEnd?.toFixed(2)}×)</>
              }
              <button className="hl-btn hl-btn--start" style={{ marginTop: 12 }} onClick={handleNewGame}>
                Play Again
              </button>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="hl-history-list">
              <p className="hl-label" style={{ marginBottom: 6 }}>Recent</p>
              {history.slice(0, 8).map((g, i) => (
                <div key={i} className={`hl-hist-summary ${g.status === "cashed_out" ? "hl-hist-summary--win" : "hl-hist-summary--loss"}`}>
                  <span>{g.round} round{g.round !== 1 ? "s" : ""}</span>
                  <span>{g.status === "cashed_out" ? `+${money(g.payout)}` : `-${money(g.bet)}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Game area ── */}
        <div className="hl-game">
          {/* Multiplier badge — shown when game active */}
          {isActive && (
            <div className="hl-mult-badge">
              <span className="hl-mult-badge-label">Multiplier</span>
              <span className="hl-mult-badge-val">{cumMult.toFixed(3)}×</span>
              <span className="hl-mult-badge-payout">{money(Math.floor(game.bet * cumMult))} cr</span>
            </div>
          )}

          {/* Card display */}
          <div className="hl-card-stage">
            {game ? (
              <>
                {/* Previous card (from last round) */}
                {game.history?.length > 0 && (
                  <div className="hl-prev-card">
                    <PlayingCard card={game.history[game.history.length - 1].card} size="sm" />
                  </div>
                )}
                <div className="hl-current-card">
                  <div className={`hl-card-glow hl-card-glow--${isRed(game.currentCard) ? "red" : "black"}`} />
                  <PlayingCard card={game.currentCard} size="lg" revealed flipped={newCard} />
                </div>
                {/* Suit legend */}
                <div className="hl-suit-legend">
                  <span className="hl-suit-red">♥ ♦ Red</span>
                  <span className="hl-suit-black">♠ ♣ Black</span>
                </div>
              </>
            ) : (
              <div className="hl-card-placeholder">
                <PlayingCard revealed={false} size="lg" />
                <p>Deal cards to start</p>
              </div>
            )}
          </div>

          {/* Guess buttons */}
          {isActive && (
            <div className="hl-guess-row">
              <GuessBtn
                label="Higher"
                icon="↑"
                mult={odds.higher?.multiplier ?? 0}
                prob={odds.higher?.probability ?? 0}
                color="#22c55e"
                onClick={() => handleGuess("higher")}
                disabled={busy}
              />
              <GuessBtn
                label="Equal"
                icon="="
                mult={odds.equal?.multiplier ?? 0}
                prob={odds.equal?.probability ?? 0}
                color="#f59e0b"
                onClick={() => handleGuess("equal")}
                disabled={busy}
              />
              <GuessBtn
                label="Lower"
                icon="↓"
                mult={odds.lower?.multiplier ?? 0}
                prob={odds.lower?.probability ?? 0}
                color="#ef4444"
                onClick={() => handleGuess("lower")}
                disabled={busy}
              />
            </div>
          )}

          {/* Round history */}
          {game?.history?.length > 0 && (
            <div className="hl-round-history">
              <p className="hl-label">Round History</p>
              <div className="hl-round-list">
                {[...game.history].reverse().map((entry, i) => (
                  <HistoryRow key={i} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {/* Bust reveal */}
          {isBusted && game?.history?.length > 0 && (
            <div className="hl-bust-info">
              <span>You guessed </span>
              <strong>{game.history[game.history.length - 1].guess}</strong>
              <span> — card was </span>
              <span className={isRed(game.currentCard) ? "hl-red-text" : ""}>
                {cardLabel(game.currentCard)}{cardSuit(game.currentCard)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
