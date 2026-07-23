import React, { useCallback, useEffect, useMemo, useState, useContext } from "react";
import toast from "react-hot-toast";
import { Coins, RefreshCw, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import { formatLargeNumber } from "../../utils/value";
import { useSeo } from "../../utils/useSeo";
import "./normalblackjack.css";

const BRAND = "#a855f7";
const HOUSE_TAX = 0.08;

function operationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function money(value) {
  return formatLargeNumber(Math.max(0, Math.floor(Number(value) || 0)));
}

function Card({ card, hidden = false }) {
  if (hidden || card?.hidden) {
    return <div className="normal-bj-card normal-bj-card--hidden"><span>?</span></div>;
  }
  const red = card?.suit === "♥" || card?.suit === "♦";
  return (
    <div className={`normal-bj-card ${red ? "normal-bj-card--red" : ""}`}>
      <strong>{card?.rank}</strong>
      <span>{card?.suit}</span>
    </div>
  );
}

function InventoryGrid({ items, selected, onToggle, emptyLabel }) {
  if (!items.length) return <div className="normal-bj-empty">{emptyLabel}</div>;
  return (
    <div className="normal-bj-inventory-grid">
      {items.map((item) => {
        const active = selected.has(String(item.inventoryid));
        return (
          <button
            key={item.inventoryid}
            type="button"
            onClick={() => onToggle(item)}
            className={`normal-bj-item ${active ? "normal-bj-item--selected" : ""}`}
          >
            <img src={item.itemimage || "/logo-small.png"} alt="" />
            <span>{item.itemname}</span>
            <b>{money(item.itemvalue)}</b>
          </button>
        );
      })}
    </div>
  );
}

export default function NormalBlackjack() {
  useSeo({
    title: "Normal Blackjack | GemTide",
    description: "Play GemTide normal blackjack with a separate item-backed wallet.",
    path: "/normal-blackjack",
  });

  const { userData } = useContext(UserContext);
  const [tab, setTab] = useState("play");
  const [wallet, setWallet] = useState({ balance: 0, taxRate: HOUSE_TAX });
  const [inventory, setInventory] = useState([]);
  const [houseInventory, setHouseInventory] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [game, setGame] = useState(null);
  const [history, setHistory] = useState([]);
  const [bet, setBet] = useState("100");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("The dealer is ready.");

  const authHeaders = useCallback(() => ({
    authorization: `Bearer ${getauth()}`,
    "content-type": "application/json",
  }), []);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${api}${path}`, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Something went wrong.");
    return body;
  }, [authHeaders]);

  const refresh = useCallback(async () => {
    if (!getauth()) {
      setLoading(false);
      return;
    }
    try {
      const [walletRes, inventoryRes, houseRes, currentRes, historyRes] = await Promise.all([
        request("/normal-wallet"),
        request("/normal-wallet/inventory"),
        request("/normal-wallet/house-inventory"),
        request("/normal-blackjack/current"),
        request("/normal-blackjack/history"),
      ]);
      setWallet(walletRes.data || { balance: 0, taxRate: HOUSE_TAX });
      setInventory(inventoryRes.data || []);
      setHouseInventory(houseRes.data || []);
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

  const selectedItems = useMemo(
    () => inventory.filter((item) => selected.has(String(item.inventoryid))),
    [inventory, selected],
  );
  const selectedValue = selectedItems.reduce((sum, item) => sum + Number(item.itemvalue || 0), 0);
  const selectedTax = Math.floor(selectedValue * HOUSE_TAX);
  const selectedCredit = selectedValue - selectedTax;
  const selectedHouseItems = useMemo(
    () => houseInventory.filter((item) => selected.has(String(item.inventoryid))),
    [houseInventory, selected],
  );
  const selectedHouseValue = selectedHouseItems.reduce((sum, item) => sum + Number(item.itemvalue || 0), 0);
  const currentHand = game?.playerHands?.[game.activeHand || 0];
  const dealerName = game?.status === "finished" ? "Dealer" : "Mr. Tide";

  const toggleItem = (item) => {
    setSelected((old) => {
      const next = new Set(old);
      const id = String(item.inventoryid);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exchange = async () => {
    if (!selectedItems.length) return toast.error("Select items first.");
    setBusy(true);
    try {
      const result = await request("/normal-wallet/exchange", {
        method: "POST",
        body: JSON.stringify({
          operationId: operationId(),
          inventoryIds: selectedItems.map((item) => item.inventoryid),
        }),
      });
      toast.success(result.message);
      setSelected(new Set());
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const redeem = async () => {
    if (!selectedHouseItems.length) return toast.error("Select house items first.");
    if (selectedHouseValue > wallet.balance) return toast.error("Your normal wallet is too low.");
    setBusy(true);
    try {
      const result = await request("/normal-wallet/redeem", {
        method: "POST",
        body: JSON.stringify({
          operationId: operationId(),
          inventoryIds: selectedHouseItems.map((item) => item.inventoryid),
        }),
      });
      toast.success(result.message);
      setSelected(new Set());
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const startGame = async () => {
    setBusy(true);
    setMessage("The dealer is shuffling the shoe...");
    try {
      const result = await request("/normal-blackjack/create", {
        method: "POST",
        body: JSON.stringify({ bet: Number(bet), operationId: operationId(), clientSeed: operationId() }),
      });
      setGame(result.data);
      setMessage(result.data?.status === "finished" ? "The dealer has dealt a natural hand." : "Your move, player.");
      await refresh();
    } catch (error) {
      setMessage("The dealer pauses.");
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const action = async (name) => {
    if (!game) return;
    setBusy(true);
    const narration = {
      hit: "The dealer slides you another card...",
      stand: "The dealer nods and checks the table...",
      double: "The dealer doubles the wager...",
      split: "The dealer separates the pair...",
      surrender: "The dealer returns half the wager...",
      insurance: "The dealer offers insurance...",
    };
    setMessage(narration[name] || "The dealer studies the table...");
    try {
      const result = await request("/normal-blackjack/action", {
        method: "POST",
        body: JSON.stringify({ gameId: game._id, action: name }),
      });
      setGame(result.data);
      setMessage(result.data.status === "finished" ? "The dealer has finished the hand." : "Your move, player.");
      await refresh();
    } catch (error) {
      toast.error(error.message);
      setMessage("The dealer waits for a valid move.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!game) return;
    setBusy(true);
    try {
      await request("/normal-blackjack/cancel", {
        method: "POST",
        body: JSON.stringify({ gameId: game._id }),
      });
      toast.success("Bet returned to your normal wallet.");
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const loginPrompt = !getauth();
  return (
    <div className="normal-bj-page">
      <section className="normal-bj-hero">
        <div className="normal-bj-hero-copy">
          <div className="normal-bj-eyebrow"><Sparkles size={14} /> NORMAL TABLE</div>
          <h1>Blackjack <em>against the dealer.</em></h1>
          <p>Exchange PS99 items into a separate table wallet, then play a fair six-deck game. Your site balance never mixes with this wallet.</p>
          <div className="normal-bj-trust"><ShieldCheck size={15} /> Provably fair shoe · dealer hits soft 17 · 8% item exchange tax</div>
        </div>
        <div className="normal-bj-dealer-stage" aria-label={`${dealerName} dealer animation`}>
          <div className="normal-bj-table-art" />
          <div className="normal-bj-dealer">
            <div className="normal-bj-dealer-head"><i /><i /></div>
            <div className="normal-bj-dealer-body"><span>♠</span></div>
            <div className="normal-bj-dealer-arm normal-bj-dealer-arm--left" />
            <div className="normal-bj-dealer-arm normal-bj-dealer-arm--right" />
          </div>
          <div className="normal-bj-dealer-caption"><b>{dealerName}</b><span>{message}</span></div>
        </div>
      </section>

      <div className="normal-bj-walletbar">
        <div className="normal-bj-wallet-balance"><WalletCards size={18} /><span>Normal wallet</span><strong>{money(wallet.balance)}</strong></div>
        <div className="normal-bj-wallet-note">Only used for normal games · never your site balance</div>
        <button className="normal-bj-refresh" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button>
      </div>

      {loginPrompt ? (
        <div className="normal-bj-login">Log in to exchange items and play normal blackjack.</div>
      ) : (
        <>
          <nav className="normal-bj-tabs">
            {[["play", "Play blackjack"], ["exchange", "Exchange items"], ["redeem", "Buy items back"], ["history", "History"]].map(([key, label]) => (
              <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => { setTab(key); setSelected(new Set()); }}>{label}</button>
            ))}
          </nav>

          {tab === "play" && (
            <section className="normal-bj-play-layout">
              <div className="normal-bj-table">
                <div className="normal-bj-table-header"><span>DEALER</span><small>{game ? `Hand ${game._id.slice(-6)}` : "New table"}</small></div>
                <div className="normal-bj-hand-row">
                  {game?.dealerHand?.map((card, index) => <Card key={`${index}-${card.rank}`} card={card} />)}
                  {!game && <div className="normal-bj-card-placeholder">The dealer is waiting for a wager</div>}
                </div>
                {game?.dealerTotal != null && <div className="normal-bj-total">Dealer total <b>{game.dealerTotal}</b></div>}
                <div className="normal-bj-divider" />
                <div className="normal-bj-table-header"><span>PLAYER</span><small>{currentHand ? `Wager ${money(currentHand.bet)}` : "Place a wager below"}</small></div>
                <div className="normal-bj-hand-row">
                  {currentHand?.cards?.map((card, index) => <Card key={`${index}-${card.rank}`} card={card} />)}
                  {!currentHand && <div className="normal-bj-card-placeholder">Your cards appear here</div>}
                </div>
                {currentHand && <div className="normal-bj-total">Your total <b>{currentHand.total}</b></div>}
                {game?.playerHands?.length > 1 && <div className="normal-bj-split-note">{game.playerHands.length} hands · playing hand {game.activeHand + 1}</div>}
                {game?.status === "finished" && <div className="normal-bj-result">{game.outcome?.replaceAll(",", " · ").toUpperCase()} · PAID {money(game.payout)}</div>}
              </div>
              <aside className="normal-bj-controls">
                <div className="normal-bj-control-card">
                  <label htmlFor="normal-bet">Wager from normal wallet</label>
                  <div className="normal-bj-bet-input"><Coins size={16} /><input id="normal-bet" type="number" min="1" max="1000000000" value={bet} disabled={!!game || busy} onChange={(event) => setBet(event.target.value)} /><span>credits</span></div>
                  {!game && <button className="normal-bj-primary" type="button" onClick={startGame} disabled={busy || Number(bet) < 1 || Number(bet) > wallet.balance}>Deal hand</button>}
                  {game?.status === "active" && (
                    <div className="normal-bj-actions">
                      <button type="button" onClick={() => action("hit")} disabled={busy}>Hit</button>
                      <button type="button" onClick={() => action("stand")} disabled={busy}>Stand</button>
                      <button type="button" onClick={() => action("double")} disabled={busy}>Double</button>
                      <button type="button" onClick={() => action("split")} disabled={busy}>Split</button>
                      <button type="button" onClick={() => action("surrender")} disabled={busy}>Surrender</button>
                      {game.dealerHand?.[0]?.rank === "A" && <button type="button" onClick={() => action("insurance")} disabled={busy}>Insurance</button>}
                    </div>
                  )}
                  {game?.status === "active" && <button type="button" className="normal-bj-cancel" onClick={cancel} disabled={busy}>Cancel hand and return wager</button>}
                  {game?.status === "finished" && <button type="button" className="normal-bj-primary" onClick={() => { setGame(null); setMessage("The dealer is ready."); }}>Deal another hand</button>}
                </div>
                <div className="normal-bj-rules"><b>House rules</b><span>Blackjack pays 3:2</span><span>Dealer stands on hard 17</span><span>Double after deal · one split</span><span>Dealer advantage is built in—bet responsibly</span></div>
              </aside>
            </section>
          )}

          {tab === "exchange" && (
            <section className="normal-bj-panel">
              <div className="normal-bj-panel-heading"><div><span className="normal-bj-eyebrow">ITEMS → CREDITS</span><h2>Fund your table wallet</h2><p>Selected items are moved to the owner inventory atomically. They cannot be spent twice.</p></div><div className="normal-bj-fee-card"><span>Exchange tax</span><b>8%</b><small>credited amount: {money(selectedCredit)}</small></div></div>
              <InventoryGrid items={inventory} selected={selected} onToggle={toggleItem} emptyLabel="No unlocked items available." />
              <div className="normal-bj-panel-footer"><span>{selectedItems.length} items · gross {money(selectedValue)} · fee {money(selectedTax)}</span><button type="button" className="normal-bj-primary" onClick={exchange} disabled={busy || !selectedItems.length}>Exchange for {money(selectedCredit)}</button></div>
            </section>
          )}

          {tab === "redeem" && (
            <section className="normal-bj-panel">
              <div className="normal-bj-panel-heading"><div><span className="normal-bj-eyebrow">CREDITS → ITEMS</span><h2>Buy items back</h2><p>House inventory is reserved by the server during checkout. Your credits are only charged when the items move.</p></div><div className="normal-bj-fee-card"><span>Selected value</span><b>{money(selectedHouseValue)}</b><small>balance: {money(wallet.balance)}</small></div></div>
              <InventoryGrid items={houseInventory} selected={selected} onToggle={toggleItem} emptyLabel="The owner inventory has no redeemable items right now." />
              <div className="normal-bj-panel-footer"><span>{selectedHouseItems.length} items selected</span><button type="button" className="normal-bj-primary" onClick={redeem} disabled={busy || !selectedHouseItems.length || selectedHouseValue > wallet.balance}>Redeem for {money(selectedHouseValue)}</button></div>
            </section>
          )}

          {tab === "history" && (
            <section className="normal-bj-panel"><div className="normal-bj-panel-heading"><div><span className="normal-bj-eyebrow">TABLE LOG</span><h2>Your recent hands</h2></div></div><div className="normal-bj-history">{history.length ? history.map((entry) => <div key={entry._id}><span>{new Date(entry.finishedAt || entry.createdAt).toLocaleString()}</span><b>{entry.outcome}</b><strong className={entry.payout >= entry.totalBet ? "win" : "loss"}>{entry.payout >= entry.totalBet ? "+" : "-"}{money(Math.abs(entry.payout - entry.totalBet))}</strong></div>) : <div className="normal-bj-empty">No completed hands yet.</div>}</div></section>
          )}
        </>
      )}
    </div>
  );
}