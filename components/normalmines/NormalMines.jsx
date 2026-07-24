import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { TrendingUp, WalletCards } from "lucide-react";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import { formatLargeNumber } from "../../utils/value";
import { useSeo } from "../../utils/useSeo";
import "./normalmines.css";

const GRID_SIZE = 25;
const COMPACT_UNITS = { k: 1_000, m: 1_000_000, b: 1_000_000_000, t: 1_000_000_000_000 };
const MINE_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 20];
const HOUSE_EDGE = 0.99;

function operationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function money(v) { return formatLargeNumber(Math.max(0, Math.floor(Number(v) || 0))); }

function parseCompact(raw) {
  const input = typeof raw === "string" ? raw.trim().toLowerCase().replaceAll(",", "") : raw;
  const match = typeof input === "string" ? input.match(/^(\d+(?:\.\d+)?)([kmbt]?)$/) : null;
  const value = match ? Number(match[1]) * (COMPACT_UNITS[match[2]] || 1) : Number(input);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

/** Mirror of the backend formula (HOUSE_EDGE applied). */
function computeMultiplier(mineCount, safeReveals) {
  if (safeReveals <= 0) return 1.0;
  let mult = 1.0;
  for (let k = 0; k < safeReveals; k++) {
    const remaining     = GRID_SIZE - k;
    const remainingSafe = GRID_SIZE - mineCount - k;
    if (remainingSafe <= 0) break;
    mult *= remaining / remainingSafe;
  }
  return Math.round(mult * HOUSE_EDGE * 1e4) / 1e4;
}

/** Next-reveal multiplier (what you'd get after the next safe tile). */
function nextMultiplier(mineCount, safeReveals) {
  return computeMultiplier(mineCount, safeReveals + 1);
}

function Tile({ index, state, onClick, disabled }) {
  return (
    <button
      className={`nm-tile nm-tile--${state}`}
      onClick={() => onClick(index)}
      disabled={disabled || state !== "hidden"}
      aria-label={`Tile ${index + 1}`}
    >
      <span className="nm-tile-inner">
        {state === "safe"          && <img src="/mines-gem.png"  alt="gem"  className="nm-tile-img" />}
        {state === "mine"          && <img src="/mines-bomb.png" alt="bomb" className="nm-tile-img nm-tile-img--boom" />}
        {state === "mine-revealed" && <img src="/mines-bomb.png" alt="bomb" className="nm-tile-img nm-tile-img--dim" />}
      </span>
    </button>
  );
}

export default function NormalMines() {
  useSeo({ title: "Normal Mines | GemTide", description: "Play GemTide normal mines with your item-backed wallet.", path: "/normal-mines" });
  const { userData } = useContext(UserContext);
  const navigate = useNavigate();

  const [wallet, setWallet]     = useState({ balance: 0 });
  const [game, setGame]         = useState(null);
  const [history, setHistory]   = useState([]);
  const [bet, setBet]           = useState("1m");
  const [mineCount, setMineCount] = useState(3);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [bustedIdx, setBustedIdx] = useState(null);

  const authHeaders = useCallback(() => ({
    authorization: `Bearer ${getauth()}`,
    "content-type": "application/json",
  }), []);

  const request = useCallback(async (path, options = {}) => {
    const res  = await fetch(`${api}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || "Something went wrong.");
    return body;
  }, [authHeaders]);

  const refresh = useCallback(async () => {
    if (!getauth()) { setLoading(false); return; }
    try {
      const [walletRes, currentRes, historyRes] = await Promise.all([
        request("/normal-wallet"),
        request("/normal-mines/current"),
        request("/normal-mines/history"),
      ]);
      setWallet(walletRes.data || { balance: 0 });
      if (currentRes.data) setGame(currentRes.data);
      setHistory(historyRes.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { refresh(); }, [refresh, userData?.userid]);

  const betValue   = parseCompact(bet);
  const loginPrompt = !getauth();

  const safeReveals     = game?.revealed?.length ?? 0;
  const currentMult     = game ? computeMultiplier(game.mineCount, safeReveals) : 1;
  const nextMult        = game ? nextMultiplier(game.mineCount, safeReveals) : 1;
  const currentPayout   = game ? Math.floor(game.bet * currentMult) : 0;
  const isActive        = game?.status === "active";

  // Build tile states
  const tileStates = Array.from({ length: GRID_SIZE }, (_, i) => {
    if (!game) return "hidden";
    if (game.status !== "active") {
      // Game over — show everything
      if (game.grid?.includes(i)) return "mine";
      if (game.revealed?.includes(i)) return "safe";
      return "hidden";
    }
    if (game.revealed?.includes(i)) return "safe";
    return "hidden";
  });

  const startGame = async () => {
    if (!betValue) return toast.error("Enter a valid bet.");
    if (betValue > wallet.balance) return toast.error("Not enough normal wallet credits.");
    setBusy(true);
    setBustedIdx(null);
    try {
      const res = await request("/normal-mines/create", {
        method: "POST",
        body: JSON.stringify({ operationId: operationId(), bet: betValue, mineCount }),
      });
      setGame(res.data);
      setWallet((w) => ({ ...w, balance: Math.max(0, w.balance - betValue) }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const revealTile = async (index) => {
    if (!isActive || busy) return;
    setBusy(true);
    try {
      const res = await request("/normal-mines/reveal", {
        method: "POST",
        body: JSON.stringify({ tileIndex: index }),
      });
      const updated = res.data;
      setGame(updated);
      if (updated.status === "busted") {
        setBustedIdx(index);
        toast.error(`💥 Mine! You lost ${money(updated.bet)} credits.`);
        setTimeout(() => { refresh(); }, 1800);
      } else if (updated.status === "cashed_out") {
        // Auto-cashed (all safe tiles cleared)
        toast.success(`🎉 All mines avoided! You won ${money(updated.payout)} credits.`);
        setTimeout(() => { refresh(); setGame(null); }, 1800);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cashout = async () => {
    if (!isActive || busy || safeReveals === 0) return;
    setBusy(true);
    try {
      const res = await request("/normal-mines/cashout", { method: "POST" });
      const updated = res.data;
      toast.success(`💰 Cashed out ${money(updated.payout)} credits! (${updated.multiplierAtEnd?.toFixed(4)}×)`);
      setGame(null);
      setTimeout(() => { refresh(); }, 600);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const newGame = () => { setGame(null); setBustedIdx(null); refresh(); };

  return (
    <div className="nm-page">
      {/* Top bar */}
      <div className="nm-topbar">
        <div className="nm-brand">
          <Bomb size={18} style={{ color: "#8b5cf6" }} />
          <b>Normal Mines</b>
          <small>Player vs House</small>
        </div>
        <div className="nm-wallet-mini">
          <WalletCards size={13} style={{ color: "#8b5cf6" }} />
          <strong>{money(wallet.balance)}</strong>
          <span>credits</span>
          <button className="nm-exchange-btn" onClick={() => navigate("/normal-wallet")}>Exchange</button>
        </div>
      </div>

      {loginPrompt ? (
        <div className="nm-login-prompt">Log in to play Normal Mines.</div>
      ) : loading ? (
        <div className="nm-loading">Loading…</div>
      ) : (
        <div className="nm-layout">
          {/* Left — controls */}
          <aside className="nm-sidebar">
            {!isActive ? (
              <>
                {/* Bet */}
                <div className="nm-control-group">
                  <label>Bet Amount</label>
                  <div className="nm-bet-row">
                    <input
                      value={bet}
                      onChange={(e) => setBet(e.target.value)}
                      placeholder="e.g. 1m"
                      className="nm-input"
                      disabled={busy}
                    />
                    <span className="nm-bet-parsed">{betValue ? money(betValue) : "—"}</span>
                  </div>
                  <div className="nm-quick-bets">
                    {["100k","1m","10m","100m","1b"].map((v) => (
                      <button key={v} className="nm-quick" onClick={() => setBet(v)} disabled={busy}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* Mine count */}
                <div className="nm-control-group">
                  <label>Mines <span className="nm-mine-count-badge">{mineCount}</span></label>
                  <div className="nm-mine-options">
                    {MINE_OPTIONS.map((n) => (
                      <button key={n} className={`nm-mine-opt ${mineCount === n ? "nm-mine-opt--on" : ""}`}
                        onClick={() => setMineCount(n)} disabled={busy}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="nm-mine-hint">
                    More mines → higher multipliers per tile, but much riskier.
                  </p>
                </div>

                {/* Multiplier preview */}
                <div className="nm-mult-preview">
                  <div>
                    <span>1st safe tile</span>
                    <b>{nextMultiplier(mineCount, 0).toFixed(4)}×</b>
                  </div>
                  <div>
                    <span>2nd safe tile</span>
                    <b>{nextMultiplier(mineCount, 1).toFixed(4)}×</b>
                  </div>
                  <div>
                    <span>3 tiles</span>
                    <b>{computeMultiplier(mineCount, 3).toFixed(4)}×</b>
                  </div>
                  <div>
                    <span>5 tiles</span>
                    <b>{computeMultiplier(mineCount, 5).toFixed(4)}×</b>
                  </div>
                </div>

                <button className="nm-start-btn" onClick={startGame} disabled={busy || !betValue || betValue > wallet.balance}>
                  {busy ? "Starting…" : "Start Game"}
                </button>
              </>
            ) : (
              <>
                {/* Active game stats */}
                <div className="nm-active-stats">
                  <div className="nm-stat">
                    <span>Bet</span>
                    <b>{money(game.bet)}</b>
                  </div>
                  <div className="nm-stat">
                    <span>Mines</span>
                    <b>{game.mineCount}</b>
                  </div>
                  <div className="nm-stat nm-stat--highlight">
                    <span>Multiplier</span>
                    <b>{currentMult.toFixed(4)}×</b>
                  </div>
                  <div className="nm-stat nm-stat--highlight">
                    <span>Cash Out</span>
                    <b>{money(currentPayout)}</b>
                  </div>
                  <div className="nm-stat nm-stat--next">
                    <span>Next tile</span>
                    <b>{nextMult.toFixed(4)}×</b>
                    <small>if safe</small>
                  </div>
                  <div className="nm-stat">
                    <span>Safe revealed</span>
                    <b>{safeReveals} / {GRID_SIZE - game.mineCount}</b>
                  </div>
                </div>

                <button
                  className={`nm-cashout-btn ${safeReveals === 0 ? "nm-cashout-btn--disabled" : ""}`}
                  onClick={cashout}
                  disabled={busy || safeReveals === 0}
                >
                  {safeReveals === 0 ? "Reveal a tile first" : `Cash Out  ${money(currentPayout)}`}
                </button>
              </>
            )}

            {/* Game over */}
            {game && !isActive && (
              <div className={`nm-result ${game.status === "cashed_out" ? "nm-result--win" : "nm-result--loss"}`}>
                <span>{game.status === "cashed_out" ? "🎉 Win" : "💥 Busted"}</span>
                <b>{game.status === "cashed_out" ? `+${money(game.payout - game.bet)}` : `-${money(game.bet)}`}</b>
                <small>{game.multiplierAtEnd?.toFixed(4)}× · {game.revealed?.length} tile{game.revealed?.length !== 1 ? "s" : ""} revealed</small>
                <button className="nm-new-btn" onClick={newGame}>New Game</button>
              </div>
            )}
          </aside>

          {/* Right — grid */}
          <div className="nm-grid-wrap">
            <div className="nm-grid">
              {Array.from({ length: GRID_SIZE }, (_, i) => (
                <Tile
                  key={i}
                  index={i}
                  state={tileStates[i]}
                  onClick={revealTile}
                  disabled={!isActive || busy}
                />
              ))}
            </div>
            {!isActive && !loading && !game && (
              <div className="nm-grid-overlay">
                <Bomb size={40} style={{ color: "#8b5cf6", opacity: 0.5 }} />
                <span>Set your bet and start a game</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="nm-history">
          <div className="nm-history-head">
            <TrendingUp size={14} /> <span>Recent games</span>
          </div>
          <div className="nm-history-list">
            {history.slice(0, 10).map((h) => (
              <div key={h._id} className={`nm-history-row ${h.status === "cashed_out" ? "nm-history-row--win" : "nm-history-row--loss"}`}>
                <span>{h.status === "cashed_out" ? "Win" : "Bust"}</span>
                <span>{h.mineCount} mines</span>
                <span>{h.revealed?.length ?? 0} tiles</span>
                <span>{h.multiplierAtEnd?.toFixed(4)}×</span>
                <b>{h.status === "cashed_out" ? `+${money(h.payout - h.bet)}` : `-${money(h.bet)}`}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
