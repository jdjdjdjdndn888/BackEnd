import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
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
  { label: "Coinflip",  href: "/coinflip",  banner: "/coinflip-banner.png" },
  { label: "Dice Roll", href: "/dice",      banner: "/dice-banner.png" },
  { label: "Jackpot",   href: "/jackpot",   banner: "/jackpot-banner.png" },
  { label: "BlackJack 1v1", href: "/blackjack", banner: "/blackjack-banner.png" },
  { label: "Upgrader",  href: "/upgrader",  banner: "/upgrader-banner.png" },
  { label: "Trades",    href: "/trades",    banner: "/trades-banner.png" },
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
          {GAMES.map(({ label, href, banner }) => (
            <CarouselItem key={href} className="basis-1/2 sm:basis-1/3 md:basis-1/4">
              <button
                onClick={() => navigate(href)}
                className="group relative w-full cursor-pointer overflow-hidden rounded-2xl border border-[#252839] transition-all hover:border-[#8B5CF6] hover:scale-[1.02] active:opacity-80"
                style={{ aspectRatio: "3/4" }}
              >
                <img
                  src={banner}
                  alt={label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 rounded-2xl bg-[#8B5CF6]/0 group-hover:bg-[#8B5CF6]/10 transition-all duration-200" />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
};
