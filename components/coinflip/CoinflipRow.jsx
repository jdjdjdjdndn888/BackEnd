import { formatLargeNumber } from "@/utils/value";
import Profile from "../popup/profile";
import CoinflipStyles from "./coinfliplayout.module.css";
import { useModal } from "@/utils/ModalContext";
import LoginModal from "../popup/login";
import JoinMatch from "./Join/joincoinflip";
import View from "./View/view";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trails, Heads } from "../../assets/exports.jsx";
import { WalletIcon } from "@/assets/icons/WalletIcon";
import QuestionMarkIcon from "@/assets/images/question-mark.svg";
import { useCallback, memo } from "react";
import { cn } from "@/lib/utils";

/**
 * @typedef {Object} CoinflipRowProps
 * @property {unknown} flip
 * @property {object} countdowns
 * @property {unknown} setSelectedFlip
 * @property {unknown} userData
 */

/** @type {import("react").FC<CoinflipRowProps>} */
export const CoinflipRow = ({
  countdowns,
  flip,
  setSelectedFlip,
  userData,
}) => {
  const { setModalState } = useModal();

  const handleViewFlip = useCallback(() => {
    setTimeout(() => {
      setSelectedFlip(flip);
      setModalState(
        <View coinflip={flip} onClose={() => setSelectedFlip(null)} />,
      );
    }, 0);
  }, [flip]);

  return (
    <div className="grid grid-cols-1 items-center gap-3 rounded-xl border border-solid border-[#1e2035] bg-[#12141f] px-4 py-3 transition-colors hover:border-[#252839] hover:bg-[#161824] xl:grid-cols-[auto_1fr_auto_auto_auto]">
      {/* Players */}
      <div className="flex items-center gap-3 justify-self-center xl:justify-self-start flex-shrink-0">
        <Player
          imgUrl={flip.PlayerOne.thumbnail}
          userid={flip.PlayerOne.id}
          choice={flip.PlayerOne.coin}
          status={
            flip.PlayerTwo && !countdowns[flip._id]
              ? flip.winner === flip.PlayerOne.id
                ? "winner"
                : "loser"
              : "pending"
          }
        />

        <span className="text-xs font-bold text-[#42496B] tracking-widest select-none">VS</span>

        <Player
          imgUrl={flip.PlayerTwo?.thumbnail ?? QuestionMarkIcon}
          choice={flip.PlayerOne.coin === "heads" ? "tails" : "heads"}
          userid={flip.PlayerTwo?.id}
          status={
            flip.PlayerTwo && !countdowns[flip._id]
              ? flip.winner === flip.PlayerTwo.id
                ? "winner"
                : "loser"
              : "pending"
          }
        />
      </div>

      {/* Items */}
      <div className="flex min-w-0 justify-center xl:justify-start">
        <ItemsCell
          itemsA={flip.PlayerOne.items}
          itemsB={flip.PlayerTwo?.items ?? []}
        />
      </div>

      {/* Value */}
      <ValueCell
        value={flip.requirements.static}
        min={flip.requirements.min}
        max={flip.requirements.max}
      />

      {/* Countdown coin */}
      <CoinCountDown
        countdown={countdowns[flip._id]}
        winner={flip.winnercoin}
        max={3}
      />

      {/* Action buttons */}
      <div className="flex justify-center gap-2 xl:flex-col xl:justify-self-end xl:gap-1.5 xl:w-[88px]">
        {flip.active && (
          <button
            onClick={() => {
              if (userData) {
                setModalState(
                  <JoinMatch
                    coinflip={flip}
                    onJoin={setSelectedFlip}
                    onClose={() => setSelectedFlip(null)}
                  />,
                );
              } else {
                setModalState(<LoginModal />);
              }
            }}
            disabled={!!flip.PlayerTwo || userData?.userid === flip.creatorid}
            className="min-w-[80px] xl:w-full cursor-pointer rounded-lg border-none bg-[#8B5CF6] py-1.5 px-3 text-center text-sm font-bold text-white transition-all hover:bg-[#7C3AED] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join
          </button>
        )}
        <button
          onClick={handleViewFlip}
          className="min-w-[80px] xl:w-full cursor-pointer rounded-lg border border-solid border-[#252839] bg-[#1C1F2E] py-1.5 px-3 text-center text-sm font-bold text-[#8B93B8] transition-all hover:border-[#8B5CF6] hover:text-white active:scale-95"
          type="button"
        >
          View
        </button>
      </div>
    </div>
  );
};

/** @type {import("react").FC<{value: string, min:string, max: string}>} */
const ValueCell = ({ max, min, value }) => {
  return (
    <div className="flex-shrink-0 w-28 text-center">
      <p className="inline-flex items-center gap-1.5 text-lg font-bold leading-tight text-white">
        <WalletIcon className="w-4 text-[#8B5CF6]" />
        <span>{formatLargeNumber(value)}</span>
      </p>
      <p className="text-xs font-medium leading-tight text-[#42496B] mt-0.5">
        {formatLargeNumber(min)} – {formatLargeNumber(max)}
      </p>
    </div>
  );
};

/** @type {import("react").FC<{choice: "heads" | "tails", status: "winner" | "loser" | "pending", imgUrl: string, userid?: string }>} */
const Player = ({ choice, imgUrl, status, userid }) => {
  const { setModalState } = useModal();

  return (
    <div
      className={cn(
        "relative box-border h-12 w-12 flex-shrink-0 rounded-full border-2 border-solid border-[#1e2035] bg-[#0f1220] transition-all",
        status === "winner" && "border-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.4)]",
        status === "loser" && "opacity-40",
      )}
    >
      <button
        className={`block h-full w-full overflow-hidden rounded-[inherit] border-none bg-transparent ${userid ? "cursor-pointer" : "cursor-default"}`}
        onClick={() => userid && setModalState(<Profile userId={userid} />)}
      >
        <img
          loading="lazy"
          height={48}
          width={48}
          alt=""
          src={imgUrl}
          className="box-border block w-full h-full object-contain"
        />
      </button>

      {/* Coin badge */}
      <div
        className="absolute -right-1 -top-1 box-border h-5 w-5 overflow-hidden rounded-full border border-solid border-[#0f1220]"
      >
        <img
          loading="lazy"
          className="block w-full h-full object-contain"
          alt={choice}
          src={choice === "heads" ? Heads : Trails}
        />
      </div>
    </div>
  );
};

/**
 * @type {import("react").FC<{itemsA: unknown[], itemsB: unknown[]}>}
 */
const ItemsCell = memo(({ itemsA, itemsB }) => {
  const max = 5;
  const totalCount = itemsA.length + itemsB.length;
  const sorted = [...itemsA, ...itemsB]
    .sort((a, b) => b.itemvalue - a.itemvalue)
    .slice(0, max);

  return (
    <div className="flex items-center">
      <TooltipProvider delayDuration={0}>
        {sorted.map((item, index) => (
          <Tooltip key={item._id}>
            <TooltipTrigger
              className={cn(
                "relative box-border block h-10 w-10 flex-shrink-0 cursor-pointer overflow-hidden rounded-full border-2 border-solid border-[#1e2035] bg-[#0f1220] transition-all hover:border-[#8B5CF6] hover:z-10",
                index > 0 && "-ml-3"
              )}
            >
              <img
                src={item.itemimage}
                alt={item.itemname?.slice(0, 1)}
                className="block h-full w-full max-w-full object-contain"
              />
              {index === max - 1 && totalCount > max && (
                <div
                  style={{
                    backdropFilter: "blur(1px)",
                    background: "rgba(15,18,32,0.85)",
                  }}
                  className="pointer-events-none absolute left-0 top-0 z-[1] box-border grid h-full w-full select-none place-items-center text-[10px] font-bold text-white"
                >
                  +{totalCount - max}
                </div>
              )}
            </TooltipTrigger>
            {(index < max - 1 || (index === max - 1 && totalCount <= max)) && (
              <TooltipContent className="rounded-lg border border-solid border-[#252839] bg-[#1C1F2E] px-3 py-1.5">
                <p className="text-sm text-white">{item.itemname || "Unknown Item"}</p>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
});

/**
 * @param {Object} props
 * @param {number} [props.countdown]
 * @param {"heads" | "tails"} [props.winner]
 */
const CoinCountDown = ({ countdown, winner }) => {
  const show = typeof countdown === "number" || !!winner;

  if (!show) return <div className="w-10 flex-shrink-0" />;

  return (
    <svg
      className="w-10 h-10 flex-shrink-0"
      viewBox="-50 -50 100 100"
      fill="none"
    >
      {typeof countdown === "number" ? (
        <g>
          <circle
            r="49"
            fill="#0f1220"
            strokeWidth="2"
            stroke="#8B5CF6"
            pathLength="100"
            strokeDasharray="100"
            transform="rotate(-90)"
            className={CoinflipStyles.countdown}
          />
          <text
            style={{ fontFamily: "Poppins" }}
            className="text-2xl font-bold leading-none"
            fill="white"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {countdown}
          </text>
        </g>
      ) : winner ? (
        <image
          x="-50"
          y="-50"
          width="100"
          height="100"
          href={winner === "heads" ? Heads : Trails}
          className={CoinflipStyles["winner-coin"]}
        />
      ) : null}
    </svg>
  );
};
