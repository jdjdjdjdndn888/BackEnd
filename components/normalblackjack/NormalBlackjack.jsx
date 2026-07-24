import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Coins, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import { formatLargeNumber } from "../../utils/value";
import { useSeo } from "../../utils/useSeo";
import tableArt from "../../attached_assets/image_1784821751710.png";
import "./normalblackjack.css";

const COMPACT_UNITS = { k: 1_000, m: 1_000_000, b: 1_000_000_000, t: 1_000_000_000_000 };

function operationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function money(value) {
  return formatLargeNumber(Math.max(0, Math.floor(Number(value) || 0)));
}

function parseCompactAmount(raw) {
  const input = typeof raw === "string" ? raw.trim().toLowerCase().replaceAll(",", "") : raw;
  const match = typeof input === "string" ? input.match(/^(\d+(?:\.\d+)?)([kmbt]?)$/) : null;
  const value = match ? Number(match[1]) * (COMPACT_UNITS[match[2]] || 1) : Number(input);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function Card({ card, hidden = false }) {
  if (hidden || card?.hidden) return <div className="normal-bj-card normal-bj-card--hidden"><span>?</span></div>;
  const red = card?.suit === "♥" || card?.suit === "♦";
  return <div className={`normal-bj-card ${red ? "normal-bj-card--red" : ""}`}><strong>{card?.rank}</strong><span>{card?.suit}</span></div>;
}

export default function NormalBlackjack() {
  useSeo({ title: "Normal Blackjack | GemTide", description: "Play GemTide normal blackjack with a separate item-backed wallet.", path: "/normal-blackjack" });
  const { userData } = useContext(UserContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState("play");
  const [wallet, setWallet] = useState({ balance: 0 });
  const [game, setGame] = useState(null);
  const [history, setHistory] = useState([]);
  const [bet, setBet] = useState("1m");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("The dealer is ready.");

  const authHeaders = useCallback(() => ({ authorization: `Bearer ${getauth()}`, "content-type": "application/json" }), []);
  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${api}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Something went wrong.");
    return body;
  }, [authHeaders]);

  const refresh = useCallback(async () => {
    if (!getauth()) { setLoading(false); return; }
    try {
      const [walletRes, currentRes, historyRes] = await Promise.all([
        request("/normal-wallet"),
        request("/normal-blackjack/current"),
        request("/normal-blackjack/history"),
      ]);
      setWallet(walletRes.data || { balance: 0 });
      setGame(currentRes.data || null);
      setHistory(historyRes.data || []);
      if (currentRes.data) setMessage("Your move, player.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { refresh(); }, [refresh, userData?.userid]);

  const currentHand = game?.playerHands?.[game.activeHand || 0];
  const betValue = parseCompactAmount(bet);
  const loginPrompt = !getauth();

  const startGame = async () => {
    if (!betValue || betValue > wallet.balance) return toast.error("Enter a valid wager within your normal wallet.");
    setBusy(true); setMessage("The dealer is shuffling the shoe...");
    try {
      const result = await request("/normal-blackjack/create", { method: "POST", body: JSON.stringify({ bet, operationId: operationId(), clientSeed: operationId() }) });
      setGame(result.data); setMessage(result.data?.status === "finished" ? "The dealer has dealt a natural hand." : "Your move, player."); await refresh();
    } catch (error) { setMessage("The dealer pauses."); toast.error(error.message); } finally { setBusy(false); }
  };

  const action = async (name) => {
    if (!game) return;
    setBusy(true); setMessage(name === "hit" ? "The dealer slides you another card..." : "The dealer nods and checks the table...");
    try {
      const result = await request("/normal-blackjack/action", { method: "POST", body: JSON.stringify({ gameId: game._id, action: name }) });
      setGame(result.data); setMessage(result.data.status === "finished" ? "The dealer has finished the hand." : "Your move, player."); await refresh();
    } catch (error) { toast.error(error.message); setMessage("The dealer waits for a valid move."); } finally { setBusy(false); }
  };

  return (
    <div className="normal-bj-page">
      <header className="normal-bj-topbar">
        <div className="normal-bj-brand"><span className="normal-bj-mark">GT</span><div><b>Normal Blackjack</b><small>Player versus dealer</small></div></div>
        <div className="normal-bj-wallet-mini">
          <WalletCards size={13} style={{ color: "#8b5cf6" }} />
          <small>Normal wallet</small>
          <strong>{money(wallet.balance)}</strong>
          <span>credits</span>
          <button className="normal-bj-exchange-btn" onClick={() => navigate("/normal-wallet")}>Exchange</button>
        </div>
      </header>

      <section className="normal-bj-full-table" aria-label="Normal blackjack table">
        <img src={tableArt} alt="" className="normal-bj-table-art" />
        <div className="normal-bj-table-vignette" />
        <div className="normal-bj-no-chip" aria-hidden="true" />
        <div className="normal-bj-status"><span />{message}</div>
        <div className="normal-bj-dealer-hand">
          {game?.dealerHand?.map((card, index) => <Card key={`dealer-${index}-${card.rank}`} card={card} hidden={card.hidden} />)}
          {!game && <><Card hidden /><Card card={{ rank: "K", suit: "♣" }} /></>}
        </div>
        <div className="normal-bj-table-copy">DEALER · MR. TIDE</div>
        <div className="normal-bj-player-panel">
          <div className="normal-bj-player-heading"><span>Your hand</span><b>{currentHand?.total ?? "—"}</b></div>
          <div className="normal-bj-player-cards">
            {currentHand?.cards?.map((card, index) => <Card key={`player-${index}-${card.rank}`} card={card} />)}
            {!currentHand && <span className="normal-bj-awaiting">Place a wager to deal</span>}
          </div>
          {!game && (
            <div className="normal-bj-deal-row">
              <div className="normal-bj-bet-input"><Coins size={15} /><input aria-label="Wager" value={bet} disabled={busy} onChange={(event) => setBet(event.target.value)} placeholder="1m" /><span>credits</span></div>
              <button type="button" className="normal-bj-deal-button" onClick={startGame} disabled={busy || !betValue || betValue > wallet.balance}>Deal</button>
            </div>
          )}
          {game?.status === "active" && <div className="normal-bj-actions"><button type="button" onClick={() => action("hit")} disabled={busy}>Hit</button><button type="button" onClick={() => action("stand")} disabled={busy}>Stand</button></div>}
          {game?.status === "finished" && <button type="button" className="normal-bj-deal-button normal-bj-new-hand" onClick={() => { setGame(null); setMessage("The dealer is ready."); }}>Deal another hand</button>}
        </div>
        <div className="normal-bj-table-footer"><span>{game ? `Wager ${money(game.initialBet)} credits` : "Six-deck shoe · 6:5 blackjack"}</span><span>Dealer hits soft 17</span></div>
      </section>

      <div className="normal-bj-walletbar">
        <div className="normal-bj-wallet-balance"><WalletCards size={17} /><span>Normal wallet</span><strong>{money(wallet.balance)}</strong></div>
        <div className="normal-bj-wallet-note">Separate from your site balance · type 1m, 100m, or a full number to wager</div>
        <button className="normal-bj-exchange-link" type="button" onClick={() => navigate("/normal-wallet")}>Exchange items</button>
        <button className="normal-bj-refresh" type="button" onClick={refresh} disabled={loading}><RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh</button>
      </div>

      {loginPrompt ? <div className="normal-bj-login">Log in to play normal blackjack.</div> : (
        <>
          <nav className="normal-bj-tabs">
            {[["play", "Play blackjack"], ["history", "History"]].map(([key, label]) => (
              <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>
            ))}
          </nav>

          {tab === "play" && <section className="normal-bj-rules-row"><ShieldCheck size={15} /><span>Provably fair six-deck shoe</span><span>Blackjack pays 6:5</span><span>No surrender or cancellation after deal</span></section>}
          {tab === "history" && (
            <section className="normal-bj-panel">
              <div className="normal-bj-panel-heading"><div><span className="normal-bj-eyebrow">TABLE LOG</span><h2>Your recent hands</h2></div></div>
              <div className="normal-bj-history">
                {history.length
                  ? history.map((entry) => (
                      <div key={entry._id}>
                        <span>{new Date(entry.finishedAt || entry.createdAt).toLocaleString()}</span>
                        <b>{entry.outcome}</b>
                        <strong className={entry.payout >= entry.totalBet ? "win" : "loss"}>
                          {entry.payout >= entry.totalBet ? "+" : "-"}{money(Math.abs(entry.payout - entry.totalBet))}
                        </strong>
                      </div>
                    ))
                  : <div className="normal-bj-empty">No completed hands yet.</div>}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
