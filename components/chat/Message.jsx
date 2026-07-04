import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar } from "../ui/avatar";
import { useModal } from "@/utils/ModalContext";
import Profile from "../popup/profile";
import Tip from "../tip/tip.jsx";

/**
 * @typedef {Object} ChatMessage
 * @property {string} thumbnail
 * @property {string} timestamp
 * @property {string} [rankImage]
 * @property {string} [roleName]
 * @property {string} [usernameColor]
 * @property {string} userid
 */

/** @type {import("react").FC<{msg: ChatMessage}>} */
export const Message = ({ msg }) => {
  const { setModalState } = useModal();

  const openTip = (e) => {
    e.stopPropagation();
    setModalState(
      <Tip
        userId={msg?.userid}
        onClose={() => setModalState(null)}
      />
    );
  };

  return (
    <div className="flex gap-3 rounded-[1.375rem] border border-solid border-[#252839] bg-[#1C1F2E] p-3">
      <div>
        <Avatar
          imgUrl={msg?.thumbnail}
          level={msg.level}
          className="cursor-pointer h-9 w-9"
          onClick={() => setModalState(<Profile userId={msg?.userid} />)}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center leading-6">
          <button
            className="w-max text-xs font-bold bg-transparent border-none cursor-pointer p-0 hover:underline"
            style={{ color: msg.usernameColor || "#68749C" }}
            onClick={openTip}
            title="Send tip"
          >
            <span className="font-medium">@</span>
            {msg.username || "Unknown User"}
          </button>

          {msg.rankImage ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger className="inline h-4 w-4 border-0 border-transparent bg-transparent">
                  <img
                    src={msg.rankImage}
                    className="ml-1 h-full w-full bg-transparent"
                    alt="Rank Icon"
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-[#171925] border border-solid border-[#252839] rounded-[5px] px-3 py-1">
                  <p className="text-white">{msg.roleName || "User"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}

          <span className="ml-auto text-[0.625rem] font-medium text-[#454D71]">
            {msg.timestamp}
          </span>
        </div>

        <p className="text-xs font-medium text-[#A6B2D3] [overflow-wrap:anywhere]">
          {msg.content}
        </p>
      </div>
    </div>
  );
};
