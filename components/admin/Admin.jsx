import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import toast from "react-hot-toast";
import NotifyModal from "../notifications/NotifyModal.jsx";

const TABS = ["Overview", "Users", "Items", "Cases", "Bots", "Inventory", "Withdrawals", "Giveaways", "Affiliates", "Logs", "Danger"];
const GAMES = ["PS99", "Sab"];

// Assignable ranks, lowest to highest. Must match api/utils/rankTiers.js ALL_RANKS.
const RANKS = ["USER", "TRIAL_STAFF", "MIDDLEMAN", "MODERATOR", "TRUSTED_STAFF", "ADMIN", "CO_OWNER", "OWNER"];
const OWNER_TIER = ["OWNER", "CO_OWNER"];
const ADMIN_TIER = ["OWNER", "CO_OWNER", "ADMIN"];

// ── Value helpers ────────────────────────────────────────────────────────────
function fmtVal(v) {
  if (!v && v !== 0) return "0";
  const n = Number(v);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(1).replace(/\.?0+$/, "") + "K";
  return String(n);
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function Admin() {
  const { userData } = useContext(UserContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [showNotify, setShowNotify] = useState(false);

  useEffect(() => {
    if (userData === null) return;
    if (userData && !ADMIN_TIER.includes(userData.rank)) navigate("/");
  }, [userData]);

  if (!userData || !ADMIN_TIER.includes(userData.rank)) {
    return (
      <div className="flex items-center justify-center h-full text-[#6B7280]">
        {userData ? "Access denied" : "Loading..."}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0a0b14] text-white p-6">
      {showNotify && <NotifyModal onClose={() => setShowNotify(false)} />}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>
            <span className="text-xl">🛡️</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-xs text-[#6B7280]">GemTide · {userData.username} ({userData.rank})</p>
          </div>
          <button onClick={() => setShowNotify(true)}
            className="flex items-center gap-2 rounded-xl border-none px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>
            📣 Broadcast
          </button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-[#1e2035]">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-semibold border-none cursor-pointer transition-colors rounded-t-lg ${tab === t ? "bg-[#8B5CF6] text-white" : "bg-transparent text-[#6B7280] hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview"     && <OverviewTab />}
        {tab === "Users"        && <UsersTab />}
        {tab === "Items"        && <ItemsTab />}
        {tab === "Bots"         && <BotsTab />}
        {tab === "Inventory"    && <InventoryTab />}
        {tab === "Withdrawals"  && <WithdrawalsTab />}
        {tab === "Cases"        && <CasesTab />}
        {tab === "Giveaways"    && <GiveawaysTab />}
        {tab === "Affiliates"   && <AffiliatesTab />}
        {tab === "Logs"         && <LogsTab />}
        {tab === "Danger"       && <DangerTab />}
      </div>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { userData } = useContext(UserContext);
  const [stats, setStats] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetch(`${api}/admin/stats`, { headers: { authorization: `Bearer ${getauth()}` } })
      .then(r => r.json()).then(d => setStats(d.data)).catch(() => {});
  }, []);

  const resetBalances = async () => {
    if (!confirm("⚠️ RESET ALL BALANCES\n\nThis will set every user's balance to 0R$.\n\nThis cannot be undone. Proceed?")) return;
    setResetting(true);
    try {
      const res = await fetch(`${api}/admin/reset-balances`, {
        method: "POST",
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const d = await res.json();
      res.ok ? toast.success(d.message) : toast.error(d.message || "Reset failed");
    } catch { toast.error("Network error"); }
    finally { setResetting(false); }
  };

  const cards = [
    { label: "Total Users",      value: stats?.totalUsers     ?? "—", icon: "👥" },
    { label: "Items in DB",      value: stats?.totalItems     ?? "—", icon: "📦" },
    { label: "Inventory Entries", value: stats?.totalInventory ?? "—", icon: "🎒" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(s => (
          <div key={s.label} className="rounded-xl bg-[#13151f] border border-[#1e2035] p-5">
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-[#6B7280] mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      {userData?.rank === "OWNER" && (
        <div className="rounded-xl bg-[#13151f] border border-[#EF444440] p-5">
          <p className="text-sm font-bold text-red-400 mb-1">🔴 Owner Actions</p>
          <p className="text-xs text-[#6B7280] mb-3">Destructive actions — owner only. Cannot be undone.</p>
          <button
            onClick={resetBalances}
            disabled={resetting}
            className="px-5 py-2.5 rounded-lg border-none text-white text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}
          >
            {resetting ? "Resetting..." : "💰 Reset All Balances to 0"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchUsers = async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/admin/users?search=${encodeURIComponent(q)}`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      if (res.ok) { const d = await res.json(); setUsers(d.data || []); }
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  const banUser = async (userid, banned) => {
    const res = await fetch(`${api}/admin/ban`, {
      method: "POST", headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
      body: JSON.stringify({ userid, banned: !banned }),
    });
    const d = await res.json();
    res.ok ? (toast.success(d.message), fetchUsers(search)) : toast.error(d.message);
  };

  const setRank = async (userid, rank) => {
    const res = await fetch(`${api}/admin/setrank`, {
      method: "POST", headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
      body: JSON.stringify({ userid, rank }),
    });
    const d = await res.json();
    res.ok ? (toast.success(d.message), fetchUsers(search)) : toast.error(d.message);
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchUsers(search)}
          placeholder="Search username…"
          className="flex-1 rounded-lg bg-[#13151f] border border-[#1e2035] px-4 py-2.5 text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]" />
        <button onClick={() => fetchUsers(search)}
          className="px-5 py-2.5 rounded-lg border-none text-white font-semibold cursor-pointer hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>Search</button>
      </div>
      {loading
        ? <p className="text-center text-[#6B7280] py-10">Loading…</p>
        : users.length === 0
          ? <p className="text-center text-[#6B7280] py-10">Search to load users.</p>
          : (
        <div className="rounded-xl border border-[#1e2035] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#13151f] text-[#6B7280] text-left">
                {["User","ID","Rank","Lvl","Status","Actions"].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.userid} className={`border-t border-[#1e2035] ${i % 2 === 0 ? "bg-[#0d0f1a]" : "bg-[#0a0b14]"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={u.thumbnail} alt="" className="w-7 h-7 rounded-full" />
                      <span className="font-medium">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] font-mono text-xs">{u.userid}</td>
                  <td className="px-4 py-3">
                    <select value={u.rank || "USER"} onChange={e => setRank(u.userid, e.target.value)}
                      className="bg-[#1C1F2E] border border-[#252839] rounded px-2 py-1 text-white text-xs cursor-pointer">
                      {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">{u.level ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.banned ? "bg-red-900/40 text-red-400" : "bg-green-900/40 text-green-400"}`}>
                      {u.banned ? "Banned" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => banUser(u.userid, u.banned)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer hover:opacity-80 ${u.banned ? "bg-green-700" : "bg-red-700"} text-white`}>
                      {u.banned ? "Unban" : "Ban"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Items ─────────────────────────────────────────────────────────────────────
function ItemsTab() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [newItem, setNewItem] = useState({ itemname: "", itemvalue: "", itemimage: "", game: "PS99" });
  const [showGive, setShowGive] = useState(false);
  const [giveData, setGiveData] = useState({ userid: "", itemid: "", quantity: 1 });
  const [showScrape, setShowScrape] = useState(false);
  const [scrapeSource, setScrapeSource] = useState("auto");
  const [scrapeJson, setScrapeJson] = useState("");
  const [scrapeLoading, setScrapeLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, game: gameFilter });
      const res = await fetch(`${api}/admin/items?${params}`, { headers: { authorization: `Bearer ${getauth()}` } });
      if (res.ok) { const d = await res.json(); setItems(d.data || []); }
    } catch { toast.error("Failed to load items"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [gameFilter]);

  const createItem = async () => {
    if (!newItem.itemname || !newItem.itemvalue || !newItem.itemimage || !newItem.game)
      return toast.error("Fill all fields");
    const res = await fetch(`${api}/admin/items/create`, {
      method: "POST", headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
      body: JSON.stringify(newItem),
    });
    const d = await res.json();
    if (res.ok) { toast.success(d.message); setShowCreate(false); setNewItem({ itemname: "", itemvalue: "", itemimage: "", game: "PS99" }); fetchItems(); }
    else toast.error(d.message);
  };

  const saveEdit = async (itemid) => {
    const res = await fetch(`${api}/admin/items/${itemid}`, {
      method: "PUT", headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
      body: JSON.stringify(editData),
    });
    const d = await res.json();
    if (res.ok) { toast.success(d.message); setEditId(null); fetchItems(); }
    else toast.error(d.message);
  };

  const deleteItem = async (itemid, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`${api}/admin/items/${itemid}`, {
      method: "DELETE", headers: { authorization: `Bearer ${getauth()}` },
    });
    const d = await res.json();
    if (res.ok) { toast.success(d.message); fetchItems(); } else toast.error(d.message);
  };

  const giveItem = async () => {
    if (!giveData.userid || !giveData.itemid) return toast.error("Fill all fields");
    const res = await fetch(`${api}/admin/items/give`, {
      method: "POST", headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
      body: JSON.stringify(giveData),
    });
    const d = await res.json();
    if (res.ok) { toast.success(d.message); setShowGive(false); setGiveData({ userid: "", itemid: "", quantity: 1 }); }
    else toast.error(d.message);
  };

  // Reset entire database except owner
  const resetDB = async () => {
    const res = await fetch(`${api}/admin/reset`, {
      method: "POST", headers: { authorization: `Bearer ${getauth()}` },
    });
    const d = await res.json();
    if (res.ok) { toast.success(d.message); fetchItems(); }
    else toast.error(d.message || "Reset failed");
  };

  // Scrape items from external source or manual JSON
  const scrapeItems = async () => {
    setScrapeLoading(true);
    try {
      const body = { game: gameFilter === "all" ? "PS99" : gameFilter, source: scrapeSource };
      if (scrapeJson.trim()) {
        try { body.manualItems = JSON.parse(scrapeJson); } catch {
          toast.error("Invalid JSON in manual import box");
          setScrapeLoading(false);
          return;
        }
      }
      const res = await fetch(`${api}/admin/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (res.ok) { toast.success(d.message); setScrapeJson(""); setShowScrape(false); fetchItems(); }
      else toast.error(d.message || "Scrape failed");
    } catch { toast.error("Network error during scrape"); }
    finally { setScrapeLoading(false); }
  };

  // Fetch correct image from petsimulatorvalues.com
  const fetchImage = async (itemid) => {
    const res = await fetch(`${api}/admin/items/${itemid}/fetchimage`, {
      method: "POST", headers: { authorization: `Bearer ${getauth()}` },
    });
    const d = await res.json();
    if (res.ok) { toast.success(d.message); fetchItems(); }
    else toast.error(d.message || "Failed to fetch image");
  };

  // Start editing — pre-fill with formatted value so user sees "5B" not "5000000000"
  const startEdit = (item) => {
    setEditId(item.itemid);
    setEditData({ itemname: item.itemname, itemvalue: fmtVal(item.itemvalue), game: item.game, itemimage: item.itemimage });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchItems()}
          placeholder="Search items…"
          className="flex-1 min-w-32 rounded-lg bg-[#13151f] border border-[#1e2035] px-4 py-2 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]" />
        <button onClick={fetchItems}
          className="px-4 py-2 rounded-lg border-none text-white text-sm font-semibold cursor-pointer hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>Search</button>
        {["all", ...GAMES].map(g => (
          <button key={g} onClick={() => setGameFilter(g)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors bg-transparent ${gameFilter === g ? "border-[#8B5CF6] text-white bg-[#8B5CF615]" : "border-[#1e2035] text-[#6B7280] hover:text-white"}`}>
            {g === "all" ? "All" : g}
          </button>
        ))}
        <button onClick={() => setShowGive(v => !v)}
          className="px-4 py-2 rounded-lg border border-[#1e2035] text-xs font-semibold cursor-pointer text-[#6B7280] hover:text-white bg-transparent transition-colors">
          🎁 Give Item
        </button>
        <button onClick={() => setShowCreate(v => !v)}
          className="px-4 py-2 rounded-lg border-none text-white text-sm font-semibold cursor-pointer hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
          ＋ Create
        </button>
        <button onClick={() => {
          if (confirm("⚠️ RESET DATABASE\n\nThis will DELETE all items, inventory, bots, and users except tinytedde.\n\nThis cannot be undone. Proceed?")) resetDB();
        }}
          className="px-4 py-2 rounded-lg border-none text-white text-sm font-semibold cursor-pointer hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>
          🗑 Reset
        </button>
        <button onClick={() => setShowScrape(v => !v)}
          className="px-4 py-2 rounded-lg border border-[#3B82F6] text-[#3B82F6] text-sm font-semibold cursor-pointer hover:bg-[#3B82F615] transition-colors bg-transparent">
          🔗 Scrape
        </button>
      </div>

      {/* Scrape form */}
      {showScrape && (
        <div className="rounded-xl border border-[#3B82F660] bg-[#13151f] p-4 mb-4">
          <h3 className="text-sm font-bold mb-3 text-[#3B82F6]">🔗 Scrape / Import Items</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex gap-2">
              <select value={scrapeSource} onChange={e => setScrapeSource(e.target.value)}
                className="rounded-lg bg-[#0d0f1a] border border-[#1e2035] px-3 py-2 text-sm text-white cursor-pointer">
                <option value="auto">Auto (Built-in PS99 Items)</option>
                <option value="psv">Pet Simulator Values (API)</option>
                <option value="manual">Manual JSON Import</option>
              </select>
              <select value={gameFilter === "all" ? "PS99" : gameFilter} onChange={e => setGameFilter(e.target.value)}
                className="rounded-lg bg-[#0d0f1a] border border-[#1e2035] px-3 py-2 text-sm text-white cursor-pointer">
                {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <textarea
              value={scrapeJson}
              onChange={e => setScrapeJson(e.target.value)}
              placeholder={`Paste JSON array here for manual import (optional):\\n[\\n  { "itemname": "Huge Cat", "itemvalue": 1000000, "itemimage": "https://...", "game": "PS99" }\\n]`}
              className="w-full h-32 rounded-lg bg-[#0d0f1a] border border-[#1e2035] px-3 py-2 text-xs text-white placeholder:text-[#6B7280] outline-none focus:border-[#3B82F6] font-mono"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowScrape(false)} className="flex-1 rounded-lg border border-[#1e2035] bg-transparent py-2 text-sm text-[#6B7280] hover:text-white cursor-pointer">Cancel</button>
              <button onClick={scrapeItems} disabled={scrapeLoading}
                className="flex-1 rounded-lg border-none py-2 text-sm font-semibold text-white cursor-pointer hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#3B82F6,#2563EB)" }}>
                {scrapeLoading ? "Scraping..." : "Start Scrape"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-[#10B98160] bg-[#13151f] p-4 mb-4">
          <h3 className="text-sm font-bold mb-3 text-[#10B981]">＋ New Item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField value={newItem.itemname} onChange={v => setNewItem(p => ({ ...p, itemname: v }))} placeholder="Item name" />
            <InputField value={newItem.itemvalue} onChange={v => setNewItem(p => ({ ...p, itemvalue: v }))} placeholder="Value — e.g. 5b · 500m · 10k · 1.5b" />
            <InputField value={newItem.itemimage} onChange={v => setNewItem(p => ({ ...p, itemimage: v }))} placeholder="Image URL" />
            <select value={newItem.game} onChange={e => setNewItem(p => ({ ...p, game: e.target.value }))}
              className="rounded-lg bg-[#0d0f1a] border border-[#1e2035] px-3 py-2 text-sm text-white cursor-pointer">
              {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {newItem.itemimage && (
            <div className="mt-3 flex items-center gap-3">
              <img src={newItem.itemimage} alt="preview" className="w-14 h-14 rounded-lg object-contain bg-[#0d0f1a] border border-[#1e2035]" />
              <span className="text-xs text-[#6B7280]">Image preview</span>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowCreate(false)} className="flex-1 rounded-lg border border-[#1e2035] bg-transparent py-2 text-sm text-[#6B7280] hover:text-white cursor-pointer">Cancel</button>
            <button onClick={createItem} className="flex-1 rounded-lg border-none py-2 text-sm font-semibold text-white cursor-pointer hover:opacity-90" style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>Create Item</button>
          </div>
        </div>
      )}

      {/* Give item form */}
      {showGive && (
        <div className="rounded-xl border border-[#8B5CF660] bg-[#13151f] p-4 mb-4">
          <h3 className="text-sm font-bold mb-3">🎁 Give Item to User</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputField value={giveData.userid} onChange={v => setGiveData(p => ({ ...p, userid: v }))} placeholder="Roblox User ID" />
            <select
              value={giveData.itemid}
              onChange={e => setGiveData(p => ({ ...p, itemid: e.target.value }))}
              className="rounded-lg bg-[#0d0f1a] border border-[#1e2035] px-3 py-2 text-sm text-white cursor-pointer outline-none focus:border-[#8B5CF6]"
            >
              <option value="">— Select item —</option>
              {items.map(it => (
                <option key={it._id} value={it._id}>
                  #{it.itemid} · {it.itemname} ({fmtVal(it.itemvalue)})
                </option>
              ))}
            </select>
            <input type="number" value={giveData.quantity} onChange={e => setGiveData(p => ({ ...p, quantity: e.target.value }))}
              placeholder="Quantity" min="1" max="100"
              className="rounded-lg bg-[#0d0f1a] border border-[#1e2035] px-3 py-2 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]" />
          </div>
          {giveData.itemid && (() => {
            const picked = items.find(it => String(it._id) === String(giveData.itemid));
            return picked ? (
              <div className="mt-3 flex items-center gap-3 p-2 rounded-lg bg-[#0d0f1a] border border-[#1e2035]">
                <img src={picked.itemimage} alt={picked.itemname} className="w-14 h-14 object-contain rounded-lg bg-[#13151f]" />
                <div>
                  <p className="text-sm font-semibold text-white">{picked.itemname}</p>
                  <p className="text-xs text-[#8B5CF6]">{fmtVal(picked.itemvalue)} · {picked.game} · ID #{picked.itemid}</p>
                </div>
              </div>
            ) : null;
          })()}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowGive(false)} className="flex-1 rounded-lg border border-[#1e2035] bg-transparent py-2 text-sm text-[#6B7280] hover:text-white cursor-pointer">Cancel</button>
            <button onClick={giveItem} className="flex-1 rounded-lg border-none py-2 text-sm font-semibold text-white cursor-pointer hover:opacity-90" style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>Give Item</button>
          </div>
        </div>
      )}

      {/* Items table */}
      {loading
        ? <p className="text-center text-[#6B7280] py-10">Loading…</p>
        : items.length === 0
          ? <p className="text-center text-[#6B7280] py-10">No items found. Create one above or search.</p>
          : (
        <div className="rounded-xl border border-[#1e2035] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#13151f] text-[#6B7280] text-left">
                {["Image","Name","Value","Game","ID","Actions"].map(h => <th key={h} className="px-3 py-2.5 font-medium text-xs">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item._id || item.itemid} className={`border-t border-[#1e2035] ${i % 2 === 0 ? "bg-[#0d0f1a]" : "bg-[#0a0b14]"}`}>
                  <td className="px-3 py-2">
                    <img src={editId === item.itemid ? (editData.itemimage || item.itemimage) : item.itemimage}
                      alt={item.itemname} className="w-14 h-14 object-contain rounded-lg bg-[#13151f]" />
                  </td>
                  <td className="px-3 py-2">
                    {editId === item.itemid
                      ? <input value={editData.itemname} onChange={e => setEditData(p => ({ ...p, itemname: e.target.value }))}
                          className="w-full rounded bg-[#13151f] border border-[#8B5CF6] px-2 py-1 text-xs text-white outline-none" />
                      : <span className="font-medium text-white">{item.itemname}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {editId === item.itemid
                      ? <div>
                          <input value={editData.itemvalue} onChange={e => setEditData(p => ({ ...p, itemvalue: e.target.value }))}
                            className="w-28 rounded bg-[#13151f] border border-[#8B5CF6] px-2 py-1 text-xs text-white outline-none" />
                          <p className="text-[10px] text-[#6B7280] mt-0.5">e.g. 5b · 500m · 10k</p>
                        </div>
                      : <span className="font-bold text-[#8B5CF6]">{fmtVal(item.itemvalue)}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {editId === item.itemid
                      ? <select value={editData.game} onChange={e => setEditData(p => ({ ...p, game: e.target.value }))}
                          className="rounded bg-[#13151f] border border-[#8B5CF6] px-2 py-1 text-xs text-white cursor-pointer">
                          {GAMES.map(g => <option key={g}>{g}</option>)}
                        </select>
                      : <span className="px-2 py-0.5 rounded-full text-xs bg-[#8B5CF620] text-[#8B5CF6]">{item.game}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {editId === item.itemid
                      ? <input value={editData.itemimage} onChange={e => setEditData(p => ({ ...p, itemimage: e.target.value }))}
                          placeholder="Image URL"
                          className="w-32 rounded bg-[#13151f] border border-[#8B5CF6] px-2 py-1 text-xs text-white outline-none" />
                      : <span className="text-[#6B7280] font-mono text-xs">#{item.itemid}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      {editId === item.itemid ? (
                        <>
                          <button onClick={() => saveEdit(item.itemid)} className="px-2 py-1 rounded bg-[#10B981] text-white text-xs border-none cursor-pointer hover:opacity-80">Save</button>
                          <button onClick={() => setEditId(null)} className="px-2 py-1 rounded bg-[#1e2035] text-[#6B7280] text-xs border-none cursor-pointer hover:text-white">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(item)} className="px-2 py-1 rounded bg-[#8B5CF6] text-white text-xs border-none cursor-pointer hover:opacity-80">Edit</button>
                          <button onClick={() => fetchImage(item.itemid)} className="px-2 py-1 rounded bg-[#3B82F6] text-white text-xs border-none cursor-pointer hover:opacity-80" title="Fetch correct image">Img</button>
                          <button onClick={() => deleteItem(item.itemid, item.itemname)} className="px-2 py-1 rounded bg-[#EF4444] text-white text-xs border-none cursor-pointer hover:opacity-80">Del</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Bots ──────────────────────────────────────────────────────────────────────
const BLANK_BOT = { name: "", pfp: "", userid: "", link: "", game: "PS99", showJoin: true, showProfile: true, showId: false };

function BotsTab() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newBot, setNewBot] = useState(BLANK_BOT);
  const [creating, setCreating] = useState(false);

  const fetchBots = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/admin/bots`, { headers: { authorization: `Bearer ${getauth()}` } });
      if (res.ok) { const d = await res.json(); setBots(d.data || []); }
    } catch { toast.error("Failed to load bots"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBots(); }, []);

  const toggleBot = async (name, online) => {
    const res = await fetch(`${api}/admin/bots/toggle`, {
      method: "POST", headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
      body: JSON.stringify({ name, online: !online }),
    });
    const d = await res.json();
    if (res.ok) { toast.success(d.message); fetchBots(); } else toast.error(d.message);
  };

  const deleteBot = async (name) => {
    if (!confirm(`Remove bot "${name}"?`)) return;
    const res = await fetch(`${api}/admin/bots/delete`, {
      method: "POST", headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
      body: JSON.stringify({ name }),
    });
    const d = await res.json();
    if (res.ok) { toast.success(d.message); fetchBots(); } else toast.error(d.message);
  };

  const createBot = async () => {
    if (!newBot.name || !newBot.pfp || !newBot.userid || !newBot.game)
      return toast.error("Name, profile picture, Roblox ID and game are required.");
    setCreating(true);
    try {
      const res = await fetch(`${api}/admin/bots/create`, {
        method: "POST", headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ ...newBot, userid: Number(newBot.userid) }),
      });
      const d = await res.json();
      if (res.ok) { toast.success(d.message); setShowCreate(false); setNewBot(BLANK_BOT); fetchBots(); }
      else toast.error(d.message);
    } catch { toast.error("Network error"); }
    finally { setCreating(false); }
  };

  const setB = (key, val) => setNewBot(p => ({ ...p, [key]: val }));

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-white">Deposit &amp; Withdraw Bots</h3>
        <div className="flex gap-2">
          <button onClick={fetchBots} className="px-3 py-1.5 text-xs rounded-lg border border-[#1e2035] text-[#6B7280] hover:text-white bg-transparent cursor-pointer">Refresh</button>
          <button onClick={() => setShowCreate(v => !v)}
            className="px-4 py-1.5 text-xs rounded-lg border-none text-white font-semibold cursor-pointer hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
            ＋ Add Bot
          </button>
        </div>
      </div>

      {/* Create Bot Form */}
      {showCreate && (
        <div className="rounded-xl border border-[#10B98160] bg-[#13151f] p-5 mb-5">
          <h4 className="text-sm font-bold text-[#10B981] mb-4">🤖 New Bot</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <InputField value={newBot.name}   onChange={v => setB("name", v)}   placeholder="Bot name" label="Name" />
            <InputField value={newBot.userid} onChange={v => setB("userid", v)} placeholder="Roblox user ID" label="Roblox ID" />
            <InputField value={newBot.pfp}    onChange={v => setB("pfp", v)}    placeholder="Profile picture URL" label="Profile Picture URL" />
            <InputField value={newBot.link}   onChange={v => setB("link", v)}   placeholder="Join / group link (optional)" label="Join Link" />
            <div>
              <label className="block text-xs text-[#6B7280] mb-1">Game</label>
              <select value={newBot.game} onChange={e => setB("game", e.target.value)}
                className="w-full rounded-lg bg-[#0d0f1a] border border-[#1e2035] px-3 py-2 text-sm text-white cursor-pointer">
                {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {/* Preview */}
            {newBot.pfp && (
              <div className="flex items-center gap-3">
                <img src={newBot.pfp} alt="pfp" className="w-14 h-14 rounded-full object-cover border border-[#1e2035] bg-[#0d0f1a]" />
                <div>
                  <p className="text-sm font-semibold text-white">{newBot.name || "Bot Name"}</p>
                  <p className="text-xs text-[#6B7280]">{newBot.game} · ID {newBot.userid || "?"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Toggle options */}
          <div className="border-t border-[#1e2035] pt-4 mb-4">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Display Options</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ToggleRow
                label="Show Join Button"
                desc="Link to join / invite"
                value={newBot.showJoin}
                onChange={v => setB("showJoin", v)}
              />
              <ToggleRow
                label="Show Profile Button"
                desc="Link to Roblox profile"
                value={newBot.showProfile}
                onChange={v => setB("showProfile", v)}
              />
              <ToggleRow
                label="Show Roblox ID"
                desc="Display numeric ID"
                value={newBot.showId}
                onChange={v => setB("showId", v)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setShowCreate(false); setNewBot(BLANK_BOT); }}
              className="flex-1 rounded-lg border border-[#1e2035] bg-transparent py-2 text-sm text-[#6B7280] hover:text-white cursor-pointer">Cancel</button>
            <button onClick={createBot} disabled={creating}
              className="flex-1 rounded-lg border-none py-2 text-sm font-semibold text-white cursor-pointer disabled:opacity-40 hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}>
              {creating ? "Creating…" : "🤖 Create Bot"}
            </button>
          </div>
        </div>
      )}

      {loading
        ? <p className="text-center text-[#6B7280] py-10">Loading…</p>
        : bots.length === 0
          ? (
          <div className="rounded-xl border border-[#1e2035] bg-[#13151f] p-8 text-center text-[#6B7280]">
            <p className="text-3xl mb-2">🤖</p>
            <p className="font-medium">No bots yet</p>
            <p className="text-xs mt-1">Click "Add Bot" above to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bots.map(bot => (
              <div key={bot.name} className="rounded-xl border border-[#1e2035] bg-[#13151f] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <img src={bot.pfp} alt={bot.name} className="w-12 h-12 rounded-full object-cover bg-[#0d0f1a]" />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#13151f] ${bot.online ? "bg-green-400" : "bg-red-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{bot.name}</p>
                    <p className="text-xs text-[#6B7280]">{bot.game}</p>
                    {bot.showId && <p className="text-xs text-[#42496B] font-mono">ID: {bot.userid}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    <button onClick={() => toggleBot(bot.name, bot.online)}
                      className={`px-3 py-1 rounded-lg border-none text-xs font-semibold cursor-pointer hover:opacity-80 ${bot.online ? "bg-red-700" : "bg-green-700"} text-white`}>
                      {bot.online ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => deleteBot(bot.name)}
                      className="px-3 py-1 rounded-lg border border-[#EF444440] text-xs text-red-400 cursor-pointer hover:bg-red-900/30 bg-transparent">
                      Remove
                    </button>
                  </div>
                </div>

                {/* Display option badges */}
                <div className="flex gap-1.5 flex-wrap">
                  <Badge active={bot.showJoin}    label="Join btn" />
                  <Badge active={bot.showProfile} label="Profile btn" />
                  <Badge active={bot.showId}      label="Show ID" />
                  {bot.link && <Badge active={true} label="Has link" color="#3B82F6" />}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ── Withdrawals Tab ───────────────────────────────────────────────────────────
function WithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/admin/withdrawals`, { headers: { authorization: `Bearer ${getauth()}` } });
      if (res.ok) { const d = await res.json(); setWithdrawals(d.data || []); }
      else toast.error("Failed to load withdrawals");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWithdrawals(); }, []);

  const deleteOne = async (id) => {
    setDeleting(id);
    try {
      const res = await fetch(`${api}/admin/withdrawals/${id}`, {
        method: "DELETE", headers: { authorization: `Bearer ${getauth()}` },
      });
      const d = await res.json();
      if (res.ok) { toast.success(d.message); setWithdrawals(prev => prev.filter(w => String(w._id) !== String(id))); }
      else toast.error(d.message);
    } catch { toast.error("Network error"); }
    finally { setDeleting(null); }
  };

  const deleteAll = async () => {
    if (!confirm(`Delete ALL ${withdrawals.length} pending withdrawal(s)? This cannot be undone.`)) return;
    setDeletingAll(true);
    try {
      const res = await fetch(`${api}/admin/withdrawals/delete-all`, {
        method: "POST", headers: { authorization: `Bearer ${getauth()}` },
      });
      const d = await res.json();
      if (res.ok) { toast.success(d.message); setWithdrawals([]); }
      else toast.error(d.message);
    } catch { toast.error("Network error"); }
    finally { setDeletingAll(false); }
  };

  // Group by user
  const byUser = withdrawals.reduce((acc, w) => {
    const key = String(w.userid);
    if (!acc[key]) acc[key] = { userid: w.userid, username: w.username, thumbnail: w.thumbnail, items: [] };
    acc[key].items.push(w);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Pending Withdrawals</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">{withdrawals.length} withdrawal request{withdrawals.length !== 1 ? "s" : ""} waiting</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchWithdrawals} disabled={loading}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#1e2035] text-[#6B7280] hover:text-white bg-transparent cursor-pointer disabled:opacity-40">
            {loading ? "Loading…" : "Refresh"}
          </button>
          {withdrawals.length > 0 && (
            <button onClick={deleteAll} disabled={deletingAll}
              className="px-4 py-1.5 text-xs rounded-lg border-none text-white font-semibold cursor-pointer hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>
              {deletingAll ? "Cancelling…" : `🗑 Cancel All (${withdrawals.length})`}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-[#6B7280] py-10">Loading…</p>
      ) : withdrawals.length === 0 ? (
        <div className="rounded-xl border border-[#1e2035] bg-[#13151f] p-10 text-center text-[#6B7280]">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-medium">No pending withdrawals</p>
          <p className="text-xs mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.values(byUser).map(group => (
            <div key={group.userid} className="rounded-xl border border-[#1e2035] bg-[#13151f] overflow-hidden">
              {/* User header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-[#0d0f1a] border-b border-[#1e2035]">
                {group.thumbnail && <img src={group.thumbnail} alt="" className="w-8 h-8 rounded-full" />}
                <div>
                  <p className="text-sm font-semibold text-white">{group.username}</p>
                  <p className="text-xs text-[#6B7280]">ID: {group.userid} · {group.items.length} item{group.items.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {/* Items */}
              <div className="divide-y divide-[#1e2035]">
                {group.items.map(w => (
                  <div key={String(w._id)} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{w.itemname}</p>
                      <p className="text-xs text-[#6B7280]">Item ID: {w.itemid} · {w.game}</p>
                    </div>
                    <button
                      onClick={() => deleteOne(String(w._id))}
                      disabled={deleting === String(w._id)}
                      className="px-3 py-1 rounded-lg border border-[#EF444440] text-xs text-red-400 cursor-pointer hover:bg-red-900/30 bg-transparent disabled:opacity-40"
                    >
                      {deleting === String(w._id) ? "…" : "Cancel"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Staff Action Logs Tab ──────────────────────────────────────────────────────
function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const fetchLogs = async (p = 1, q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/admin/logs?page=${p}&limit=50&search=${encodeURIComponent(q)}`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      if (res.ok) {
        const d = await res.json();
        setLogs(d.data || []);
        setPage(d.page || 1);
        setPages(d.pages || 1);
      } else toast.error("Failed to load logs");
    } catch { toast.error("Failed to load logs"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(1, ""); }, []);

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchLogs(1, search)}
          placeholder="Search staff, action, or target…"
          className="flex-1 rounded-lg bg-[#13151f] border border-[#1e2035] px-4 py-2.5 text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]" />
        <button onClick={() => fetchLogs(1, search)}
          className="px-5 py-2.5 rounded-lg border-none text-white font-semibold cursor-pointer hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>Search</button>
      </div>

      {loading ? (
        <p className="text-center text-[#6B7280] py-10">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-center text-[#6B7280] py-10">No staff actions recorded yet.</p>
      ) : (
        <div className="rounded-xl border border-[#1e2035] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#13151f] text-[#6B7280] text-left">
                {["Staff","Rank","Action","Target","Details","Source","When"].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l._id || i} className={`border-t border-[#1e2035] ${i % 2 === 0 ? "bg-[#0d0f1a]" : "bg-[#0a0b14]"}`}>
                  <td className="px-4 py-3 font-medium text-white">{l.actorUsername}</td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">{l.actorRank}</td>
                  <td className="px-4 py-3 text-white">{l.action}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{l.target || "—"}</td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs max-w-xs truncate" title={l.details || ""}>{l.details || "—"}</td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">{l.source}</td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => fetchLogs(page - 1, search)} disabled={page <= 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#1e2035] text-[#6B7280] hover:text-white bg-transparent cursor-pointer disabled:opacity-40">
            Prev
          </button>
          <span className="text-xs text-[#6B7280]">Page {page} of {pages}</span>
          <button onClick={() => fetchLogs(page + 1, search)} disabled={page >= pages}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#1e2035] text-[#6B7280] hover:text-white bg-transparent cursor-pointer disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ── Danger Zone Tab ───────────────────────────────────────────────────────────
function DangerTab() {
  const { userData } = useContext(UserContext);
  const [cancellingBets, setCancellingBets] = useState(false);
  const [resettingInv, setResettingInv] = useState(false);
  const isOwner = OWNER_TIER.includes(userData?.rank);

  const cancelAllBets = async () => {
    if (!confirm("⚠️ CANCEL ALL ACTIVE BETS\n\nThis will cancel every active coinflip, dice, blackjack, and mines game and return items to players.\n\nProceed?")) return;
    setCancellingBets(true);
    try {
      const res = await fetch(`${api}/admin/cancel-all-bets`, {
        method: "POST", headers: { authorization: `Bearer ${getauth()}` },
      });
      const d = await res.json();
      res.ok ? toast.success(d.message) : toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setCancellingBets(false); }
  };

  const resetInventories = async () => {
    if (!confirm("⚠️ WIPE ALL INVENTORIES\n\nThis will DELETE every item from every player's inventory.\n\nThis CANNOT be undone. Proceed?")) return;
    setResettingInv(true);
    try {
      const res = await fetch(`${api}/admin/reset-inventories`, {
        method: "POST", headers: { authorization: `Bearer ${getauth()}` },
      });
      const d = await res.json();
      res.ok ? toast.success(d.message) : toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setResettingInv(false); }
  };

  const actions = [
    {
      label: "🚫 Cancel All Active Bets",
      desc: "Cancels every waiting/in-progress coinflip, dice, blackjack, and mines game. Items are returned to each player.",
      btn: "Cancel All Bets",
      color: "#F59E0B",
      loading: cancellingBets,
      onClick: cancelAllBets,
      ownerOnly: false,
    },
    {
      label: "🗑 Reset All Inventories",
      desc: "Permanently deletes every inventory item from every player. Cannot be undone.",
      btn: "Wipe All Inventories",
      color: "#EF4444",
      loading: resettingInv,
      onClick: resetInventories,
      ownerOnly: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#EF444440] bg-[#13151f] p-4">
        <p className="text-xs font-bold text-red-400 mb-1">⚠️ Danger Zone</p>
        <p className="text-xs text-[#6B7280]">Actions here are irreversible. Use with extreme caution.</p>
      </div>
      {actions.map(action => (
        (!action.ownerOnly || isOwner) && (
          <div key={action.label} className="rounded-xl border bg-[#13151f] p-5"
            style={{ borderColor: action.color + "40" }}>
            <p className="text-sm font-bold mb-1" style={{ color: action.color }}>{action.label}</p>
            <p className="text-xs text-[#6B7280] mb-4">{action.desc}</p>
            <button
              onClick={action.onClick}
              disabled={action.loading}
              className="px-5 py-2.5 rounded-lg border-none text-white text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${action.color},${action.color}cc)` }}
            >
              {action.loading ? "Working…" : action.btn}
            </button>
          </div>
        )
      ))}
    </div>
  );
}

// ── Small shared components ───────────────────────────────────────────────────
function InputField({ value, onChange, placeholder, label, type = "text" }) {
  return (
    <div>
      {label && <label className="block text-xs text-[#6B7280] mb-1">{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg bg-[#0d0f1a] border border-[#1e2035] px-3 py-2 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#8B5CF6]" />
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer text-left w-full transition-colors bg-transparent ${value ? "border-[#8B5CF6] bg-[#8B5CF610]" : "border-[#1e2035] hover:border-[#8B5CF640]"}`}>
      <div className={`w-9 h-5 rounded-full flex-shrink-0 flex items-center px-0.5 transition-colors ${value ? "bg-[#8B5CF6]" : "bg-[#1e2035]"}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${value ? "text-white" : "text-[#6B7280]"}`}>{label}</p>
        <p className="text-[10px] text-[#42496B]">{desc}</p>
      </div>
    </button>
  );
}

function Badge({ active, label, color }) {
  const c = color || (active ? "#8B5CF6" : "#42496B");
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
      style={{ color: c, borderColor: c + "50", background: c + "15" }}>
      {active ? "✓" : "✗"} {label}
    </span>
  );
}

// ── Inventory (owner only) ────────────────────────────────────────────────────
function InventoryTab() {
  const { userData } = useContext(UserContext);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { user, inventory }
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferring, setTransferring] = useState(false);

  if (userData?.rank !== "OWNER") {
    return (
      <div className="flex items-center justify-center py-16 text-[#6B7280] text-sm">
        🔒 Owner only
      </div>
    );
  }

  const lookup = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setResult(null);
    setSelected(new Set());
    setShowTransfer(false);
    try {
      const res = await fetch(`${api}/admin/user-inventory/${encodeURIComponent(search.trim())}`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const d = await res.json();
      if (res.ok) setResult(d);
      else toast.error(d.message || "Not found");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  const toggleItem = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!result) return;
    if (selected.size === result.inventory.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(result.inventory.map(i => String(i._id))));
    }
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} item(s) from ${result.user.username}'s inventory? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${api}/admin/user-inventory/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ inventoryIds: [...selected] }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.message);
        setResult(prev => ({
          ...prev,
          inventory: prev.inventory.filter(i => !selected.has(String(i._id))),
        }));
        setSelected(new Set());
      } else toast.error(d.message || "Delete failed");
    } catch { toast.error("Network error"); }
    finally { setDeleting(false); }
  };

  const transferSelected = async () => {
    if (!selected.size) return toast.error("Select items first");
    if (!transferTo.trim()) return toast.error("Enter destination User ID");
    if (!confirm(`Transfer ${selected.size} item(s) from ${result.user.username} to User ID ${transferTo.trim()}? This cannot be undone.`)) return;
    setTransferring(true);
    try {
      const res = await fetch(`${api}/admin/user-inventory/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({
          fromUserId: result.user.userid,
          toUserId: transferTo.trim(),
          inventoryIds: [...selected],
        }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.message);
        setResult(prev => ({
          ...prev,
          inventory: prev.inventory.filter(i => !selected.has(String(i._id))),
        }));
        setSelected(new Set());
        setShowTransfer(false);
        setTransferTo("");
      } else toast.error(d.message || "Transfer failed");
    } catch { toast.error("Network error"); }
    finally { setTransferring(false); }
  };

  const totalSelected = result?.inventory
    .filter(i => selected.has(String(i._id)))
    .reduce((s, i) => s + (i.itemvalue || 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="rounded-xl bg-[#13151f] border border-[#1e2035] p-5">
        <p className="text-sm font-bold mb-3">🔍 View User Inventory</p>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && lookup()}
            placeholder="Enter Roblox User ID…"
            className="flex-1 rounded-lg px-4 py-2.5 text-sm bg-[#0a0b14] border border-[#1e2035] text-white placeholder-[#42496B] outline-none focus:border-[#8B5CF6]"
          />
          <button
            onClick={lookup}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg border-none text-white text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}
          >
            {loading ? "Loading…" : "Lookup"}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-xl bg-[#13151f] border border-[#1e2035] p-5 space-y-4">
          {/* User header */}
          <div className="flex items-center gap-3 flex-wrap">
            {result.user.thumbnail && (
              <img src={result.user.thumbnail} alt="" className="w-10 h-10 rounded-full" />
            )}
            <div>
              <p className="font-bold">{result.user.username}</p>
              <p className="text-xs text-[#6B7280]">ID: {result.user.userid} · {result.inventory.length} items</p>
            </div>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {selected.size > 0 && (
                <span className="text-xs text-[#6B7280]">
                  {selected.size} selected · {fmtVal(totalSelected)}
                </span>
              )}
              <button
                onClick={toggleAll}
                className="px-3 py-1.5 rounded-lg border border-[#1e2035] text-xs text-[#6B7280] hover:text-white cursor-pointer bg-transparent"
              >
                {selected.size === result.inventory.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={() => { setShowTransfer(v => !v); setTransferTo(""); }}
                disabled={!selected.size}
                className="px-4 py-1.5 rounded-lg border-none text-white text-xs font-semibold cursor-pointer hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}
              >
                🔀 Transfer ({selected.size})
              </button>
              <button
                onClick={deleteSelected}
                disabled={!selected.size || deleting}
                className="px-4 py-1.5 rounded-lg border-none text-white text-xs font-semibold cursor-pointer hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}
              >
                {deleting ? "Deleting…" : `🗑 Delete (${selected.size})`}
              </button>
            </div>
          </div>

          {/* Transfer panel */}
          {showTransfer && (
            <div className="rounded-xl border border-[#F59E0B40] bg-[#0d0f1a] p-4">
              <p className="text-xs font-bold text-[#F59E0B] mb-3">
                🔀 Transfer {selected.size} item{selected.size !== 1 ? "s" : ""} from <span className="text-white">{result.user.username}</span> to:
              </p>
              <div className="flex gap-2">
                <input
                  value={transferTo}
                  onChange={e => setTransferTo(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && transferSelected()}
                  placeholder="Destination Roblox User ID…"
                  className="flex-1 rounded-lg px-3 py-2 text-sm bg-[#0a0b14] border border-[#F59E0B60] text-white placeholder-[#42496B] outline-none focus:border-[#F59E0B]"
                />
                <button
                  onClick={transferSelected}
                  disabled={transferring || !transferTo.trim()}
                  className="px-4 py-2 rounded-lg border-none text-white text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}
                >
                  {transferring ? "Transferring…" : "Confirm Transfer"}
                </button>
                <button
                  onClick={() => { setShowTransfer(false); setTransferTo(""); }}
                  className="px-3 py-2 rounded-lg border border-[#1e2035] bg-transparent text-[#6B7280] text-sm cursor-pointer hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[10px] text-[#6B7280] mt-2">Only the selected items will be transferred. Items locked in active games will still move — use with care.</p>
            </div>
          )}

          {/* Item grid */}
          {result.inventory.length === 0 ? (
            <p className="text-sm text-[#6B7280] text-center py-8">Inventory is empty.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[600px] overflow-y-auto pr-1">
              {result.inventory.map(item => {
                const sel = selected.has(String(item._id));
                return (
                  <button
                    key={String(item._id)}
                    onClick={() => toggleItem(String(item._id))}
                    className="rounded-xl p-2 text-left cursor-pointer border transition-all"
                    style={{
                      background: sel ? "#8B5CF620" : "#0a0b14",
                      borderColor: sel ? "#8B5CF6" : "#1e2035",
                    }}
                  >
                    {item.itemimage && (
                      <img src={item.itemimage} alt="" className="w-full aspect-square object-contain rounded-lg mb-1" />
                    )}
                    <p className="text-[10px] font-semibold text-white truncate">{item.itemname}</p>
                    <p className="text-[10px] text-[#6B7280]">{fmtVal(item.itemvalue)}</p>
                    {item.locked && <p className="text-[9px] text-yellow-400">🔒 locked</p>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cases Tab ─────────────────────────────────────────────────────────────────
function CasesTab() {
  const [cases, setCases] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCase, setEditingCase] = useState(null);

  // Form state
  const [form, setForm] = useState({ name: "", image: "", cost: "" });
  const [caseItems, setCaseItems] = useState([]); // [{itemid, weight, rarity}]
  const [itemSearch, setItemSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

  const authH = { authorization: `Bearer ${getauth()}` };

  const loadCases = () => {
    setLoading(true);
    fetch(`${api}/admin/cases`, { headers: authH })
      .then(r => r.json())
      .then(d => { if (d.success) setCases(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadItems = () => {
    fetch(`${api}/admin/items`, { headers: authH })
      .then(r => r.json())
      .then(d => { if (d.success) setAllItems(d.data); })
      .catch(() => {});
  };

  useEffect(() => { loadCases(); loadItems(); }, []);

  const openCreate = () => {
    setForm({ name: "", image: "", cost: "" });
    setCaseItems([]);
    setEditingCase(null);
    setShowCreate(true);
  };

  const openEdit = (c) => {
    setForm({ name: c.name, image: c.image, cost: String(c.cost) });
    setCaseItems(c.items.map(i => ({ itemid: i.itemid, weight: i.weight, rarity: i.rarity, itemname: i.itemname, itemimage: i.itemimage })));
    setEditingCase(c);
    setShowCreate(true);
  };

  const addItemToCase = (item) => {
    if (caseItems.find(i => i.itemid === item.itemid)) return;
    setCaseItems(prev => [...prev, { itemid: item.itemid, weight: 10, rarity: "common", itemname: item.itemname, itemimage: item.itemimage }]);
    setItemSearch("");
  };

  const removeItemFromCase = (itemid) => {
    setCaseItems(prev => prev.filter(i => i.itemid !== itemid));
  };

  const updateCaseItem = (itemid, field, value) => {
    setCaseItems(prev => prev.map(i => i.itemid === itemid ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const image = form.image.trim();
    const cost = Number(form.cost);
    const missing = [];
    if (!name) missing.push("name");
    if (!image) missing.push("image");
    if (!form.cost || !Number.isFinite(cost) || cost <= 0) missing.push("cost");
    if (missing.length) { toast.error(`Missing/invalid: ${missing.join(", ")}`); return; }
    if (caseItems.length < 2) { toast.error("Add at least 2 items to the case"); return; }
    setSaving(true);
    try {
      const payload = {
        name,
        image,
        cost,
        items: caseItems.map(({ itemid, weight, rarity }) => ({ itemid, weight: Number(weight), rarity })),
      };
      const url = editingCase ? `${api}/admin/cases/${editingCase._id}` : `${api}/admin/cases`;
      const method = editingCase ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { ...authH, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (d.success) {
        toast.success(editingCase ? "Case updated!" : "Case created!");
        setShowCreate(false);
        loadCases();
      } else {
        toast.error(d.message || "Failed");
      }
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  };

  const handleToggle = async (c) => {
    await fetch(`${api}/admin/cases/${c._id}`, {
      method: "PUT",
      headers: { ...authH, "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    loadCases();
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete case "${c.name}"? This cannot be undone.`)) return;
    await fetch(`${api}/admin/cases/${c._id}`, { method: "DELETE", headers: authH });
    toast.success("Case deleted");
    loadCases();
  };

  const filteredItems = allItems.filter(i =>
    i.itemname?.toLowerCase().includes(itemSearch.toLowerCase()) && !caseItems.find(ci => ci.itemid === i.itemid)
  ).slice(0, 20);

  const RARITY_COLORS = { common: "#4ade80", uncommon: "#38bdf8", rare: "#a78bfa", epic: "#e879f9", legendary: "#fbbf24" };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white">Cases</h2>
          <p className="text-xs text-[#6B7280]">{cases.length} case{cases.length !== 1 ? "s" : ""} total</p>
        </div>
        <button onClick={openCreate}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white border-none cursor-pointer hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#38bdf8,#0ea5e9)" }}>
          + Create Case
        </button>
      </div>

      {/* Create / Edit form */}
      {showCreate && (
        <div className="mb-6 rounded-2xl border border-[#1e2035] bg-[#0c0e1a] p-5">
          <h3 className="text-sm font-bold text-white mb-4">{editingCase ? "Edit Case" : "Create New Case"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Case Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Starter Case"
                className="w-full rounded-lg px-3 py-2 text-sm text-white border border-[#1e2035] bg-[#0a0b14] outline-none focus:border-[#38bdf8]" />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Image URL</label>
              <input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))}
                placeholder="https://..."
                className="w-full rounded-lg px-3 py-2 text-sm text-white border border-[#1e2035] bg-[#0a0b14] outline-none focus:border-[#38bdf8]" />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Cost (gems)</label>
              <input value={form.cost}
                onChange={e => setForm(p => ({ ...p, cost: e.target.value.replace(/[^0-9]/g, "") }))}
                placeholder="e.g. 10000000" type="text" inputMode="numeric"
                className="w-full rounded-lg px-3 py-2 text-sm text-white border border-[#1e2035] bg-[#0a0b14] outline-none focus:border-[#38bdf8]" />
            </div>
          </div>

          {/* Item search */}
          <div className="mb-3">
            <label className="text-xs text-[#6B7280] mb-1 block">Add Items from Database</label>
            <input value={itemSearch} onChange={e => setItemSearch(e.target.value)}
              placeholder="Search items by name…"
              className="w-full rounded-lg px-3 py-2 text-sm text-white border border-[#1e2035] bg-[#0a0b14] outline-none focus:border-[#38bdf8] mb-2" />
            {itemSearch && filteredItems.length > 0 && (
              <div className="rounded-xl border border-[#1e2035] bg-[#0a0b14] max-h-40 overflow-y-auto">
                {filteredItems.map(item => (
                  <button key={item.itemid} onClick={() => addItemToCase(item)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#1e2035] border-none bg-transparent cursor-pointer">
                    {item.itemimage && <img src={item.itemimage} alt="" style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4 }} />}
                    <span className="text-sm text-white flex-1">{item.itemname}</span>
                    <span className="text-xs text-[#6B7280]">{fmtVal(item.itemvalue)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Case items list */}
          {caseItems.length > 0 && (
            <div className="mb-4">
              <label className="text-xs text-[#6B7280] mb-2 block">Items in Case ({caseItems.length})</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {caseItems.map(item => (
                  <div key={item.itemid} className="flex items-center gap-2 rounded-lg border border-[#1e2035] bg-[#0a0b14] p-2">
                    {item.itemimage && <img src={item.itemimage} alt="" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 4, flexShrink: 0 }} />}
                    <span className="text-sm text-white flex-1 truncate">{item.itemname}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <label className="text-[10px] text-[#6B7280]">Weight</label>
                      <input type="number" value={item.weight} min={1}
                        onChange={e => updateCaseItem(item.itemid, "weight", e.target.value)}
                        className="w-14 rounded px-2 py-1 text-xs text-white border border-[#1e2035] bg-[#0c0e1a] outline-none text-center" />
                    </div>
                    <select value={item.rarity} onChange={e => updateCaseItem(item.itemid, "rarity", e.target.value)}
                      className="rounded px-2 py-1 text-xs border border-[#1e2035] bg-[#0c0e1a] outline-none flex-shrink-0"
                      style={{ color: RARITY_COLORS[item.rarity] || "#fff" }}>
                      {RARITIES.map(r => <option key={r} value={r} style={{ color: RARITY_COLORS[r] }}>{r}</option>)}
                    </select>
                    <button onClick={() => removeItemFromCase(item.itemid)}
                      className="text-[#6B7280] hover:text-red-400 bg-transparent border-none cursor-pointer text-sm px-1">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white border-none cursor-pointer disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#38bdf8,#0ea5e9)" }}>
              {saving ? "Saving…" : editingCase ? "Save Changes" : "Create Case"}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[#6B7280] border border-[#1e2035] bg-transparent cursor-pointer hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cases list */}
      {loading ? (
        <div className="text-center text-[#6B7280] py-10">Loading cases…</div>
      ) : cases.length === 0 ? (
        <div className="text-center text-[#6B7280] py-10">No cases yet. Create your first one!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map(c => (
            <div key={c._id} className="rounded-2xl border border-[#1e2035] bg-[#0c0e1a] overflow-hidden">
              <div className="relative h-32 bg-[#0a0b14]">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e1a] to-transparent" />
                <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${c.active ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                  {c.active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <div className="p-3">
                <div className="text-sm font-bold text-white mb-0.5">{c.name}</div>
                <div className="text-xs text-[#6B7280] mb-2">{fmtVal(c.cost)} gems · {c.items.length} items</div>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(c)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white border border-[#38bdf8] bg-transparent cursor-pointer hover:bg-[#38bdf820]">
                    Edit
                  </button>
                  <button onClick={() => handleToggle(c)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${c.active ? "text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10" : "text-green-400 border-green-400/30 hover:bg-green-400/10"} bg-transparent`}>
                    {c.active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => handleDelete(c)}
                    className="py-1.5 px-2 rounded-lg text-xs font-semibold text-red-400 border border-red-400/30 bg-transparent cursor-pointer hover:bg-red-400/10">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Giveaways ─────────────────────────────────────────────────────────────────
function GiveawaysTab() {
  const { userData } = useContext(UserContext);
  const [gws, setGws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  // Create form state
  const [createItemId, setCreateItemId] = useState("");
  const [createItemSearch, setCreateItemSearch] = useState("");
  const [createItemResults, setCreateItemResults] = useState([]);
  const [createItemSelected, setCreateItemSelected] = useState(null);
  const [createDuration, setCreateDuration] = useState(30);
  const [createMinLevel, setCreateMinLevel] = useState(0);
  const [creating, setCreating] = useState(false);

  const isOwner = OWNER_TIER.includes(userData?.rank);

  const fetchGiveaways = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/admin/giveaways`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      if (res.ok) {
        const d = await res.json();
        setGws(d.data || []);
      } else {
        toast.error("Failed to load giveaways");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGiveaways(); }, []);

  const cancelGiveaway = async (gw) => {
    if (!confirm(`Cancel giveaway by ${gw.starterusername} for "${gw.item?.[0]?.itemname}"?\n\nThe item will be refunded to the creator immediately. This cannot be undone.`)) return;
    setCancelling(gw._id);
    try {
      const res = await fetch(`${api}/admin/giveaways/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ giveawayid: gw._id }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.message);
        fetchGiveaways();
      } else {
        toast.error(d.message || "Cancel failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setCancelling(null);
    }
  };

  const timeLeft = (enddate) => {
    const diff = new Date(enddate) - Date.now();
    if (diff <= 0) return "Expired";
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  const searchItems = async (q) => {
    if (!q || q.length < 2) { setCreateItemResults([]); return; }
    try {
      const r = await fetch(`${api}/admin/items?search=${encodeURIComponent(q)}&limit=8`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      if (r.ok) { const d = await r.json(); setCreateItemResults(d.data?.slice(0, 8) || []); }
    } catch {}
  };

  const handleCreateGiveaway = async () => {
    if (!createItemSelected) return toast.error("Select an item first.");
    setCreating(true);
    try {
      const res = await fetch(`${api}/admin/giveaways/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ itemid: createItemSelected.itemid, duration: Number(createDuration), minLevel: Number(createMinLevel) }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.message);
        setCreateItemSelected(null); setCreateItemSearch(""); setCreateItemResults([]);
        setCreateDuration(30); setCreateMinLevel(0);
        fetchGiveaways();
      } else {
        toast.error(d.message || "Failed to create giveaway");
      }
    } catch { toast.error("Network error"); }
    finally { setCreating(false); }
  };

  return (
    <div>
      {/* ── Create Giveaway ── */}
      <div className="rounded-xl border border-[#1e2035] bg-[#13151f] p-4 mb-5">
        <h3 className="text-sm font-bold text-white mb-3">🎁 Create Admin Giveaway</h3>
        <div className="flex flex-col gap-3">
          {/* Item search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search item name…"
              value={createItemSearch}
              onChange={(e) => { setCreateItemSearch(e.target.value); setCreateItemSelected(null); searchItems(e.target.value); }}
              className="w-full px-3 py-2 rounded-lg bg-[#0d0f1a] border border-[#1e2035] text-white text-xs placeholder-[#6B7280] outline-none"
            />
            {createItemResults.length > 0 && !createItemSelected && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-lg border border-[#1e2035] bg-[#0d0f1a] overflow-hidden shadow-xl">
                {createItemResults.map((it) => (
                  <button
                    key={it.itemid}
                    onClick={() => { setCreateItemSelected(it); setCreateItemSearch(it.itemname); setCreateItemResults([]); setCreateItemId(String(it.itemid)); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-[#1e2035] cursor-pointer border-none bg-transparent"
                  >
                    {it.itemimage && <img src={it.itemimage} alt="" className="w-6 h-6 object-contain rounded" />}
                    <span className="flex-1 truncate">{it.itemname}</span>
                    <span className="text-[#6B7280]">{it.game} · {fmtVal(it.itemvalue)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {createItemSelected && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d0f1a] border border-[#8B5CF6]">
              {createItemSelected.itemimage && <img src={createItemSelected.itemimage} alt="" className="w-8 h-8 object-contain rounded" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{createItemSelected.itemname}</p>
                <p className="text-[10px] text-[#8B5CF6]">{fmtVal(createItemSelected.itemvalue)}</p>
              </div>
              <button onClick={() => { setCreateItemSelected(null); setCreateItemSearch(""); }} className="text-[#6B7280] hover:text-white text-lg leading-none bg-transparent border-none cursor-pointer">×</button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1 block">Duration (mins)</label>
              <input type="number" min="1" max="1440" value={createDuration} onChange={(e) => setCreateDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0d0f1a] border border-[#1e2035] text-white text-xs outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1 block">Min Level to Join</label>
              <select value={createMinLevel} onChange={(e) => setCreateMinLevel(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0d0f1a] border border-[#1e2035] text-white text-xs outline-none cursor-pointer">
                {[0,1,2,3,4,5,10,15,20,25,50,100].map(l => (
                  <option key={l} value={l}>Level {l}+</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleCreateGiveaway}
            disabled={creating || !createItemSelected}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}
          >
            {creating ? "Creating…" : "🎁 Start Giveaway"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Active Giveaways</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {isOwner ? "Owner tier — cancel & refund any active giveaway to its creator." : "View only — cancel requires Owner tier."}
          </p>
        </div>
        <button
          onClick={fetchGiveaways}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#1e2035] text-[#6B7280] hover:text-white bg-transparent cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-center text-[#6B7280] py-10">Loading…</p>
      ) : gws.length === 0 ? (
        <div className="rounded-xl border border-[#1e2035] bg-[#13151f] p-8 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm text-[#6B7280]">No active giveaways right now.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1e2035] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#13151f] text-[#6B7280] text-left">
                {["Item", "Host", "Value", "Min Level", "Entries", "Time Left", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gws.map((gw, i) => {
                const item = gw.item?.[0];
                return (
                  <tr
                    key={gw._id}
                    className={`border-t border-[#1e2035] ${i % 2 === 0 ? "bg-[#0d0f1a]" : "bg-[#0a0b14]"}`}
                  >
                    {/* Item */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item?.itemimage && (
                          <img
                            src={item.itemimage}
                            alt={item.itemname}
                            className="w-9 h-9 rounded-lg object-contain bg-[#13151f] border border-[#1e2035] flex-shrink-0"
                          />
                        )}
                        <span className="font-medium text-white truncate max-w-[140px]">
                          {item?.itemname ?? "—"}
                        </span>
                      </div>
                    </td>

                    {/* Host */}
                    <td className="px-4 py-3 text-[#6B7280]">
                      <span className="font-mono text-xs">{gw.starterusername}</span>
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#8B5CF6]">
                        {item?.itemvalue != null ? fmtVal(item.itemvalue) : "—"}
                      </span>
                    </td>

                    {/* Min Level */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                        Lv {gw.minLevel ?? 0}+
                      </span>
                    </td>

                    {/* Entries */}
                    <td className="px-4 py-3 text-white font-semibold">
                      {gw.entries ?? 0}
                    </td>

                    {/* Time left */}
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${new Date(gw.enddate) <= Date.now() ? "text-red-400" : "text-green-400"}`}>
                        {timeLeft(gw.enddate)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {isOwner ? (
                        <button
                          onClick={() => cancelGiveaway(gw)}
                          disabled={cancelling === gw._id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border-none text-white cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}
                        >
                          {cancelling === gw._id ? "Cancelling…" : "Cancel & Refund"}
                        </button>
                      ) : (
                        <span className="text-xs text-[#6B7280]">Owner only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Affiliates ────────────────────────────────────────────────────────────────
function AffiliatesTab() {
  const { userData } = useContext(UserContext);
  const [codes, setCodes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [setTarget, setSetTarget] = useState("");
  const [setCodeVal, setSetCodeVal] = useState("");
  const [setSaving, setSetSaving] = useState(false);
  const [removing,  setRemoving]  = useState(null);

  const isOwner = OWNER_TIER.includes(userData?.rank);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${api}/admin/affiliates`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      if (r.ok) { const d = await r.json(); setCodes(d.data || []); }
      else toast.error("Failed to load affiliate codes");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleSetCode = async () => {
    if (!setTarget || !setCodeVal) return toast.error("Enter a user ID and a code.");
    setSetSaving(true);
    try {
      const r = await fetch(`${api}/admin/affiliates/setcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ userid: setTarget, code: setCodeVal }),
      });
      const d = await r.json();
      if (r.ok) { toast.success(d.message); setSetTarget(""); setSetCodeVal(""); fetchCodes(); }
      else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSetSaving(false); }
  };

  const handleRemove = async (userid, code) => {
    if (!confirm(`Remove affiliate code "${code}" from user ${userid}?`)) return;
    setRemoving(userid);
    try {
      const r = await fetch(`${api}/admin/affiliates/${userid}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const d = await r.json();
      if (r.ok) { toast.success(d.message); fetchCodes(); }
      else toast.error(d.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setRemoving(null); }
  };

  const filtered = codes.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.ownerusername.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Affiliate Codes</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">View and manage all user affiliate codes.</p>
        </div>
        <button onClick={fetchCodes} className="px-3 py-1.5 text-xs rounded-lg border border-[#1e2035] text-[#6B7280] hover:text-white bg-transparent cursor-pointer">
          Refresh
        </button>
      </div>

      {isOwner && (
        <div className="rounded-xl border border-[#1e2035] bg-[#13151f] p-4 mb-4">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">Set Code For User</p>
          <div className="flex gap-2 flex-wrap">
            <input value={setTarget} onChange={(e) => setSetTarget(e.target.value)} placeholder="User ID"
              className="flex-1 min-w-[120px] bg-[#0d0f1a] border border-[#1e2035] rounded-lg px-3 py-2 text-sm text-white outline-none" />
            <input value={setCodeVal} onChange={(e) => setSetCodeVal(e.target.value)} placeholder="Code (e.g. TEDDE99)" maxLength={20}
              className="flex-1 min-w-[160px] bg-[#0d0f1a] border border-[#1e2035] rounded-lg px-3 py-2 text-sm text-white outline-none" />
            <button onClick={handleSetCode} disabled={setSaving || !setTarget || !setCodeVal}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white border-none cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}>
              {setSaving ? "Saving..." : "Set Code"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by code or username..."
          className="w-full bg-[#13151f] border border-[#1e2035] rounded-lg px-3 py-2 text-sm text-white outline-none" />
      </div>

      {loading ? (
        <p className="text-center text-[#6B7280] py-10">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#1e2035] bg-[#13151f] p-8 text-center">
          <p className="text-2xl mb-2">🔗</p>
          <p className="text-sm text-[#6B7280]">{search ? "No codes match that search." : "No affiliate codes yet."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1e2035] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#13151f] text-[#6B7280] text-left">
                {["Code", "Owner", "Uses", "Claimed", "Pending", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c._id} className={`border-t border-[#1e2035] ${i % 2 === 0 ? "bg-[#0d0f1a]" : "bg-[#0a0b14]"}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-[#8B5CF6]">{c.code}</span>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">
                    <span className="font-mono text-xs">{c.ownerusername}</span>
                    <span className="block text-[10px] text-[#444]">ID: {c.ownerid}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{c.uses}</td>
                  <td className="px-4 py-3 text-green-400 font-semibold">{c.claimed}</td>
                  <td className="px-4 py-3 text-yellow-400 font-semibold">{c.unclaimed}</td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <button onClick={() => handleRemove(c.ownerid, c.code)} disabled={removing === c.ownerid}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border-none text-white cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>
                        {removing === c.ownerid ? "Removing..." : "Remove"}
                      </button>
                    ) : (
                      <span className="text-xs text-[#6B7280]">Owner only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
