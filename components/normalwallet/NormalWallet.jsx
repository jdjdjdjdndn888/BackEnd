import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import { formatLargeNumber } from "../../utils/value";
import { useSeo } from "../../utils/useSeo";
import "./normalwallet.css";

const HOUSE_TAX = 0.08;

function operationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function money(value) {
  return formatLargeNumber(Math.max(0, Math.floor(Number(value) || 0)));
}

function autoSelectHouseStock(items, balance) {
  const limit = Math.max(0, Math.floor(Number(balance) || 0));
  if (!limit || !items.length) return new Set();
  const usable = items
    .filter((item) => Number.isSafeInteger(Number(item.itemvalue)) && Number(item.itemvalue) > 0)
    .slice(0, 100);
  const total = usable.reduce((sum, item) => sum + Number(item.itemvalue), 0);
  if (total <= limit) return new Set(usable.map((item) => String(item.inventoryid)));
  const chooseGreedy = (ordered) => {
    let remaining = limit;
    const chosen = [];
    for (const item of ordered) {
      const value = Number(item.itemvalue);
      if (value <= remaining) { chosen.push(item); remaining -= value; }
    }
    return { chosen, value: limit - remaining };
  };
  const ascending  = chooseGreedy([...usable].sort((a, b) => Number(a.itemvalue) - Number(b.itemvalue)));
  const descending = chooseGreedy([...usable].sort((a, b) => Number(b.itemvalue) - Number(a.itemvalue)));
  const best = descending.value > ascending.value ? descending : ascending;
  return new Set(best.chosen.map((item) => String(item.inventoryid)));
}

function InventoryGrid({ items, selected, onToggle, emptyLabel }) {
  if (!items.length) return <div className="nw-empty">{emptyLabel}</div>;
  return (
    <div className="nw-grid">
      {items.map((item) => {
        const active = selected.has(String(item.inventoryid));
        return (
          <button key={item.inventoryid} type="button" onClick={() => onToggle(item)}
            className={`nw-item ${active ? "nw-item--on" : ""}`}>
            <img src={item.itemimage || "/logo-small.png"} alt="" />
            <span>{item.itemname}</span>
            <b>{money(item.itemvalue)}</b>
          </button>
        );
      })}
    </div>
  );
}

export default function NormalWallet() {
  useSeo({ title: "Normal Wallet | GemTide", description: "Deposit and withdraw items using your GemTide normal wallet.", path: "/normal-wallet" });
  const { userData } = useContext(UserContext);
  const navigate = useNavigate();

  const [tab, setTab]                   = useState("deposit");
  const [wallet, setWallet]             = useState({ balance: 0, taxRate: HOUSE_TAX });
  const [inventory, setInventory]       = useState([]);
  const [houseInventory, setHouseInventory] = useState([]);
  const [sourceSelected, setSourceSelected] = useState(new Set());
  const [targetSelected, setTargetSelected] = useState(new Set());
  const [loading, setLoading]           = useState(true);
  const [busy, setBusy]                 = useState(false);

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
      const [walletRes, inventoryRes, houseRes] = await Promise.all([
        request("/normal-wallet"),
        request("/normal-wallet/inventory"),
        request("/normal-wallet/house-inventory"),
      ]);
      setWallet(walletRes.data || { balance: 0, taxRate: HOUSE_TAX });
      setInventory(inventoryRes.data || []);
      setHouseInventory(houseRes.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { refresh(); }, [refresh, userData?.userid]);

  // Auto-select house stock whenever entering the redeem tab
  useEffect(() => {
    if (tab === "redeem") setTargetSelected(autoSelectHouseStock(houseInventory, wallet.balance));
  }, [tab, houseInventory, wallet.balance]);

  const selectedItems      = useMemo(() => inventory.filter((i) => sourceSelected.has(String(i.inventoryid))), [inventory, sourceSelected]);
  const selectedHouseItems = useMemo(() => houseInventory.filter((i) => targetSelected.has(String(i.inventoryid))), [houseInventory, targetSelected]);
  const selectedValue      = selectedItems.reduce((s, i) => s + Number(i.itemvalue || 0), 0);
  const selectedHouseValue = selectedHouseItems.reduce((s, i) => s + Number(i.itemvalue || 0), 0);
  const depositReceive     = Math.floor(selectedValue * (1 - (wallet.taxRate ?? HOUSE_TAX)));

  const toggle = (setter) => (item) => setter((old) => {
    const next = new Set(old);
    const id = String(item.inventoryid);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const clear = () => { setSourceSelected(new Set()); setTargetSelected(new Set()); };

  const doDeposit = async () => {
    if (!selectedItems.length) return toast.error("Select items to deposit.");
    setBusy(true);
    try {
      const res = await request("/normal-wallet/exchange", {
        method: "POST",
        body: JSON.stringify({ operationId: operationId(), inventoryIds: selectedItems.map((i) => i.inventoryid) }),
      });
      toast.success(res.message); clear(); await refresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const doRedeem = async () => {
    if (!selectedHouseItems.length) return toast.error("No owner stock available within your balance.");
    if (selectedHouseValue > wallet.balance) return toast.error("Wallet balance too low.");
    setBusy(true);
    try {
      const res = await request("/normal-wallet/redeem", {
        method: "POST",
        body: JSON.stringify({ operationId: operationId(), inventoryIds: selectedHouseItems.map((i) => i.inventoryid) }),
      });
      toast.success(res.message); clear(); await refresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const doSwap = async () => {
    if (!selectedItems.length || !selectedHouseItems.length) return toast.error("Choose items on both sides.");
    if (selectedValue !== selectedHouseValue) return toast.error("Both sides must have equal total value.");
    setBusy(true);
    try {
      const res = await request("/normal-wallet/swap", {
        method: "POST",
        body: JSON.stringify({
          operationId: operationId(),
          sourceInventoryIds: selectedItems.map((i) => i.inventoryid),
          targetInventoryIds: selectedHouseItems.map((i) => i.inventoryid),
        }),
      });
      toast.success(res.message); clear(); await refresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  const loginPrompt = !getauth();

  return (
    <div className="nw-page">
      {/* Header */}
      <div className="nw-header">
        <button className="nw-back" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="nw-title">
          <span className="nw-eyebrow">NORMAL WALLET</span>
          <h1>Item Exchange</h1>
          <p>Deposit items to earn credits. Withdraw credits as items. Or swap items directly.</p>
        </div>
        <div className="nw-balance-chip">
          <span>Balance</span>
          <strong>{money(wallet.balance)}</strong>
          <small>credits</small>
        </div>
      </div>

      {/* Tabs */}
      <div className="nw-tabs">
        {["deposit", "redeem", "break"].map((t) => (
          <button key={t} className={`nw-tab ${tab === t ? "nw-tab--on" : ""}`} onClick={() => { setTab(t); clear(); }}>
            {t === "deposit" ? "Deposit" : t === "redeem" ? "Withdraw" : "Break"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="nw-loading">Loading wallet…</div>
      ) : loginPrompt ? (
        <div className="nw-login">Log in to use the exchange.</div>
      ) : (
        <>
          {/* DEPOSIT */}
          {tab === "deposit" && (
            <section className="nw-panel">
              <div className="nw-panel-head">
                <div>
                  <span className="nw-eyebrow">ITEMS → CREDITS</span>
                  <h2>Deposit items</h2>
                  <p>Select items from your inventory to convert into normal wallet credits. An {Math.round((wallet.taxRate ?? HOUSE_TAX) * 100)}% fee is deducted.</p>
                </div>
                <div className="nw-stat-card">
                  <span>You receive</span>
                  <b>{money(depositReceive)}</b>
                  <small>{selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} · {Math.round((wallet.taxRate ?? HOUSE_TAX) * 100)}% fee</small>
                </div>
              </div>
              <InventoryGrid items={inventory} selected={sourceSelected} onToggle={toggle(setSourceSelected)} emptyLabel="No unlocked items available." />
              <div className="nw-panel-foot">
                <span>{selectedItems.length ? `${selectedItems.length} item${selectedItems.length !== 1 ? "s" : ""} selected · ${money(selectedValue)} value` : "Select items to deposit"}</span>
                <button className="nw-btn-primary" onClick={doDeposit} disabled={busy || !selectedItems.length}>
                  Deposit {selectedItems.length ? `(+${money(depositReceive)})` : ""}
                </button>
              </div>
            </section>
          )}

          {/* REDEEM */}
          {tab === "redeem" && (
            <section className="nw-panel">
              <div className="nw-panel-head">
                <div>
                  <span className="nw-eyebrow">CREDITS → ITEMS</span>
                  <h2>Withdraw credits</h2>
                  <p>Select items from the house inventory to withdraw using your credits. Items are auto-selected based on your balance. Any leftover credits stay in your wallet for a later withdrawal.</p>
                </div>
                <div className="nw-stat-card">
                  <span>Wallet balance</span>
                  <b>{money(wallet.balance)}</b>
                  <small>{selectedHouseItems.length} selected · {money(selectedHouseValue)} value</small>
                </div>
              </div>
              <InventoryGrid items={houseInventory} selected={targetSelected} onToggle={toggle(setTargetSelected)} emptyLabel="No house stock available right now." />
              <div className="nw-panel-foot">
                <span>
                  {selectedHouseItems.length
                    ? `${selectedHouseItems.length} item${selectedHouseItems.length !== 1 ? "s" : ""} · ${money(selectedHouseValue)} credits${selectedHouseValue < wallet.balance ? ` · ${money(wallet.balance - selectedHouseValue)} remain` : ""}`
                    : "No owner stock available within your balance."}
                </span>
                <button className="nw-btn-primary" onClick={doRedeem} disabled={busy || !selectedHouseItems.length || selectedHouseValue > wallet.balance}>
                  Withdraw {selectedHouseItems.length ? money(selectedHouseValue) : ""}
                </button>
              </div>
            </section>
          )}

          {/* BREAK / SWAP */}
          {tab === "break" && (
            <section className="nw-panel">
              <div className="nw-panel-head">
                <div>
                  <span className="nw-eyebrow">ITEMS ↔ ITEMS</span>
                  <h2>Break items</h2>
                  <p>Swap your items for house items of equal total value. No credits are created or touched.</p>
                </div>
                <div className="nw-stat-card">
                  <span>Swap value</span>
                  <b className={selectedValue === selectedHouseValue && selectedValue > 0 ? "nw-match" : ""}>{money(selectedValue)} / {money(selectedHouseValue)}</b>
                  <small>{selectedValue === selectedHouseValue && selectedValue > 0 ? "Equal value ✓" : "Both sides must match"}</small>
                </div>
              </div>
              <div className="nw-swap-cols">
                <div className="nw-swap-side">
                  <div className="nw-swap-label"><span>Items you break</span><b>{sourceSelected.size} selected</b></div>
                  <InventoryGrid items={inventory} selected={sourceSelected} onToggle={toggle(setSourceSelected)} emptyLabel="No unlocked items available." />
                </div>
                <div className="nw-swap-arrow">⇄</div>
                <div className="nw-swap-side">
                  <div className="nw-swap-label"><span>Items you want back</span><b>{targetSelected.size} selected</b></div>
                  <InventoryGrid items={houseInventory} selected={targetSelected} onToggle={toggle(setTargetSelected)} emptyLabel="No house items available." />
                </div>
              </div>
              <div className="nw-panel-foot">
                <span>{selectedValue === selectedHouseValue && selectedValue > 0 ? "Ready to swap equal value" : "Select equal total value on both sides"}</span>
                <button className="nw-btn-primary" onClick={doSwap}
                  disabled={busy || !selectedItems.length || !selectedHouseItems.length || selectedValue !== selectedHouseValue}>
                  Swap items
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
