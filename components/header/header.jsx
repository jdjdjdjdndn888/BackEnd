import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Undefinded } from "../../assets/exports.jsx";
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
import LoginModal from "../popup/login";
import { FaSignInAlt } from "react-icons/fa";
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

const BRAND = "#8B5CF6";
const BRAND_HOVER = "#7C3AED";

export default function Header() {
  const { userData, setUserData } = useContext(UserContext);
  const { setModalState } = useModal();
  const [balance, setBalance] = useState("0");
  const [profileImage, setProfileImage] = useState(userData?.thumbnail || Undefinded);
  const [level, setLevel] = useState(userData?.level || 0);
  const socket = useContext(SocketContext);
  const Navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    if (userData) {
      setBalance(userData.value);
      setProfileImage(userData.thumbnail || Undefinded);
      setLevel(userData.level || 0);
    }
  }, [userData]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data) => {
      setUserData(data);
      setBalance(data.value);
      setProfileImage(data.thumbnail || Undefinded);
      setLevel(data.level || 0);
    };
    socket.on("UPDATE_ME", handleUpdate);
    return () => { socket.off("UPDATE_ME", handleUpdate); };
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
    <header className="box-border flex h-[var(--header-height)] items-center px-4 border-b border-[#1e2035] bg-[#0d0f1a] relative">
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}

      {/* Logo visible only on mobile (sidenav is hidden on mobile) */}
      <div className="flex lg:hidden items-center mr-3 flex-shrink-0">
        <img src="/logo-ps99bet.png" alt="PS99Bet" className="h-7 w-auto object-contain" draggable={false} />
      </div>

      {userData ? (
        <>
          <div className="flex-1 flex justify-center">
            <Wallet balance={balance} />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications bell */}
            <div className="relative">
              <IconButton label="Notifications" onClick={() => setShowNotifs(v => !v)}>
                <NotificationIcon />
              </IconButton>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white border-2 border-[#0d0f1a]"
                  style={{ background: "#EF4444" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="cursor-pointer">
                  <Avatar imgUrl={profileImage} level={level} className="h-10 w-10" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#13151f] border border-[#1e2035] rounded-lg p-1 w-48 mt-1">
                <DropdownMenuItem className="flex items-center gap-2 px-3 py-2.5 text-white hover:bg-[#1C1F2E] cursor-pointer rounded-md" onClick={() => Navigate("/profile")}>
                  <UserIcon className="h-4 w-4" style={{ color: BRAND }} /><span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 px-3 py-2.5 text-white hover:bg-[#1C1F2E] cursor-pointer rounded-md" onClick={() => setModalState(<GiveawayModal />)}>
                  <GiveawayIcon className="h-4 w-4" style={{ color: BRAND }} /><span>Create Giveaway</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 px-3 py-2.5 text-white hover:bg-[#1C1F2E] cursor-pointer rounded-md" onClick={() => setModalState(<InventoryModal />)}>
                  <Package className="h-4 w-4" style={{ color: BRAND }} /><span>Inventory</span>
                </DropdownMenuItem>
                {(userData?.rank === "OWNER" || userData?.rank === "ADMIN") && (
                  <DropdownMenuItem className="flex items-center gap-2 px-3 py-2.5 text-white hover:bg-[#1C1F2E] cursor-pointer rounded-md" onClick={() => Navigate("/admin")}>
                    <ShieldAlert className="h-4 w-4" style={{ color: BRAND }} /><span>Admin Panel</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1 h-px bg-[#1e2035]" />
                <DropdownMenuItem className="logoutbtn flex items-center gap-2 px-3 py-2.5 text-[#FF4757] cursor-pointer rounded-md" onClick={handleLogout}>
                  <LogOutIcon className="h-4 w-4" /><span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1" />
          <button
            onClick={() => { setModalState(null); setTimeout(() => setModalState(<LoginModal navigate={Navigate} />)); }}
            className="cursor-pointer items-center gap-1.5 rounded-lg border-none text-sm font-semibold text-white transition-colors hover:opacity-90 inline-flex px-4 py-2.5"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_HOVER})` }}
          >
            <FaSignInAlt /> LOGIN
          </button>
        </>
      )}
    </header>
  );
}

const Wallet = ({ balance }) => {
  const { setModalState } = useModal();
  return (
    <div className="flex rounded-lg border border-[#1e2035] bg-[#13151f] text-xs font-semibold text-white sm:rounded-[14px] sm:text-sm">
      <div className="inline-flex w-full items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2">
        <WalletIcon className="w-3 sm:w-5" style={{ color: "#8B5CF6" }} />
        <span>{formatLargeNumber(balance)}</span>
      </div>
      <button type="button"
        className="inline-flex cursor-pointer items-center gap-1 rounded-[inherit] border-none px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 sm:px-5 sm:py-2.5 sm:text-sm"
        style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}
        onClick={() => setModalState(<InventoryModal />)}>
        <PlusIcon className="w-3 sm:w-5" /> <span>Wallet</span>
      </button>
    </div>
  );
};

const IconButton = ({ children, label, onClick, disabled, className }) => (
  <button type="button" disabled={disabled} aria-label={label}
    className={cn("box-border h-10 w-10 flex-[0_0_auto] cursor-pointer rounded-[14px] border border-[#1e2035] bg-transparent p-2 text-white transition-colors hover:bg-[#1C1F2E] disabled:cursor-not-allowed disabled:text-[#4F546A] [&>svg]:w-full", className)}
    onClick={onClick}>
    {children}
  </button>
);
