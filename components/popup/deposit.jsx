import React, { useState, useEffect, useCallback, useRef } from "react";
import { useModal } from "../../utils/ModalContext";
import DepositStyles from "./deposit.module.css";
import toast from "react-hot-toast";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import Profile from "./profile.jsx";

// ── Bot list shared component ─────────────────────────────────────────────────
function BotList({ game }) {
  const { setModalState } = useModal();
  const [loading, setLoading] = useState(false);
  const [bots, setBots] = useState([]);
  const [responseCode, setResponseCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setResponseCode("");
    setBots([]);
    fetch(`${api}/bots/${game}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.bots) { setBots(data.bots); setResponseCode(data.code); }
      })
      .catch(() => toast.error("Could not fetch the bots!"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [game]);

  if (loading) return (
    <div className={DepositStyles.loaderWrapper}>
      <div className={DepositStyles.loader} />
    </div>
  );

  if (!bots.length) return (
    <div className={DepositStyles.discorder}>
      <p>No bots available — join our Discord!</p>
      <button className="button" onClick={() => window.open("https://discord.gg/5gAJ8mBh", "_blank")}>Join Discord</button>
    </div>
  );

  return (
    <>
      {responseCode && (
        <div className={DepositStyles.responseCode}>
          <p>Your Code: <span className={DepositStyles.actualcode}>{responseCode}</span></p>
          <p>The bot will always tell you the code when trading with them!</p>
        </div>
      )}
      <ul className={DepositStyles.botList}>
        {bots.map((bot, i) => (
          <li key={i} className={DepositStyles.botItem}>
            <div className={DepositStyles.botDetails}>
              <div className={DepositStyles.statusWrapper}>
                <img src={bot.pfp} alt={bot.name} className={DepositStyles.botPfp}
                  onClick={() => setModalState(<Profile userid={bot.userid || 1} />)} />
                <span className={DepositStyles.botName}>{bot.name}</span>
                <div className={DepositStyles.circle_holder}>
                  <div className={`${DepositStyles.online_circle} ${bot.online ? DepositStyles.online_circle_active : DepositStyles.online_circle_inactive}`} />
                  <div className={`${DepositStyles.inner_circle} ${bot.online ? DepositStyles.inner_circle_active : DepositStyles.inner_circle_inactive}`} />
                </div>
              </div>
              <button onClick={() => bot.online ? window.open(bot.link, "_blank") : toast.error("Bot is offline!")}
                className={`${DepositStyles.joinbutton} button`}>Join</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

// ── Item search + request for PS99 ────────────────────────────────────────────
function ItemSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqValue, setReqValue] = useState("");
  const [reqImage, setReqImage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const debounce = useRef(null);

  const search = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setSearching(true);
    try {
      const r = await fetch(`${api}/items/search?q=${encodeURIComponent(q)}&game=PS99`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const d = await r.json();
      setResults(d.items || []);
      setSearched(true);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setShowRequest(false);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(v), 400);
  };

  const submitRequest = async () => {
    if (!reqName.trim() || !reqValue) return toast.error("Name and value are required.");
    setSubmitting(true);
    try {
      const r = await fetch(`${api}/items/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ itemname: reqName, itemvalue: Number(reqValue), itemimage: reqImage }),
      });
      const d = await r.json();
      if (r.ok) { toast.success(d.message); setShowRequest(false); setReqName(""); setReqValue(""); setReqImage(""); }
      else toast.error(d.message || "Failed to send request.");
    } catch { toast.error("Request failed."); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ marginTop: 16, padding: "0 2px" }}>
      <p style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>Search depositable PS99 items:</p>
      <div style={{ position: "relative" }}>
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search item name..."
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#10121d", border: "1px solid #252839",
            borderRadius: 8, padding: "9px 12px", fontSize: 13,
            color: "#fff", outline: "none",
          }}
        />
        {searching && (
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 12 }}>
            Searching...
          </span>
        )}
      </div>

      {/* Results */}
      {searched && !searching && (
        <div style={{ marginTop: 8 }}>
          {results.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, maxHeight: 180, overflowY: "auto" }}>
              {results.map((item) => (
                <div key={item.itemid} style={{
                  background: "#10121d", border: "1px solid #252839", borderRadius: 8,
                  padding: "8px 6px", textAlign: "center",
                }}>
                  {item.itemimage && <img src={item.itemimage} alt={item.itemname} style={{ width: 36, height: 36, objectFit: "contain" }} />}
                  <p style={{ color: "#ccc", fontSize: 10, marginTop: 4, lineHeight: 1.3 }}>{item.itemname}</p>
                  <p style={{ color: "#8B5CF6", fontSize: 10, fontWeight: 700 }}>R${(item.itemvalue || 0).toLocaleString()}</p>
                  <span style={{ fontSize: 9, color: "#3d8", fontWeight: 600 }}>✓ Depositable</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "12px 0", color: "#888", fontSize: 13 }}>
              <p>Item not found in database.</p>
              <button
                onClick={() => { setShowRequest(true); setReqName(query.trim()); }}
                style={{
                  marginTop: 8, background: "#8B5CF6", border: "none", borderRadius: 6,
                  color: "#fff", padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                + Request to Add
              </button>
            </div>
          )}
        </div>
      )}

      {/* Request form */}
      {showRequest && (
        <div style={{
          marginTop: 12, background: "#10121d", border: "1px solid #252839",
          borderRadius: 10, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8,
        }}>
          <p style={{ color: "#ccc", fontSize: 12, fontWeight: 700, margin: 0 }}>Request Item to be Added</p>
          <input value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="Item name *"
            style={{ background: "#0c0e1a", border: "1px solid #252839", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none" }} />
          <input value={reqValue} onChange={(e) => setReqValue(e.target.value)} placeholder="Value in R$ *" type="number" min="1"
            style={{ background: "#0c0e1a", border: "1px solid #252839", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none" }} />
          <input value={reqImage} onChange={(e) => setReqImage(e.target.value)} placeholder="Image URL (optional)"
            style={{ background: "#0c0e1a", border: "1px solid #252839", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={submitRequest} disabled={submitting}
              style={{ flex: 1, background: "#8B5CF6", border: "none", borderRadius: 6, color: "#fff", padding: "8px", fontSize: 12, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Sending..." : "Send Request"}
            </button>
            <button onClick={() => setShowRequest(false)}
              style={{ background: "transparent", border: "1px solid #252839", borderRadius: 6, color: "#888", padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Deposit Modal ─────────────────────────────────────────────────────────
export default function Deposit() {
  const { setModalState } = useModal();
  const [tab, setTab] = useState("PS99");
  const [isClosing, setIsClosing] = useState(false);

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => setModalState(null), 200);
  };

  const tabs = ["PS99", "SAB"];

  return (
    <div className={DepositStyles.blurbg} onClick={closeModal}>
      <div
        className={`${DepositStyles.modalbackgrounddeposit} ${isClosing ? DepositStyles.shrinkOut : ""}`}
        style={{ height: "auto", maxHeight: "85vh", overflowY: "auto", maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={DepositStyles.closeButton} onClick={closeModal}>&times;</button>

        <div className={DepositStyles.modalContent} style={{ gap: 0 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h1 className={DepositStyles.depositTitle}>Deposit</h1>
            {/* Tab pills */}
            <div style={{ display: "flex", gap: 6, marginRight: 36 }}>
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "5px 16px", borderRadius: 999, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: tab === t ? "#8B5CF6" : "#10121d",
                  color: tab === t ? "#fff" : "#666",
                  transition: "background 0.15s",
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Bot list for active tab */}
          <BotList game={tab} />

          {/* PS99 item search */}
          {tab === "PS99" && <ItemSearch />}

          {/* Footer */}
          <div className={DepositStyles.footer} style={{ position: "relative", marginTop: 16, padding: "10px 0 0" }}>
            <p>Always verify that the username of your trading partner matches exactly; users often impersonate bots with similar names.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
