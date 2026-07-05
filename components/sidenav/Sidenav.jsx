import { NavLink } from "react-router-dom";
import { useModal } from "@/utils/ModalContext";
import { HomeIcon } from "@/assets/icons/HomeIcon";
import { MarketPlaceIcon } from "@/assets/icons/MarketPlaceIcon";
import { LeaderboardIcon } from "@/assets/icons/LeaderboardIcon";
import { Coins, Dices, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Leaderboard from "@/components/popup/leaderboard";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Logo from "@/components/logo/Logo";

const navItems = [
  { label: "Home", icon: HomeIcon, href: "/" },
  { label: "Coinflip", icon: () => <img src="/coinflip-icon.png" alt="Coinflip" className="w-8 h-8 object-contain" />, href: "/coinflip" },
  { label: "Dice", icon: () => <img src="/dice-icon.png" alt="Dice" className="w-8 h-8 object-contain" />, href: "/dice" },
  { label: "Jackpot", icon: () => <img src="/jackpot-icon.png" alt="Jackpot" className="w-8 h-8 object-contain" />, href: "/jackpot" },
  { label: "Upgrader", icon: () => <img src="/upgrader-icon.png" alt="Upgrader" className="w-8 h-8 object-contain" />, href: "/upgrader" },
  { label: "Trades", icon: MarketPlaceIcon, href: "/trades" },
];

export default function Sidenav() {
  const { setModalState } = useModal();
  const location = useLocation();

  return (
    <aside className="hidden lg:flex w-[72px] flex-shrink-0 flex-col bg-[#0d0f1a] border-r border-[#1e2035] h-full z-20">
      <div className="flex items-center justify-center h-[var(--header-height)] border-b border-[#1e2035] px-1.5">
        <NavLink to="/" className="flex items-center justify-center w-full">
          <img src="/logo-ps99bet.png" alt="PS99Bet" className="h-8 w-auto object-contain" draggable={false} />
        </NavLink>
      </div>

      <nav className="flex flex-col items-center py-4 gap-1 flex-1">
        <TooltipProvider delayDuration={0}>
          {navItems.map(({ label, icon: Icon, href }) => {
            const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);
            return (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={href}
                    className={cn(
                      "flex items-center justify-center w-11 h-11 rounded-xl transition-all [&>svg]:w-5 [&>svg]:h-5",
                      isActive
                        ? "bg-[#8B5CF620] text-[#8B5CF6]"
                        : "text-[#42496B] hover:bg-[#1C1F2E] hover:text-[#8B93B8]"
                    )}
                  >
                    <Icon />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1C1F2E] border border-[#252839] text-white text-xs px-3 py-1.5 rounded-lg">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div className="mt-1 w-8 h-px bg-[#1e2035]" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setModalState(<Leaderboard />)}
                className="flex items-center justify-center w-11 h-11 rounded-xl transition-all text-[#42496B] hover:bg-[#1C1F2E] hover:text-[#8B93B8] bg-transparent border-none cursor-pointer [&>svg]:w-5 [&>svg]:h-5"
              >
                <LeaderboardIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1C1F2E] border border-[#252839] text-white text-xs px-3 py-1.5 rounded-lg">
              Leaderboard
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>

      {/* Discord */}
      <div className="flex items-center justify-center py-3 border-t border-[#1e2035]">
        <a
          href="https://discord.gg/MH7rp8jh7E"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-[52px] h-[52px] rounded-xl transition-all hover:bg-[#5865F220] hover:opacity-90"
        >
          <img src="/discord.png" alt="Discord" className="w-12 h-12 object-contain" draggable={false} />
        </a>
      </div>
    </aside>
  );
}
