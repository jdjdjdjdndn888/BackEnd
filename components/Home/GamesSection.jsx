import { useNavigate } from "react-router-dom";
import { Coins, Dices, TrendingUp, ShoppingBag } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const BetIcon = () => (
  <img src="/coin-games.png" alt="Games" style={{ width: 30, height: 30, objectFit: "contain" }} />
);

const GAMES = [
  { label: "Coinflip", icon: Coins, href: "/coinflip" },
  { label: "Jackpot", icon: Dices, href: "/jackpot" },
  { label: "Upgrader", icon: TrendingUp, href: "/upgrader" },
  { label: "Trades", icon: ShoppingBag, href: "/trades" },
];

export const GamesSection = () => {
  const navigate = useNavigate();

  return (
    <section className="mt-5">
      <Carousel opts={{ align: "start" }} className="w-full">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="inline-flex items-center gap-2 text-xl font-bold text-white">
            <BetIcon />
            <span>
              <span style={{ color: "#8B5CF6" }}>PS99</span>
              <span className="text-white">Bet</span>
              <span className="text-[#6B7280] font-medium ml-1">Games</span>
            </span>
          </h2>

          <CarouselPrevious className="static box-border h-10 w-10 cursor-pointer border border-[#252839] bg-[#1C1F2E] p-2 text-sm font-semibold text-white transition-opacity hover:text-white hover:bg-[#2A2E44] hover:opacity-80 active:opacity-100" />
          <CarouselNext className="static box-border h-10 w-10 cursor-pointer border border-[#252839] bg-[#1C1F2E] p-2 text-sm font-semibold text-white transition-opacity hover:text-white hover:bg-[#2A2E44] hover:opacity-80 active:opacity-100" />
        </div>

        <CarouselContent className="gap-0 p-1 pt-7 [--width:100%] md:[--width:20rem]">
          {GAMES.map(({ label, icon: Icon, href }) => (
            <CarouselItem key={href} className="basis-1/2 sm:basis-1/3 md:basis-1/4">
              <button
                onClick={() => navigate(href)}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-[#252839] bg-[#1C1F2E] px-4 py-6 text-white transition-all hover:border-[#8B5CF6] hover:bg-[#22263a] active:opacity-80"
              >
                <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#0d0f1a] text-[#8B93B8]">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
};
