import { formatLargeNumber } from "@/utils/value";
import Profile from "../popup/profile";
import { useModal } from "@/utils/ModalContext";
import LoginModal from "../popup/login";
import JoinDice from "./Join/joindice.jsx";
import DiceView from "./View/view.jsx";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { WalletIcon } from "@/assets/icons/WalletIcon";
import QuestionMarkIcon from "@/assets/images/question-mark.svg";
import { useCallback, memo } from "react";
import { cn } from "@/lib/utils";

export default function DiceRow({ game, countdowns, userData }) {
  const { setModalState } = useModal();

  const handleView = useCallback(() => {
    setTimeout(() => setModalState(<DiceView game={game} onClose={() => setModalState(null)} />), 0);
  }, [game]);

  const p1Status = game.PlayerTwo && !countdowns[game._id]
    ? game.winner === game.PlayerOne.id ? "winner" : "loser"
    : "pending";
  const p2Status = game.PlayerTwo && !countdowns[game._id]
    ? game.winner === game.PlayerTwo?.id ? "winner" : "loser"
    : "pending";

  return (
    <div className="grid grid-cols-1 items-center gap-2 rounded-lg border border-solid border-[#252839] bg-[#1C1F2E] py-3 pl-6 pr-2.5 xl:grid-cols-[repeat(5,auto)] [&>*]:min-w-0">
      {/* Players */}
      <div className="flex items-center gap-3 justify-self-center xl:justify-self-start">
        <PlayerAvatar imgUrl={game.PlayerOne.thumbnail} userid={game.PlayerOne.id} status={p1Status} />
        <strong className="text-lg font-bold text-[#B0B8C1]">VS</strong>
        <PlayerAvatar imgUrl={game.PlayerTwo?.thumbnail ?? QuestionMarkIcon} userid={game.PlayerTwo?.id} status={p2Status} />
      </div>

      {/* Items */}
      <ItemsCell itemsA={game.PlayerOne.items} itemsB={game.PlayerTwo?.items ?? []} />

      {/* Value */}
      <div className="w-32 place-self-center text-center font-bold">
        <p className="inline-flex items-center gap-2 text-[1.375rem] leading-normal text-white">
          <WalletIcon className="w-5 text-[#8B5CF6]" />
          <span>{formatLargeNumber(game.requirements.static)}</span>
        </p>
        <p className="text-sm text-[#CCC]">
          {formatLargeNumber(game.requirements.min)} - {formatLargeNumber(game.requirements.max)}
        </p>
      </div>

      {/* Dice countdown / result */}
      <DiceCountDown countdown={countdowns[game._id]} game={game} />

      {/* Actions */}
      <div className="flex justify-center gap-2 justify-self-center xl:ml-auto xl:flex-col xl:justify-self-end">
        {game.active && (
          <button
            onClick={() => {
              if (userData) {
                setModalState(<JoinDice game={game} onJoin={() => {}} onClose={() => setModalState(null)} />);
              } else {
                setModalState(<LoginModal />);
              }
            }}
            disabled={!!game.PlayerTwo || userData?.userid === game.creatorid}
            className="min-w-24 cursor-pointer rounded-lg border-none bg-[#8B5CF6] py-1.5 text-base font-semibold text-white transition-colors hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-80"
          >
            Join
          </button>
        )}
        <button
          onClick={handleView}
          className="min-w-24 cursor-pointer rounded-lg border-none bg-[#2A2E44] py-1.5 text-base font-semibold text-white transition-colors hover:opacity-80"
        >
          View
        </button>
      </div>
    </div>
  );
}

const PlayerAvatar = ({ imgUrl, userid, status }) => {
  const { setModalState } = useModal();
  return (
    <div className={cn(
      "relative box-border h-14 w-14 flex-[0_0_auto] rounded-full border border-solid border-[#2F3347] bg-[#1A1D2B] transition-colors",
      status === "winner" && "border-2 border-[#8B5CF6]",
      status === "loser" && "opacity-60",
    )}>
      <button
        className={`block h-full w-full overflow-hidden rounded-[inherit] border-none bg-transparent ${userid ? "cursor-pointer" : "cursor-help"}`}
        onClick={() => userid && setModalState(<Profile userId={userid} />)}
      >
        <img loading="lazy" height={56} width={56} alt="" src={imgUrl} className="box-border block w-full object-contain" />
      </button>
      {/* dice icon badge */}
      <div className="absolute right-0 top-0 box-border h-6 w-6 overflow-hidden rounded-full bg-[#1A1D2B] border border-[#2F3347] flex items-center justify-center"
        style={{ transform: "translate(25%, -25%)" }}>
        <span className="text-xs">🎲</span>
      </div>
    </div>
  );
};

const ItemsCell = memo(({ itemsA, itemsB }) => {
  const max = 5;
  const totalCount = itemsA.length + itemsB.length;
  const sorted = [...itemsA, ...itemsB].sort((a, b) => b.itemvalue - a.itemvalue).slice(0, max);
  const shiftPercent = 35.7;

  return (
    <div className="flex justify-self-center xl:grid xl:grid-cols-5 xl:justify-self-start">
      <TooltipProvider delayDuration={0}>
        {sorted.map((item, index) => (
          <Tooltip key={item._id || index}>
            <TooltipTrigger
              style={{ "--shift": `translate(${index * shiftPercent * -1}%)` }}
              className="relative box-border block h-14 w-14 flex-[0_0_auto] cursor-pointer overflow-hidden rounded-full border-2 border-solid border-[#2F3347] bg-[#1A1D2B] transition-colors hover:border-[#8B5CF6] xl:[transform:var(--shift)] max-xl:[&+*]:-ml-5"
            >
              <img src={item.itemimage} alt={item.itemname?.slice(0, 1)} className="block h-full w-full max-w-full object-contain" />
              {index === max - 1 && totalCount > max && (
                <div style={{ backdropFilter: "blur(1px)", background: "rgba(23,25,37,0.8)" }}
                  className="pointer-events-none absolute left-0 top-0 z-[1] grid h-full w-full select-none place-items-center text-white">
                  +{totalCount - max}
                </div>
              )}
            </TooltipTrigger>
            {(index < max - 1 || totalCount <= max) && (
              <TooltipContent className="rounded-[5px] border border-[#252839] bg-[#171925] px-3">
                <p className="text-white">{item.itemname || "Unknown"}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
});

const DiceCountDown = ({ countdown, game }) => {
  const hasResult = game.PlayerTwo && !game.active;
  if (!hasResult && typeof countdown !== "number") return <div className="w-16 xl:w-16" />;

  return (
    <div className="flex flex-col items-center justify-center w-16 justify-self-center gap-1">
      {typeof countdown === "number" ? (
        <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-[#8B5CF6] text-white text-xl font-bold">
          {countdown}
        </div>
      ) : hasResult ? (
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex gap-1">
            {(game.PlayerOne.dice || []).map((d, i) => (
              <DieFace key={i} value={d} size="sm" />
            ))}
          </div>
          <span className="text-[10px] text-[#8B5CF6] font-bold">{game.PlayerOne.total}</span>
        </div>
      ) : null}
    </div>
  );
};

export const DieFace = ({ value, size = "md" }) => {
  const s = size === "sm" ? "w-6 h-6 text-xs" : "w-10 h-10 text-base";
  return (
    <div className={cn("rounded-md border-2 border-[#8B5CF6] bg-[#1a1d2b] flex items-center justify-center font-bold text-white", s)}>
      {value}
    </div>
  );
};
