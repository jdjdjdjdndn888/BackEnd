import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../../utils/user.js";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import toast from "react-hot-toast";
import NotifyModal from "../notifications/NotifyModal.jsx";

const TABS = ["Overview", "Users", "Items", "Bots", "Inventory"];
const GAMES = ["PS99", "MM2"];

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
    if (userData && userData.rank !== "OWNER" && userData.rank !== "ADMIN") navigate("/");
  }, [userData]);

  if (!userData || (userData.rank !== "OWNER" && userData.rank !== "ADMIN")) {
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
            <p className="text-xs text-[#6B7280]">PS99Bet · {userData.username} ({userData.rank})</p>
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

        {tab === "Overview"   && <OverviewTab />}
        {tab === "Users"      && <UsersTab />}
        {tab === "Items"      && <ItemsTab />}
        {tab === "Bots"       && <BotsTab />}
        {tab === "Inventory"  && <InventoryTab />}
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
                    <select value={u.rank || "user"} onChange={e => setRank(u.userid, e.target.value)}
                      className="bg-[#1C1F2E] border border-[#252839] rounded px-2 py-1 text-white text-xs cursor-pointer">
                      {["user","mod","ADMIN","OWNER"].map(r => <option key={r} value={r}>{r}</option>)}
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
          <div className="flex items-center gap-3">
            {result.user.thumbnail && (
              <img src={result.user.thumbnail} alt="" className="w-10 h-10 rounded-full" />
            )}
            <div>
              <p className="font-bold">{result.user.username}</p>
              <p className="text-xs text-[#6B7280]">ID: {result.user.userid} · {result.inventory.length} items</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {selected.size > 0 && (
                <span className="text-xs text-[#6B7280]">
                  {selected.size} selected · R${fmtVal(totalSelected)}
                </span>
              )}
              <button
                onClick={toggleAll}
                className="px-3 py-1.5 rounded-lg border border-[#1e2035] text-xs text-[#6B7280] hover:text-white cursor-pointer bg-transparent"
              >
                {selected.size === result.inventory.length ? "Deselect All" : "Select All"}
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
                    <p className="text-[10px] text-[#6B7280]">R${fmtVal(item.itemvalue)}</p>
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
