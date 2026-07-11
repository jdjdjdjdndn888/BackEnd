import React, { useState, useEffect, useContext, useCallback } from "react";
import UserContext from "../../utils/user.js";
import SocketContext from "../../utils/socket.js";
import { useModal } from "../../utils/ModalContext.jsx";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import toast from "react-hot-toast";
import LoginModal from "../popup/login.jsx";
import CreateTradeListing from "./CreateTradeListing.jsx";
import SendTradeRequest from "./SendTradeRequest.jsx";
import { formatLargeNumber } from "@/utils/value";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, ArrowLeftRight, ChevronDown } from "lucide-react";

const S = {
  page:       { boxSizing: "border-box", background: "linear-gradient(180deg, rgba(4,12,14,0.45) 0%, rgba(4,12,14,0.82) 55%, #040c0e 100%), url(/bg-trades.jpg) center/cover no-repeat fixed", minHeight: "100%", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" },
  header:     { borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  statsBar:   { borderBottom: "1px solid rgba(255,255,255,0.07)", display: "grid", gridTemplateColumns: "repeat(3,1fr)" },
  statCell:   (i) => ({ padding: "16px 20px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }),
  controls:   { borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  tab:        (active) => ({ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#fff" : "#555", background: "transparent", border: "none", borderBottom: active ? "2px solid #fff" : "2px solid transparent", padding: "8px 16px 10px", cursor: "pointer", marginBottom: -1 }),
  btnPrimary: { display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  card:       { background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden" },
  divider:    { height: 1, background: "rgba(255,255,255,0.06)", margin: "0" },
};

export default function Trades() {
  const { userData } = useContext(UserContext);
  const socket = useContext(SocketContext);
  const { setModalState } = useModal();
  const [listings, setListings] = useState([]);
  const [gameFilter, setGameFilter] = useState("all");
  const [tab, setTab] = useState("browse");
  const [myListings, setMyListings] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  const fetchListings = useCallback(async () => {
    try {
      const url = gameFilter === "all" ? `${api}/trades` : `${api}/trades?game=${gameFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setListings(data.data);
    } catch { toast.error("Failed to load listings."); }
  }, [gameFilter]);

  const fetchMine = useCallback(async () => {
    if (!userData) return;
    try {
      const res = await fetch(`${api}/trades/mine`, { headers: { authorization: `Bearer ${getauth()}` } });
      const data = await res.json();
      if (res.ok) { setMyListings(data.data.listings); setMyRequests(data.data.requests); }
    } catch {}
  }, [userData]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { if (tab === "mine") fetchMine(); }, [tab, fetchMine]);

  useEffect(() => {
    socket.on("NEW_TRADE", (listing) => {
      if (gameFilter === "all" || listing.game === gameFilter)
        setListings((p) => [listing, ...p]);
    });
    socket.on("TRADE_CANCELLED", ({ _id }) => {
      setListings((p) => p.filter((l) => String(l._id) !== String(_id)));
      setMyListings((p) => p.filter((l) => String(l._id) !== String(_id)));
    });
    return () => { socket.off("NEW_TRADE"); socket.off("TRADE_CANCELLED"); };
  }, [socket, gameFilter]);

  const cancelListing = async (tradeid) => {
    try {
      const res = await fetch(`${api}/trades/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${getauth()}` },
        body: JSON.stringify({ tradeid }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Listing cancelled!");
        setMyListings((p) => p.filter((l) => String(l._id) !== String(tradeid)));
        setListings((p) => p.filter((l) => String(l._id) !== String(tradeid)));
      } else toast.error(data.message);
    } catch { toast.error("Something went wrong."); }
  };

  const openCreate = () => {
    if (!userData) return setModalState(<LoginModal />);
    setModalState(<CreateTradeListing onCreated={(l) => setMyListings((p) => [l, ...p])} />);
  };

  const openRequest = (listing) => {
    if (!userData) return setModalState(<LoginModal />);
    if (listing.ownerid === userData.userid) return toast.error("This is your own listing!");
    setModalState(<SendTradeRequest listing={listing} />);
  };

  const totalValue = listings.reduce((s, l) => s + (l.totalValue || 0), 0);
  const uniquePlayers = new Set(listings.map((l) => l.ownerid)).size;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#555", textTransform: "uppercase", fontWeight: 600, marginRight: 20 }}>Trades</span>
          {["browse", "mine"].map((t) => (
            <button key={t} style={S.tab(tab === t)} onClick={() => { setTab(t); if (t === "mine") fetchMine(); }}>
              {t === "browse" ? "Browse" : "My Trades"}
            </button>
          ))}
        </div>
        <button style={S.btnPrimary} onClick={openCreate}><Plus size={14} /> List Items</button>
      </div>

      {/* Stats bar */}
      <div style={S.statsBar}>
        {[
          { label: "LISTINGS",       value: listings.length.toLocaleString() },
          { label: "TOTAL VALUE",    value: formatLargeNumber(totalValue) },
          { label: "TRADERS ACTIVE", value: uniquePlayers.toLocaleString() },
        ].map((s, i) => (
          <div key={i} style={S.statCell(i)}>
            <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#fff" }}>{s.value}</div>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={S.controls}>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "PS99", "MM2"].map((f) => (
            <button key={f} onClick={() => setGameFilter(f)} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: gameFilter === f ? "rgba(255,255,255,0.1)" : "transparent", color: gameFilter === f ? "#fff" : "#666", cursor: "pointer" }}>
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px" }}>
        {tab === "browse" && (
          listings.length === 0
            ? <EmptyState message="No active listings yet. Be the first!" />
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {listings.map((l) => (
                  <ListingCard key={l._id} listing={l} isOwner={userData?.userid === l.ownerid} onRequest={() => openRequest(l)} onCancel={() => cancelListing(l._id)} />
                ))}
              </div>
        )}

        {tab === "mine" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", marginBottom: 12 }}>My Active Listings</div>
              {myListings.length === 0
                ? <EmptyState message="You have no active listings." />
                : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {myListings.map((l) => <ListingCard key={l._id} listing={l} isOwner onCancel={() => cancelListing(l._id)} />)}
                  </div>
              }
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#555", textTransform: "uppercase", marginBottom: 12 }}>My Sent Requests</div>
              {myRequests.length === 0
                ? <EmptyState message="No requests sent." />
                : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {myRequests.map((r) => <RequestRow key={r._id} request={r} />)}
                  </div>
              }
            </div>
          </div>
        )}
      </div>

      {listings.length > 0 && tab === "browse" && (
        <div style={{ textAlign: "center", fontSize: 12, color: "#333", padding: "8px 0 20px" }}>
          Showing {listings.length} listings
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing, isOwner, onRequest, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = listing.status === "pending";

  return (
    <div style={{ background: "#111", position: "relative" }}>
      {isPending && (
        <div style={{ position: "absolute", top: 12, right: 12, fontSize: 10, padding: "2px 8px", background: "rgba(250,204,21,0.1)", color: "#facc15", borderRadius: 4, border: "1px solid rgba(250,204,21,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Pending</div>
      )}
      {/* Owner row */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <img src={listing.ownerthumbnail || ""} alt={listing.ownerusername} onError={(e) => { e.target.style.display = "none"; }}
          style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{listing.ownerusername}</span>
        <span style={{ fontSize: 11, color: "#444" }}>{new Date(listing.createdAt).toLocaleDateString()}</span>
        <button onClick={() => setExpanded(!expanded)} style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }}>{expanded ? "▲" : "▼"}</button>
      </div>

      {/* Offering preview (always visible) */}
      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 7 }}>Offering</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {listing.offeredItems.slice(0, 3).map((item, i) => <ItemChip key={i} item={item} />)}
          {listing.offeredItems.length > 3 && (
            <div style={{ fontSize: 11, padding: "4px 10px", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, color: "#555" }}>+{listing.offeredItems.length - 3} more</div>
          )}
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <>
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ padding: "14px 16px" }}>
            {listing.wantedDescription && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#555", textTransform: "uppercase", marginBottom: 5 }}>Looking For</div>
                <div style={{ fontSize: 13, color: "#888" }}>{listing.wantedDescription}</div>
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {listing.offeredItems.map((item, i) => <ItemChip key={i} item={item} />)}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{listing.offeredItems.length} item{listing.offeredItems.length !== 1 ? "s" : ""}</span>
              <div style={{ display: "flex", gap: 8 }}>
                {!isOwner && onRequest && (
                  <button onClick={onRequest} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "7px 14px", border: "none", borderRadius: 6, background: "#fff", color: "#000", cursor: "pointer" }}>
                    <ArrowLeftRight size={12} /> Request Trade
                  </button>
                )}
                {isOwner && (
                  <button onClick={onCancel} style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, background: "rgba(239,68,68,0.08)", color: "#f87171", cursor: "pointer" }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RequestRow({ request }) {
  const statusColor = { pending: "#a855f7", accepted: "#4ade80", declined: "#f87171", cancelled: "#555" };
  const col = statusColor[request.status] || "#555";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Trade Request</p>
        <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{request.offeredItems.length} items</p>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, color: col, background: `${col}18`, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {request.status}
      </span>
    </div>
  );
}

function ItemChip({ item }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, color: "#ccc" }}>
      {item.itemimage && <img src={item.itemimage} alt={item.itemname} style={{ width: 20, height: 20, objectFit: "contain" }} />}
      <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.itemname}</span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", color: "#555", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
      <p style={{ fontSize: 13 }}>{message}</p>
    </div>
  );
}
