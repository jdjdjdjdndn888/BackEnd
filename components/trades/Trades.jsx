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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function Trades() {
  const { userData } = useContext(UserContext);
  const socket = useContext(SocketContext);
  const { setModalState } = useModal();
  const [listings, setListings] = useState([]);
  const [gameFilter, setGameFilter] = useState("all");
  const [tab, setTab] = useState("browse");
  const [myListings, setMyListings] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      const url = gameFilter === "all" ? `${api}/trades` : `${api}/trades?game=${gameFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setListings(data.data);
    } catch {
      toast.error("Failed to load listings.");
    }
  }, [gameFilter]);

  const fetchMine = useCallback(async () => {
    if (!userData) return;
    try {
      const res = await fetch(`${api}/trades/mine`, {
        headers: { authorization: `Bearer ${getauth()}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMyListings(data.data.listings);
        setMyRequests(data.data.requests);
      }
    } catch {}
  }, [userData]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (tab === "mine") fetchMine();
  }, [tab, fetchMine]);

  useEffect(() => {
    socket.on("NEW_TRADE", (listing) => {
      if (gameFilter === "all" || listing.game === gameFilter) {
        setListings((prev) => [listing, ...prev]);
      }
    });
    socket.on("TRADE_CANCELLED", ({ _id }) => {
      setListings((prev) => prev.filter((l) => String(l._id) !== String(_id)));
      setMyListings((prev) => prev.filter((l) => String(l._id) !== String(_id)));
    });
    return () => {
      socket.off("NEW_TRADE");
      socket.off("TRADE_CANCELLED");
    };
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
        setMyListings((prev) => prev.filter((l) => String(l._id) !== String(tradeid)));
        setListings((prev) => prev.filter((l) => String(l._id) !== String(tradeid)));
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Something went wrong.");
    }
  };

  const openCreate = () => {
    if (!userData) return setModalState(<LoginModal />);
    setModalState(
      <CreateTradeListing
        onCreated={(listing) => {
          setListings((prev) => [listing, ...prev]);
          setMyListings((prev) => [listing, ...prev]);
        }}
      />
    );
  };

  const openRequest = (listing) => {
    if (!userData) return setModalState(<LoginModal />);
    if (listing.ownerid === userData.userid) return toast.error("This is your own listing!");
    setModalState(<SendTradeRequest listing={listing} />);
  };

  const totalValue = listings.reduce((sum, l) => sum + (l.totalValue || 0), 0);

  return (
    <div className="box-border p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 mb-4">
        <StatCard title="Listings" value={listings.length.toLocaleString()} />
        <StatCard title="Total Value" value={`R$${formatLargeNumber(totalValue)}`} />
        <StatCard title="Players Trading" value={new Set(listings.map((l) => l.ownerid)).size.toLocaleString()} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-2 mr-auto flex-wrap">
          <button
            onClick={() => setTab("browse")}
            className={`min-w-24 cursor-pointer rounded-lg border-none p-2.5 text-base font-semibold text-white transition-colors ${tab === "browse" ? "bg-[#8B5CF6] hover:bg-[#7C3AED]" : "bg-[#2A2E44] hover:opacity-80"}`}
          >
            Browse
          </button>
          <button
            onClick={() => { setTab("mine"); fetchMine(); }}
            className={`min-w-24 cursor-pointer rounded-lg border-none p-2.5 text-base font-semibold text-white transition-colors ${tab === "mine" ? "bg-[#8B5CF6] hover:bg-[#7C3AED]" : "bg-[#2A2E44] hover:opacity-80"}`}
          >
            My Trades
          </button>
          <button
            onClick={openCreate}
            className="min-w-24 cursor-pointer rounded-lg border-none bg-[#22c55e] p-2.5 text-base font-semibold text-white transition-colors hover:bg-[#16a34a]"
          >
            + List Items
          </button>
        </div>
        <Select value={gameFilter} onValueChange={setGameFilter}>
          <SelectTrigger className="h-10 w-36 rounded-lg border border-[#252839] bg-[#1C1F2D] px-3 text-sm text-white">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="bg-[#1C1F2D] border border-[#252839] rounded-lg p-1 mt-1">
            {["all", "MM2", "PS99"].map((g) => (
              <SelectItem key={g} value={g} className="text-white hover:bg-[#252839] rounded cursor-pointer">
                {g === "all" ? "All Games" : g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tab === "browse" && (
        <div className="flex flex-col gap-3">
          {listings.length === 0 ? (
            <EmptyState message="No active listings yet. Be the first to list items!" />
          ) : (
            listings.map((listing) => (
              <ListingCard
                key={listing._id}
                listing={listing}
                isOwner={userData?.userid === listing.ownerid}
                onRequest={() => openRequest(listing)}
                onCancel={() => cancelListing(listing._id)}
              />
            ))
          )}
        </div>
      )}

      {tab === "mine" && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-white font-bold text-base mb-2">My Active Listings</h2>
            {myListings.length === 0 ? (
              <EmptyState message="You have no active listings." />
            ) : (
              <div className="flex flex-col gap-3">
                {myListings.map((listing) => (
                  <ListingCard
                    key={listing._id}
                    listing={listing}
                    isOwner
                    onCancel={() => cancelListing(listing._id)}
                  />
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-white font-bold text-base mb-2">My Sent Requests</h2>
            {myRequests.length === 0 ? (
              <EmptyState message="No requests sent." />
            ) : (
              <div className="flex flex-col gap-2">
                {myRequests.map((req) => (
                  <RequestRow key={req._id} request={req} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing, isOwner, onRequest, onCancel }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[#252839] bg-[#131623] overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <img
          src={listing.ownerthumbnail || ""}
          alt={listing.ownerusername}
          className="w-10 h-10 rounded-full object-cover border border-[#252839] flex-shrink-0"
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm truncate">{listing.ownerusername}</p>
          <p className="text-[#6B7280] text-xs">{listing.game} · {listing.offeredItems.length} item{listing.offeredItems.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[#8B5CF6] font-bold text-sm">R${listing.totalValue?.toLocaleString()}</p>
          <p className="text-[#42496B] text-[10px]">{new Date(listing.createdAt).toLocaleDateString()}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-1 text-[#42496B] hover:text-white bg-transparent border-none cursor-pointer text-lg leading-none"
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#252839] p-3">
          {listing.wantedDescription && (
            <p className="text-xs text-[#6B7280] mb-3">
              <span className="text-[#8B5CF6] font-semibold">Looking for:</span> {listing.wantedDescription}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {listing.offeredItems.map((item, i) => (
              <ItemChip key={i} item={item} />
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            {!isOwner && onRequest && (
              <button
                onClick={onRequest}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#7C3AED)" }}
              >
                Send Trade Offer
              </button>
            )}
            {isOwner && (
              <button
                onClick={onCancel}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white border-none cursor-pointer bg-[#ef444430] hover:bg-[#ef444450] transition-colors"
              >
                Cancel Listing
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestRow({ request }) {
  const statusColor = {
    pending: "#8B5CF6",
    accepted: "#22c55e",
    declined: "#ef4444",
    cancelled: "#6B7280",
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#252839] bg-[#131623] p-3">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">Trade Request</p>
        <p className="text-[#6B7280] text-xs">{request.offeredItems.length} items · R${request.totalValue?.toLocaleString()}</p>
      </div>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ color: statusColor[request.status] || "#6B7280", background: `${statusColor[request.status] || "#6B7280"}20` }}
      >
        {request.status.toUpperCase()}
      </span>
    </div>
  );
}

function ItemChip({ item }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-[#252839] bg-[#0d0f1a] px-2 py-1">
      {item.itemimage && (
        <img src={item.itemimage} alt={item.itemname} className="w-6 h-6 object-contain" />
      )}
      <div>
        <p className="text-white text-[11px] font-medium leading-tight truncate max-w-[100px]">{item.itemname}</p>
        <p className="text-[#8B5CF6] text-[10px] leading-tight">R${item.itemvalue?.toLocaleString()}</p>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-md border border-solid border-[#252839] px-3 pb-3 pt-2 text-sm font-bold text-[#6B7280]">
      <strong className="flex items-center gap-1 text-xl text-white">{value}</strong>
      <p>{title}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[#6B7280]">
      <span className="text-4xl mb-3">🔄</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}
