import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Coins, RefreshCw, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import { formatLargeNumber } from "../../utils/value";
import { useSeo } from "../../utils/useSeo";
import tableArt from "../../attached_assets/image_1784821751710.png";
import "./normalblackjack.css";

const HOUSE_TAX = 0.08;
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

function InventoryGrid({ items, selected, onToggle, emptyLabel }) {
  if (!items.length) return <div className="normal-bj-empty">{emptyLabel}</div>;
  return (
    <div className="normal-bj-inventory-grid">
      {items.map((item) => {
        const active = selected.has(String(item.inventoryid));
        return (
          <button key={item.inventoryid} type="button" onClick={() => onToggle(item)} className={`normal-bj-item ${active ? "normal-bj-item--selected" : ""}`}>
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
  useSeo({ title: "Normal Blackjack | GemTide", description: "Play GemTide normal blackjack with a separate item-backed wallet.", path: "/normal-blackjack" });
  const { userData } = useContext(UserContext);
  const [tab, setTab] = useState("play");
  const [wallet, setWallet] = useState({ balance: 0, taxRate: HOUSE_TAX });
  const [inventory, setInventory] = useState([]);
  const [houseInventory, setHouseInventory] = useState([]);
  const [sourceSelected, setSourceSelected] = useState(new Set());
  const [targetSelected, setTargetSelected] = useState(new Set());
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

  const selectedItems = useMemo(() => inventory.filter((item) => sourceSelected.has(String(item.inventoryid))), [inventory, sourceSelected]);
  const selectedHouseItems = useMemo(() => houseInventory.filter((item) => targetSelected.has(String(item.inventoryid))), [houseInventory, targetSelected]);
  const selectedValue = selectedItems.reduce((sum, item) => sum + Number(item.itemvalue || 0), 0);
  const selectedHouseValue = selectedHouseItems.reduce((sum, item) => sum + Number(item.itemvalue || 0), 0);
  const currentHand = game?.playerHands?.[game.activeHand || 0];
  const betValue = parseCompactAmount(bet);
  const loginPrompt = !getauth();

  const toggleSelected = (setter) => (item) => setter((old) => {
    const next = new Set(old);
    const id = String(item.inventoryid);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSource = toggleSelected(setSourceSelected);
  const toggleTarget = toggleSelected(setTargetSelected);

  const clearSelections = () => {
    setSourceSelected(new Set());
    setTargetSelected(new Set());
  };

  const exchange = async () => {
    if (!selectedItems.length) return toast.error("Select items first.");
    setBusy(true);
    try {
      const result = await request("/normal-wallet/exchange", { method: "POST", body: JSON.stringify({ operationId: operationId(), inventoryIds: selectedItems.map((item) => item.inventoryid) }) });
      toast.success(result.message); clearSelections(); await refresh();
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };

  const redeem = async () => {
    if (!selectedHouseItems.length) return toast.error("Select house items first.");
    if (selectedHouseValue > wallet.balance) return toast.error("Your normal wallet is too low.");
    setBusy(true);
    try {
      const result = await request("/normal-wallet/redeem", { method: "POST", body: JSON.stringify({ operationId: operationId(), inventoryIds: selectedHouseItems.map((item) => item.inventoryid) }) });
      toast.success(result.message); clearSelections(); await refresh();
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };

  const swap = async () => {
    if (!selectedItems.length || !selectedHouseItems.length) return toast.error("Choose the items you are breaking and the items you want back.");
    if (selectedValue !== selectedHouseValue) return toast.error("The two sides must have equal item value.");
    setBusy(true);
    try {
      const result = await request("/normal-wallet/swap", {
        method: "POST",
        body: JSON.stringify({
          operationId: operationId(),
          sourceInventoryIds: selectedItems.map((item) => item.inventoryid),
          targetInventoryIds: selectedHouseItems.map((item) => item.inventoryid),
        }),
      });
      toast.success(result.message); clearSelections(); await refresh();
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  };

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
        <div className="normal-bj-wallet-mini"><small>Normal wallet</small><strong>{money(wallet.balance)}</strong><span>credits</span></div>
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
        <button className="normal-bj-refresh" type="button" onClick={refresh} disabled={loading}><RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh</button>
      </div>

      {loginPrompt ? <div className="normal-bj-login">Log in to exchange items and play normal blackjack.</div> : (
        <>
          <nav className="normal-bj-tabs">
            {[["play", "Play blackjack"], ["exchange", "Exchange items"], ["break", "Break / swap items"], ["redeem", "Buy items back"], ["history", "History"]].map(([key, label]) => (
              <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => { setTab(key); clearSelections(); }}>{label}</button>
            ))}
          </nav>

          {tab === "play" && <section className="normal-bj-rules-row"><ShieldCheck size={15} /><span>Provably fair six-deck shoe</span><span>Blackjack pays 6:5</span><span>No surrender or cancellation after deal</span></section>}
          {tab === "exchange" && (
            <section className="normal-bj-panel">
              <div className="normal-bj-panel-heading"><div><span className="normal-bj-eyebrow">ITEMS → CREDITS</span><h2>Fund your table wallet</h2><p>Selected items move to the house inventory and credit the separate wallet after the 8% exchange tax.</p></div><div className="normal-bj-fee-card"><span>Credited amount</span><b>{money(selectedValue - Math.floor(selectedValue * HOUSE_TAX))}</b><small>8% exchange tax</small></div></div>
              <InventoryGrid items={inventory} selected={sourceSelected} onToggle={toggleSource} emptyLabel="No unlocked items available." />
              <div className="normal-bj-panel-footer"><span>{selectedItems.length} items · gross {money(selectedValue)}</span><button type="button" className="normal-bj-primary" onClick={exchange} disabled={busy || !selectedItems.length}>Exchange for {money(selectedValue - Math.floor(selectedValue * HOUSE_TAX))}</button></div>
            </section>
          )}
          {tab === "redeem" && (
            <section className="normal-bj-panel">
              <div className="normal-bj-panel-heading"><div><span className="normal-bj-eyebrow">CREDITS → ITEMS</span><h2>Buy items back</h2><p>Use wallet credits to take house inventory items back into your account.</p></div><div className="normal-bj-fee-card"><span>Selected value</span><b>{money(selectedHouseValue)}</b><small>Balance: {money(wallet.balance)}</small></div></div>
              <InventoryGrid items={houseInventory} selected={targetSelected} onToggle={toggleTarget} emptyLabel="The house inventory has no redeemable items right now." />
              <div className="normal-bj-panel-footer"><span>{selectedHouseItems.length} items selected</span><button type="button" className="normal-bj-primary" onClick={redeem} disabled={busy || !selectedHouseItems.length || selectedHouseValue > wallet.balance}>Redeem for {money(selectedHouseValue)}</button></div>
            </section>
          )}
          {tab === "break" && (
            <section className="normal-bj-panel">
              <div className="normal-bj-panel-heading"><div><span className="normal-bj-eyebrow">ITEMS ↔ ITEMS</span><h2>Break items into the pieces you want</h2><p>Pick the items to break, then pick the house items you want instead. It swaps ownership directly — no credits are created, removed, or touched.</p></div><div className="normal-bj-fee-card"><span>Value to swap</span><b className={selectedValue === selectedHouseValue && selectedValue > 0 ? "normal-bj-equal" : ""}>{money(selectedValue)} / {money(selectedHouseValue)}</b><small>{selectedValue === selectedHouseValue && selectedValue > 0 ? "Equal value" : "Both sides must match"}</small></div></div>
              <div className="normal-bj-swap-columns">
                <div className="normal-bj-swap-side"><div className="normal-bj-swap-heading"><span>1. Items you break</span><b>{selectedItems.length} selected</b></div><InventoryGrid items={inventory} selected={sourceSelected} onToggle={toggleSource} emptyLabel="No unlocked items available." /></div>
                <div className="normal-bj-swap-arrow">⇄</div>
                <div className="normal-bj-swap-side"><div className="normal-bj-swap-heading"><span>2. Items you want back</span><b>{selectedHouseItems.length} selected</b></div><InventoryGrid items={houseInventory} selected={targetSelected} onToggle={toggleTarget} emptyLabel="No house items available." /></div>
              </div>
              <div className="normal-bj-panel-footer"><span>{selectedValue === selectedHouseValue && selectedValue > 0 ? "Ready to swap equal value" : "Select equal total value on both sides"}</span><button type="button" className="normal-bj-primary" onClick={swap} disabled={busy || !selectedItems.length || !selectedHouseItems.length || selectedValue !== selectedHouseValue}>Swap items</button></div>
            </section>
          )}
          {tab === "history" && <section className="normal-bj-panel"><div className="normal-bj-panel-heading"><div><span className="normal-bj-eyebrow">TABLE LOG</span><h2>Your recent hands</h2></div></div><div className="normal-bj-history">{history.length ? history.map((entry) => <div key={entry._id}><span>{new Date(entry.finishedAt || entry.createdAt).toLocaleString()}</span><b>{entry.outcome}</b><strong className={entry.payout >= entry.totalBet ? "win" : "loss"}>{entry.payout >= entry.totalBet ? "+" : "-"}{money(Math.abs(entry.payout - entry.totalBet))}</strong></div>) : <div className="normal-bj-empty">No completed hands yet.</div>}</div></section>}
        </>
      )}
    </div>
  );
}