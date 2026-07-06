import { formatLargeNumber } from "@/utils/value";
import Profile from "../popup/profile";
import { useModal } from "@/utils/ModalContext";
import LoginModal from "../popup/login";
import JoinBlackjack from "./Join/joinblackjack.jsx";
import BlackjackView from "./View/view.jsx";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { WalletIcon } from "@/assets/icons/WalletIcon";
import QuestionMarkIcon from "@/assets/images/question-mark.svg";
import { useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { CardFace } from "./View/view.jsx";

export default function BlackjackRow({ game, userData, setSelectedGame }) {
  const { setModalState } = useModal();

  const handleView = useCallback(() => {
    setTimeout(() => {
      setSelectedGame(game);
      setModalState(<BlackjackView game={game} onClose={() => setSelectedGame(null)} />);
    }, 0);
  }, [game, setSelectedGame]);

  const finished = game.turn === "finished";
  const p1Status = finished ? (game.winner === game.PlayerOne.id ? "winner" : "loser") : "pending";
  const p2Status = finished ? (game.winner === game.PlayerTwo?.id ? "winner" : "loser") : "pending";

  return (
    <div className="grid grid-cols-1 items-center gap-2 rounded-lg border border-solid border-[#252839] bg-[#1C1F2E] py-3 pl-6 pr-2.5 xl:grid-cols-[repeat(5,auto)] [&>*]:min-w-0">
      {/* Players */}
      <div className="flex items-center gap-3 justify-self-center xl:justify-self-start">
        <PlayerAvatar imgUrl={game.PlayerOne.thumbnail} userid={game.PlayerOne.id} status={p1Status} isDealer={game.PlayerOne.isDealer} />
        <strong className="text-lg font-bold text-[#B0B8C1]">VS</strong>
        <PlayerAvatar imgUrl={game.PlayerTwo?.thumbnail ?? QuestionMarkIcon} userid={game.PlayerTwo?.id} status={p2Status} isDealer={game.PlayerTwo?.isDealer} />
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

      {/* Hands / result */}
      <BlackjackStatus game={game} />

      {/* Actions */}
      <div className="flex justify-center gap-2 justify-self-center xl:ml-auto xl:flex-col xl:justify-self-end">
        {game.active && game.turn === "waiting" && (
          <button
            onClick={() => {
              if (userData) {
                setModalState(<JoinBlackjack game={game} onJoin={setSelectedGame} onClose={() => setSelectedGame(null)} />);
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

const PlayerAvatar = ({ imgUrl, userid, status, isDealer }) => {
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
      <div className="absolute right-0 top-0 box-border h-6 w-6 overflow-hidden rounded-full bg-[#1A1D2B] border border-[#2F3347] flex items-center justify-center"
        style={{ transform: "translate(25%, -25%)" }}>
        <span className="text-xs">{isDealer ? "🎩" : "🃏"}</span>
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

const BlackjackStatus = ({ game }) => {
  const hasResult = game.turn === "finished";
  if (!game.PlayerTwo) return <div className="w-20 xl:w-20" />;

  return (
    <div className="flex flex-col items-center justify-center w-20 justify-self-center gap-1">
      {hasResult ? (
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex gap-0.5">
            {(game.PlayerOne.hand || []).slice(0, 2).map((c, i) => (
              <CardFace key={i} card={c} size="xs" />
            ))}
          </div>
          <span className="text-[10px] text-[#8B5CF6] font-bold">{game.PlayerOne.total}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#8B5CF6] text-white text-xs font-bold animate-pulse">
          {game.turn === "player" ? "▶" : "…"}
        </div>
      )}
    </div>
  );
};
