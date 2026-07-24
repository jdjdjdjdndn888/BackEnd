import React, { useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Undefinded } from "../../assets/exports.jsx";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth.js";
import UserContext from "../../utils/user.js";
import InventoryModal from "../popup/inventory.jsx";
import GiveawayModal from "../popup/giveaway.jsx";
import { useModal } from "../../utils/ModalContext";
import SocketContext from "../../utils/socket.js";
import toast from "react-hot-toast";
import { WalletIcon } from "@/assets/icons/WalletIcon";
import { PlusIcon } from "@/assets/icons/PlusIcon";
import { Avatar } from "../ui/avatar";
import { NotificationIcon } from "@/assets/icons/NotificationIcon";
import { LogOutIcon } from "@/assets/icons/LogOutIcon";
import { cn } from "@/lib/utils";
import { formatLargeNumber } from "@/utils/value";
import { getDisplayLevel } from "../../utils/getrole.js";
import LoginModal from "../popup/login";
import { FaSignInAlt } from "react-icons/fa";

// Filled Discord "blueberry" logo — the official wordmark shape
const DiscordIcon = ({ style, className }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127c-.598.35-1.22.645-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserIcon, Package, GiftIcon as GiveawayIcon, ShieldAlert } from "lucide-react";
import { useNotifications } from "../../utils/NotificationsContext.jsx";
import NotificationsPanel from "../notifications/NotificationsPanel.jsx";
import LevelWidget from "./LevelWidget.jsx";

const BRAND = "#8B5CF6";
const BRAND_HOVER = "#7C3AED";

export default function Header({ onOpenMobileNav = () => {} }) {
  const { userData, setUserData } = useContext(UserContext);
  const { setModalState } = useModal();
  const [balance, setBalance] = useState("0");
  const [normalBalance, setNormalBalance] = useState(null);
  const [profileImage, setProfileImage] = useState(userData?.thumbnail || Undefinded);
  const [level, setLevel] = useState(getDisplayLevel(userData?.rank, userData?.level || 0));
  const socket = useContext(SocketContext);
  const Navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const { unreadCount } = useNotifications();

  const fetchNormalWallet = useCallback(async () => {
    const token = getauth();
    if (!token) return;
    try {
      const res = await fetch(`${api}/normal-wallet`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = await res.json();
      if (body?.data?.balance != null) setNormalBalance(body.data.balance);
    } catch { /* silent — header must never crash */ }
  }, []);

  useEffect(() => {
    fetchNormalWallet();
    const id = setInterval(fetchNormalWallet, 30_000);
    return () => clearInterval(id);
  }, [fetchNormalWallet, userData?.userid]);

  useEffect(() => {
    if (userData) {
      setBalance(userData.value);
      setProfileImage(userData.thumbnail || Undefinded);
      setLevel(getDisplayLevel(userData.rank, userData.level || 0));
    }
  }, [userData]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data) => {
      setUserData(data);
      setBalance(data.value);
      setProfileImage(data.thumbnail || Undefinded);
      setLevel(getDisplayLevel(data.rank, data.level || 0));
    };
    const handleForceRefresh = () => window.location.reload();
    socket.on("UPDATE_ME", handleUpdate);
    socket.on("FORCE_REFRESH", handleForceRefresh);
    return () => {
      socket.off("UPDATE_ME", handleUpdate);
      socket.off("FORCE_REFRESH", handleForceRefresh);
    };
  }, [socket, setUserData]);

  const handleLogout = () => {
    if (!localStorage.getItem("bloxyspin") && !localStorage.getItem("token")) {
      toast.error("You are not logged in!");
      return;
    }
    localStorage.removeItem("bloxyspin");
    localStorage.removeItem("token");
    toast.success("Successfully logged out!");
    setUserData(null);
  };

  return (
    <header className="box-border flex h-[var(--header-height)] items-center gap-3 px-4 border-b border-[#1e2035] bg-[#0d0f1a] relative">
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}

      {/* Logo + hamburger visible only on mobile */}
      <div className="flex lg:hidden items-center gap-2 mr-1 flex-shrink-0">
        <button
          onClick={onOpenMobileNav}
          aria-label="Open menu"
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-[#1e2035] bg-transparent text-[#42496B] hover:bg-[#1C1F2E] hover:text-white transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect y="2" width="16" height="2" rx="1" fill="currentColor"/>
            <rect y="7" width="16" height="2" rx="1" fill="currentColor"/>
            <rect y="12" width="16" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
        <img src="/logo-gemtide.png" alt="GemTide" className="h-7 w-auto object-contain" draggable={false} />
      </div>

      {userData ? (
        <>
          {/* Wallets — centered */}
          <div className="flex-1 flex justify-center items-center gap-2">
            <Wallet balance={balance} />
            {normalBalance !== null && (
              <NormalWalletChip balance={normalBalance} onClick={() => Navigate("/normal-wallet")} />
            )}
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {/* Level progress widget */}
            <div className="hidden sm:block">
              <LevelWidget level={level} rank={userData?.rank} />
            </div>

            {/* Discord join button — always visible even when logged in */}
            <a
              href="https://discord.gg/wSVTpC7VWh"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex cursor-pointer items-center gap-2 rounded-xl border-none text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 px-4 py-2.5 no-underline"
              style={{ background: "linear-gradient(135deg, #5865F2, #4752C4)", boxShadow: "0 0 18px rgba(88,101,242,0.45)" }}
            >
              <DiscordIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
              Join Discord
            </a>

            {/* Notifications bell */}
            <div className="relative">
              <IconButton label="Notifications" onClick={() => setShowNotifs(v => !v)}>
                <NotificationIcon />
              </IconButton>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white border-2 border-[#0d0f1a]"
                  style={{ background: "#EF4444" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="cursor-pointer">
                  <Avatar imgUrl={profileImage} level={level} className="h-10 w-10" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#13151f] border border-[#1e2035] rounded-xl p-1 w-48 mt-1 shadow-2xl">
                <DropdownMenuItem
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-[#1C1F2E] cursor-pointer rounded-lg"
                  onClick={() => Navigate("/profile")}
                >
                  <UserIcon className="h-4 w-4 flex-shrink-0" style={{ color: BRAND }} />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-[#1C1F2E] cursor-pointer rounded-lg"
                  onClick={() => setModalState(<GiveawayModal />)}
                >
                  <GiveawayIcon className="h-4 w-4 flex-shrink-0" style={{ color: BRAND }} />
                  <span>Create Giveaway</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-[#1C1F2E] cursor-pointer rounded-lg"
                  onClick={() => setModalState(<InventoryModal />)}
                >
                  <Package className="h-4 w-4 flex-shrink-0" style={{ color: BRAND }} />
                  <span>Inventory</span>
                </DropdownMenuItem>
                {(userData?.rank === "OWNER" || userData?.rank === "ADMIN") && (
                  <DropdownMenuItem
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-[#1C1F2E] cursor-pointer rounded-lg"
                    onClick={() => Navigate("/admin")}
                  >
                    <ShieldAlert className="h-4 w-4 flex-shrink-0" style={{ color: BRAND }} />
                    <span>Admin Panel</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1 h-px bg-[#1e2035]" />
                <DropdownMenuItem
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#FF4757] hover:bg-[#FF475710] cursor-pointer rounded-lg"
                  onClick={handleLogout}
                >
                  <LogOutIcon className="h-4 w-4 flex-shrink-0" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1" />
          {/* Discord join button — shown prominently next to Login when logged out */}
          <a
            href="https://discord.gg/wSVTpC7VWh"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex cursor-pointer items-center gap-2 rounded-xl border-none text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 px-4 py-2.5 no-underline"
            style={{ background: "linear-gradient(135deg, #5865F2, #4752C4)", boxShadow: "0 0 18px rgba(88,101,242,0.45)" }}
          >
            <DiscordIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
            Join Discord
          </a>
          <button
            onClick={() => { setModalState(null); setTimeout(() => setModalState(<LoginModal navigate={Navigate} />)); }}
            className="cursor-pointer items-center gap-1.5 rounded-xl border-none text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 inline-flex px-4 py-2.5"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_HOVER})` }}
          >
            <FaSignInAlt /> LOGIN
          </button>
        </>
      )}
    </header>
  );
}

const NormalWalletChip = ({ balance, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#2a1f4a] bg-[#13151f] text-xs font-semibold text-white sm:text-sm px-3 py-2 transition-all hover:border-[#8B5CF6] hover:bg-[#1a1630] active:scale-95 cursor-pointer"
    title="Normal Wallet — click to exchange"
    style={{ flexShrink: 0 }}
  >
    <img src="/mines-gem.png" alt="" style={{ width: 16, height: 16, objectFit: "contain", flexShrink: 0 }} />
    <span style={{ color: "#a78bfa" }}>{formatLargeNumber(balance)}</span>
  </button>
);

const Wallet = ({ balance }) => {
  const { setModalState } = useModal();
  return (
    <div className="flex rounded-xl border border-[#1e2035] bg-[#13151f] text-xs font-semibold text-white sm:text-sm overflow-hidden">
      <div className="inline-flex w-full items-center gap-2 px-3 py-2">
        <WalletIcon className="w-4 sm:w-5 flex-shrink-0" style={{ color: "#8B5CF6" }} />
        <span>{formatLargeNumber(balance)}</span>
      </div>
      <button
        type="button"
        className="inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-[inherit] border-none px-3 py-2 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 sm:px-5 sm:text-sm"
        style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}
        onClick={() => setModalState(<InventoryModal />)}
      >
        <PlusIcon className="w-3 sm:w-4 flex-shrink-0" />
        <span>Wallet</span>
      </button>
    </div>
  );
};

const IconButton = ({ children, label, onClick, disabled, className }) => (
  <button
    type="button"
    disabled={disabled}
    aria-label={label}
    className={cn(
      "box-border h-10 w-10 flex-shrink-0 cursor-pointer rounded-xl border border-[#1e2035] bg-transparent p-2 text-[#42496B] transition-all hover:bg-[#1C1F2E] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:w-full",
      className
    )}
    onClick={onClick}
  >
    {children}
  </button>
);
