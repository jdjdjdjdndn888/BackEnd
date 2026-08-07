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
  { label: "Color Dice", href: "/colordice", banner: "/colordice-banner.png" },
  { label: "RPS", href: "/rps", banner: "/rps-banner.png" },
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
          {GAMES.map(({ label, href, banner, closed }) => (
            <CarouselItem key={href} className="basis-1/2 sm:basis-1/3 md:basis-1/4">
              <button
                onClick={() => !closed && navigate(href)}
                disabled={closed}
                aria-label={closed ? `${label} temporarily closed` : label}
                className={`group relative w-full overflow-hidden rounded-2xl border border-[#252839] transition-all ${
                  closed
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:border-[#8B5CF6] hover:scale-[1.02] active:opacity-80"
                }`}
                style={{ aspectRatio: "3/4" }}
              >
                <img
                  src={banner}
                  alt={label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 rounded-2xl bg-[#8B5CF6]/0 group-hover:bg-[#8B5CF6]/10 transition-all duration-200" />
                {closed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                    <span className="rounded-full border border-violet-300/30 bg-black/65 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200">
                      Temporarily Closed
                    </span>
                  </div>
                )}
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
};
