import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import { formatLargeNumber } from "../../utils/value";
import { useSeo } from "../../utils/useSeo";
import "./towers.css";

const TOWER_ROWS = 8;
const HOUSE_EDGE = 0.97;
const DIFFICULTY_CONFIG = {
  easy:   { cols: 3, bombs: 1, label: "Easy",   color: "#22c55e" },
  medium: { cols: 3, bombs: 2, label: "Medium",  color: "#f59e0b" },
  hard:   { cols: 4, bombs: 3, label: "Hard",    color: "#f97316" },
  expert: { cols: 5, bombs: 4, label: "Expert",  color: "#ef4444" },
};

function newOpId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function money(v) { return formatLargeNumber(Math.max(0, Math.floor(Number(v) || 0))); }

function rowMult(difficulty) {
  const { cols, bombs } = DIFFICULTY_CONFIG[difficulty];
  return (cols / (cols - bombs)) * HOUSE_EDGE;
}
function cumulativeMult(difficulty, rowsCleared) {
  if (rowsCleared <= 0) return 1.0;
  return Math.round(Math.pow(rowMult(difficulty), rowsCleared) * 1000) / 1000;
}

// ── Tile ──────────────────────────────────────────────────────────────────────
function Tile({ state, onClick, disabled }) {
  const clickable = state === "hidden" && !disabled;
  return (
    <button
      className={`tw-tile tw-tile--${state}`}
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      aria-label="Tower tile"
    >
      <span className="tw-tile-inner">
        {state === "gem"       && <img src="/mines-gem.png"  alt="gem"  className="tw-tile-img" />}
        {state === "bomb-hit"  && <img src="/mines-bomb.png" alt="bomb" className="tw-tile-img tw-tile-img--boom" />}
        {state === "bomb-dim"  && <img src="/mines-bomb.png" alt="bomb" className="tw-tile-img tw-tile-img--dim" />}
      </span>
    </button>
  );
}

export default function Towers() {
  useSeo({ title: "Towers | GemTide", description: "Climb the tower in GemTide Towers.", path: "/towers" });
  const { userData } = useContext(UserContext);
  const navigate = useNavigate();

  const [wallet, setWallet]       = useState({ balance: 0 });
  const [game, setGame]           = useState(null);
  const [history, setHistory]     = useState([]);
  const [bet, setBet]             = useState("1m");
  const [difficulty, setDifficulty] = useState("easy");
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const opId = useRef(newOpId());

  const authHdr = useCallback(() => ({ Authorization: `Bearer ${getauth()}` }), []);
  const jsonHdr = useCallback(() => ({ ...authHdr(), "Content-Type": "application/json" }), [authHdr]);

  const fetchAll = useCallback(async () => {
    try {
      const [wRes, gRes, hRes] = await Promise.all([
        fetch(`${api}/normal-wallet`, { headers: authHdr() }),
        fetch(`${api}/towers/current`, { headers: authHdr() }),
        fetch(`${api}/towers/history`, { headers: authHdr() }),
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

  const handleCreate = async () => {
    if (busy) return;
    setBusy(true);
    opId.current = newOpId();
    try {
      const r = await fetch(`${api}/towers/create`, {
        method: "POST",
        headers: jsonHdr(),
        body: JSON.stringify({ bet, difficulty, operationId: opId.current }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || "Failed to start."); return; }
      setGame(d.data);
      const wRes = await fetch(`${api}/normal-wallet`, { headers: authHdr() });
      if (wRes.ok) { const wd = await wRes.json(); setWallet(wd.wallet || { balance: 0 }); }
    } catch { toast.error("Network error."); }
    setBusy(false);
  };

  const handlePick = async (col) => {
    if (busy || !game) return;
    setBusy(true);
    try {
      const r = await fetch(`${api}/towers/pick`, {
        method: "POST",
        headers: jsonHdr(),
        body: JSON.stringify({ col }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || "Failed."); setBusy(false); return; }
      setGame(d.data);
      if (d.data.status === "cashed_out") {
        toast.success(`🎉 Won ${money(d.data.payout)} credits!`);
        setHistory(h => [d.data, ...h.slice(0, 19)]);
        const wRes = await fetch(`${api}/normal-wallet`, { headers: authHdr() });
        if (wRes.ok) { const wd = await wRes.json(); setWallet(wd.wallet || { balance: 0 }); }
      } else if (d.data.status === "busted") {
        toast.error("💥 Hit a bomb! Better luck next time.");
        setHistory(h => [d.data, ...h.slice(0, 19)]);
      }
    } catch { toast.error("Network error."); }
    setBusy(false);
  };

  const handleCashout = async () => {
    if (busy || !game) return;
    setBusy(true);
    try {
      const r = await fetch(`${api}/towers/cashout`, {
        method: "POST",
        headers: jsonHdr(),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d.message || "Failed."); setBusy(false); return; }
      setGame(d.data);
      toast.success(`🎉 Cashed out ${money(d.data.payout)} credits at ${d.data.multiplierAtEnd?.toFixed(2)}×!`);
      setHistory(h => [d.data, ...h.slice(0, 19)]);
      const wRes = await fetch(`${api}/normal-wallet`, { headers: authHdr() });
      if (wRes.ok) { const wd = await wRes.json(); setWallet(wd.wallet || { balance: 0 }); }
    } catch { toast.error("Network error."); }
    setBusy(false);
  };

  const handleNewGame = () => setGame(null);

  const isActive   = game?.status === "active";
  const isBusted   = game?.status === "busted";
  const isCashedOut = game?.status === "cashed_out";
  const rowsCleared = isActive ? (game?.currentRow ?? 0) : (game?.picks?.length ?? 0);
  const currentMult = game ? cumulativeMult(game.difficulty || difficulty, rowsCleared) : 1.0;
  const gameDiff    = game?.difficulty || difficulty;

  // ── Row rendering ──────────────────────────────────────────────────────────
  const renderRow = (rowIdx) => {
    const cfg = DIFFICULTY_CONFIG[gameDiff];
    const cols = game ? DIFFICULTY_CONFIG[game.difficulty].cols : cfg.cols;
    const pick  = game?.picks?.[rowIdx];    // which col player chose (may be undefined)
    const bombs = game?.rows?.[rowIdx];     // bomb indices (null = hidden)
    const isPast    = game && rowIdx < (isActive ? game.currentRow : game.picks?.length - 1);
    const isCurrent = game && isActive && rowIdx === game.currentRow;
    const isBustedRow = isBusted && rowIdx === (game.picks?.length ?? 1) - 1;
    const isRevealed  = isPast || isCashedOut || isBustedRow;

    const rowStatus = isCurrent ? "active" : isPast || isRevealed ? "done" : "locked";

    const mult = cumulativeMult(gameDiff, rowIdx + 1);

    return (
      <div key={rowIdx} className={`tw-row tw-row--${rowStatus}`}>
        <span className="tw-row-mult">{mult.toFixed(2)}×</span>
        <div className="tw-row-tiles">
          {Array.from({ length: cols }, (_, colIdx) => {
            const isPickedCol = pick !== undefined && pick === colIdx;
            const isBombCol   = bombs && bombs.includes(colIdx);
            let state = "hidden";

            if (isCurrent) {
              state = "hidden"; // clickable
            } else if (isBustedRow) {
              if (isPickedCol && isBombCol) state = "bomb-hit";
              else if (isBombCol) state = "bomb-dim";
              else state = "safe-dim";
            } else if (isRevealed || isPast) {
              if (isPickedCol) state = "gem";
              else if (isBombCol) state = "bomb-dim";
              else state = "safe-dim";
            } else {
              state = "locked";
            }

            return (
              <Tile
                key={colIdx}
                state={state}
                onClick={() => handlePick(colIdx)}
                disabled={!isCurrent || busy}
              />
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="tw-page">
      <div style={{ color: "#555", textAlign: "center", padding: 60 }}>Loading…</div>
    </div>
  );

  return (
    <div className="tw-page">
      {/* ── Top bar ── */}
      <div className="tw-topbar">
        <div className="tw-brand">
          <b>🗼 Towers</b>
          <small>Climb to the top, cashout anytime</small>
        </div>
        <div className="tw-wallet-mini">
          <span>Credits</span>
          <strong>{money(wallet.balance)}</strong>
          <button className="tw-exchange-btn" onClick={() => navigate("/normal-wallet")}>Exchange</button>
        </div>
      </div>

      <div className="tw-layout">
        {/* ── Controls ── */}
        <div className="tw-controls">
          {(!game || !isActive) ? (
            <>
              <label className="tw-label">Bet Amount</label>
              <div className="tw-bet-row">
                <input
                  className="tw-input"
                  value={bet}
                  onChange={e => setBet(e.target.value)}
                  placeholder="e.g. 1m"
                  disabled={busy}
                />
              </div>
              <div className="tw-quick-bets">
                {["1m", "5m", "10m", "50m", "100m", "500m"].map(v => (
                  <button key={v} className="tw-quick" onClick={() => setBet(v)} disabled={busy}>{v}</button>
                ))}
              </div>

              <label className="tw-label" style={{ marginTop: 18 }}>Difficulty</label>
              <div className="tw-diff-grid">
                {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    className={`tw-diff-btn ${difficulty === key ? "tw-diff-btn--active" : ""}`}
                    style={difficulty === key ? { borderColor: cfg.color, color: cfg.color } : {}}
                    onClick={() => setDifficulty(key)}
                    disabled={busy}
                  >
                    <span>{cfg.label}</span>
                    <span className="tw-diff-meta">{rowMult(key).toFixed(2)}× / row</span>
                    <span className="tw-diff-risk" style={{ color: cfg.color }}>
                      {cfg.bombs}/{cfg.cols} bombs
                    </span>
                  </button>
                ))}
              </div>

              <div className="tw-info-box" style={{ marginTop: 18 }}>
                <div className="tw-info-row">
                  <span>Max payout ({TOWER_ROWS} rows)</span>
                  <strong>{cumulativeMult(difficulty, TOWER_ROWS).toFixed(2)}×</strong>
                </div>
                <div className="tw-info-row">
                  <span>House edge</span>
                  <strong>3% / row</strong>
                </div>
              </div>

              <button
                className="tw-btn tw-btn--start"
                onClick={handleCreate}
                disabled={busy}
              >
                {busy ? "Starting…" : "Start Climbing"}
              </button>
            </>
          ) : (
            <>
              <div className="tw-live-info">
                <div className="tw-live-row">
                  <span>Difficulty</span>
                  <strong style={{ color: DIFFICULTY_CONFIG[game.difficulty]?.color }}>
                    {DIFFICULTY_CONFIG[game.difficulty]?.label}
                  </strong>
                </div>
                <div className="tw-live-row">
                  <span>Bet</span>
                  <strong>{money(game.bet)} credits</strong>
                </div>
                <div className="tw-live-row">
                  <span>Row</span>
                  <strong>{game.currentRow} / {TOWER_ROWS}</strong>
                </div>
                <div className="tw-live-row">
                  <span>Current mult</span>
                  <strong className="tw-mult-live">{currentMult.toFixed(3)}×</strong>
                </div>
                <div className="tw-live-row">
                  <span>Current payout</span>
                  <strong>{money(Math.floor(game.bet * currentMult))} credits</strong>
                </div>
                <div className="tw-live-row">
                  <span>Next row mult</span>
                  <strong>{cumulativeMult(game.difficulty, game.currentRow + 1).toFixed(3)}×</strong>
                </div>
              </div>
              {game.currentRow > 0 && (
                <button className="tw-btn tw-btn--cashout" onClick={handleCashout} disabled={busy}>
                  💰 Cashout {money(Math.floor(game.bet * currentMult))}
                </button>
              )}
            </>
          )}

          {(isBusted || isCashedOut) && (
            <div className={`tw-result ${isBusted ? "tw-result--bust" : "tw-result--win"}`}>
              {isBusted
                ? <>💥 <strong>Busted!</strong> Lost {money(game.bet)} credits</>
                : <>🎉 <strong>Won!</strong> +{money(game.payout)} credits ({game.multiplierAtEnd?.toFixed(2)}×)</>
              }
              <button className="tw-btn tw-btn--start" style={{ marginTop: 12 }} onClick={handleNewGame}>Play Again</button>
            </div>
          )}

          {/* ── History ── */}
          {history.length > 0 && (
            <div className="tw-history">
              <p className="tw-label">Recent Games</p>
              {history.slice(0, 8).map((g, i) => (
                <div key={i} className={`tw-hist-row ${g.status === "cashed_out" ? "tw-hist-row--win" : "tw-hist-row--loss"}`}>
                  <span>{DIFFICULTY_CONFIG[g.difficulty]?.label}</span>
                  <span>Row {g.picks?.length ?? 0}</span>
                  <span>{g.status === "cashed_out" ? `+${money(g.payout)}` : `-${money(g.bet)}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tower grid ── */}
        <div className="tw-tower-wrap">
          <div className="tw-tower">
            {/* Rows displayed top→bottom: row 7 (top of tower) to row 0 (bottom) */}
            {Array.from({ length: TOWER_ROWS }, (_, i) => TOWER_ROWS - 1 - i).map(rowIdx => (
              <div key={rowIdx} className="tw-row-container">
                <span className="tw-row-num">{rowIdx + 1}</span>
                {renderRow(rowIdx)}
              </div>
            ))}
          </div>
          {!game && (
            <div className="tw-no-game">
              <span>Start a game to climb the tower</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
