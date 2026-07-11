import React, { useEffect, useRef, useState, useContext } from "react";
import ViewStyles from "./view.module.css";
import toast from "react-hot-toast";
import { useModal } from "../../../utils/ModalContext";
import {
  LongLogo,
  Bobux,
  Undefinded,
  RpsRock,
  RpsPaper,
  RpsScissors,
  WhiteLogo,
} from "../../../assets/exports.jsx";
import { getauth } from "../../../utils/getauth.js";
import SocketContext from "../../../utils/socket.js";
import UserContext from "../../../utils/user.js";
import { api } from "../../../config.js";
import Profile from "../../popup/profile.jsx";
import Fairness from "../fairness/fairness";
import { formatLargeNumber } from "@/utils/value";

const CHOICE_ICON = { rock: RpsRock, paper: RpsPaper, scissors: RpsScissors };

export default function View({ match, onClose }) {
  const { setModalState, modalState } = useModal();
  const [showFairness, setShowFairness] = useState(false);
  const { setLoading } = useModal();
  const [updatedMatch, setUpdatedMatch] = useState(match);
  const [isWinnerVisible, setIsWinnerVisible] = useState(false);
  const { userData, setUserData } = useContext(UserContext);
  const socket = useContext(SocketContext);
  const [isClosing, setIsClosing] = useState(false);
  const [cancel, setCancel] = useState(false);

  useEffect(() => {
    if (match) {
      setUpdatedMatch(match);
    }
  }, [match]);

  useEffect(() => {
    if (updatedMatch?.winner) {
      const timer = setTimeout(() => {
        setIsWinnerVisible(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [updatedMatch]);

  if (!updatedMatch) {
    toast.error("Match data not found!");
    return null;
  }

  const calculateTotalValue = (items) => {
    return items?.reduce((total, item) => total + item.itemvalue, 0) || 0;
  };

  const playerOneTotal = calculateTotalValue(updatedMatch.PlayerOne?.items);
  const playerTwoTotal = calculateTotalValue(updatedMatch.PlayerTwo?.items);
  const totalValue = playerOneTotal + playerTwoTotal;
  const playerOneChance =
    totalValue === 0 ? 0 : (playerOneTotal / totalValue) * 100;
  const playerTwoChance =
    totalValue === 0 ? 0 : (playerTwoTotal / totalValue) * 100;

  const closeModal = () => {
    if (showFairness) return;
    setIsClosing(true);
    setTimeout(() => {
      setModalState(null);
      onClose();
    }, 200);
  };

  const handleCancel = async () => {
    setCancel(true);
    try {
      const response = await fetch(`${api}/rps/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${getauth()}`,
        },
        body: JSON.stringify({ matchid: match._id }),
      });

      const data = await response.json();

      if (response.ok) {
        closeModal();
        setTimeout(() => {
          onClose();
        }, 500);
        toast.success("Match canceled!");
      } else {
        setCancel(false);
        toast.error(data.message || "Something went wrong...");
      }
    } catch (error) {
      setCancel(false);
      toast.error("Something went wrong...");
    }
  };

  return (
    <div className={ViewStyles.blurbg} onClick={closeModal}>
      <div
        className={`${ViewStyles.modalbackgroundview} ${isClosing ? ViewStyles.shrinkOut : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={ViewStyles.header}>
          <img
            src={WhiteLogo}
            alt="logo"
            className={ViewStyles.logo}
          />
          <button className={ViewStyles.closeButton} onClick={closeModal}>
            &times;
          </button>
        </div>

        <div className={ViewStyles.players}>
          <div className={ViewStyles.player}>
            <div className={ViewStyles.avatarWrapper}>
              <img
                src={updatedMatch.PlayerOne?.thumbnail || ""}
                onClick={() =>
                  updatedMatch.PlayerOne?.id &&
                  setModalState(
                    <Profile userid={updatedMatch.PlayerOne?.id} />,
                  )
                }
                alt={updatedMatch.PlayerOne?.username || "Unknown"}
                className={`${ViewStyles.avatar} ${
                  isWinnerVisible &&
                  updatedMatch.winner === updatedMatch.PlayerOne?.id
                    ? ViewStyles.winner
                    : ""
                }`}
              />
              {updatedMatch.PlayerOne?.choice && (
                <div className={ViewStyles.coin}>
                  <img
                    src={CHOICE_ICON[updatedMatch.PlayerOne.choice]}
                    alt={updatedMatch.PlayerOne.choice}
                  />
                </div>
              )}
            </div>
            <h3 className={ViewStyles.username}>
              {updatedMatch.PlayerOne?.username || "Unknown"}
            </h3>
          </div>

          <div className={ViewStyles.gameinfo}>
            {updatedMatch.winnerchoice ? (
              <img
                src={CHOICE_ICON[updatedMatch.winnerchoice]}
                alt={updatedMatch.winnerchoice}
                style={{ width: 72, height: 72, objectFit: "contain" }}
              />
            ) : (
              <p className={ViewStyles.vs}>Vs</p>
            )}
          </div>

          <div className={ViewStyles.player}>
            {updatedMatch.PlayerTwo ? (
              <>
                <div className={ViewStyles.avatarWrapper}>
                  <img
                    src={updatedMatch.PlayerTwo?.thumbnail || Undefinded}
                    alt={updatedMatch.PlayerTwo?.username || "Unknown"}
                    className={`${ViewStyles.avatar} ${
                      isWinnerVisible &&
                      updatedMatch.winner === updatedMatch.PlayerTwo?.id
                        ? ViewStyles.winner
                        : ""
                    }`}
                    onClick={() =>
                      updatedMatch.PlayerTwo?.id &&
                      setModalState(
                        <Profile userid={updatedMatch.PlayerTwo?.id} />,
                      )
                    }
                  />
                  {updatedMatch.PlayerTwo?.choice && (
                    <div className={ViewStyles.coin}>
                      <img
                        src={CHOICE_ICON[updatedMatch.PlayerTwo.choice]}
                        alt={updatedMatch.PlayerTwo.choice}
                      />
                    </div>
                  )}
                </div>
                <h3 className={ViewStyles.username}>
                  {updatedMatch.PlayerTwo?.username || "Waiting..."}
                </h3>
              </>
            ) : (
              <>
                <div className={ViewStyles.avatarWrapper}>
                  <div className={ViewStyles.avatar}></div>
                </div>
                <h3 className={ViewStyles.username}>Waiting...</h3>
              </>
            )}
          </div>
        </div>

        <div className={ViewStyles.gameid}>
          <div className={ViewStyles.gameidholder}>
            <svg
              className={ViewStyles.hashtag}
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 448 512"
              height="1em"
              width="1em"
            >
              <path d="M181.3 32.4c17.4 2.9 29.2 19.4 26.3 36.8L197.8 128h95.1l11.5-69.3c2.9-17.4 19.4-29.2 36.8-26.3s29.2 19.4 26.3 36.8L357.8 128H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H347.1L325.8 320H384c17.7 0 32 14.3 32 32s-14.3 32-32 32H315.1l-11.5 69.3c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8l9.8-58.7H155.1l-11.5 69.3c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8L90.2 384H32c-17.7 0-32-14.3-32-32s14.3-32 32-32h68.9l21.3-128H64c-17.7 0-32-14.3-32-32s14.3-32 32-32h68.9l11.5-69.3c2.9-17.4 19.4-29.2 36.8-26.3zM187.1 192L165.8 320h95.1l21.3-128H187.1z"></path>
            </svg>
            <p
              className={ViewStyles.gameidtag}
              onClick={() => setShowFairness(true)}
            >
              {updatedMatch._id}
            </p>
          </div>
        </div>

        <div className={ViewStyles.items}>
          <div className={ViewStyles.playerItems}>
            <div className={ViewStyles.totalValueContainer}>
              <div className={ViewStyles.item}>
                <img src={Bobux} alt="bobux" className={ViewStyles.bobux} />
                <p className={ViewStyles.pcvalue}>
                  R${playerOneTotal.toLocaleString()}
                </p>
                <p className={ViewStyles.mobilevalue}>
                  {formatLargeNumber(playerOneTotal)}
                </p>
                <p className={ViewStyles.chance}>
                  {!updatedMatch.PlayerTwo
                    ? "100.00%"
                    : `${playerOneChance.toFixed(2)}%`}
                </p>
              </div>
            </div>
            {updatedMatch.PlayerOne?.items?.map((item, index) => (
              <div className={ViewStyles.item} key={index}>
                <div className={ViewStyles.itemImageWrapper}>
                  <img
                    src={item.itemimage}
                    alt={item.name}
                    className={ViewStyles.normalItemImage}
                    loading="eager"
                  />
                  <img
                    src={item.itemimage}
                    alt={item.name}
                    className={ViewStyles.bluredimages}
                    loading="eager"
                  />
                </div>
                <div className={ViewStyles.itemDetails}>
                  <p className={ViewStyles.itemName}>{item.itemname}</p>
                  <p className={ViewStyles.itemValue}>
                    R${formatLargeNumber(item.itemvalue)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className={ViewStyles.playerItems}>
            <div className={ViewStyles.totalValueContainer}>
              <div className={ViewStyles.item}>
                <img src={Bobux} alt="bobux" className={ViewStyles.bobux} />
                <p className={ViewStyles.pcvalue}>
                  R${playerTwoTotal.toLocaleString()}
                </p>
                <p className={ViewStyles.mobilevalue}>
                  {formatLargeNumber(playerTwoTotal)}
                </p>
                <p className={ViewStyles.chance}>
                  {updatedMatch.PlayerTwo
                    ? `${playerTwoChance.toFixed(2)}%`
                    : "0.00%"}
                </p>
              </div>
            </div>
            {updatedMatch.PlayerTwo?.items?.map((item, index) => (
              <div className={ViewStyles.item} key={index}>
                <div className={ViewStyles.itemImageWrapper}>
                  <img
                    src={item.itemimage}
                    alt={item.name}
                    className={ViewStyles.normalItemImage}
                    loading="eager"
                  />
                  <img
                    src={item.itemimage}
                    alt={item.name}
                    className={ViewStyles.bluredimages}
                    loading="eager"
                  />
                </div>
                <div className={ViewStyles.itemDetails}>
                  <p className={ViewStyles.itemName}>{item.itemname}</p>
                  <p className={ViewStyles.itemValue}>
                    R${formatLargeNumber(item.itemvalue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {userData?.userid === updatedMatch.PlayerOne?.id &&
          !updatedMatch.winner && (
            <div className={ViewStyles.cancelButtonContainer}>
              <button
                className={`${ViewStyles.cancelButton} button`}
                onClick={handleCancel}
                disabled={cancel}
              >
                {cancel && (
                  <div className={ViewStyles.loaderWrapperSmall}>
                    <div className={ViewStyles.loaderSmall}></div>
                  </div>
                )}
                Cancel
              </button>
            </div>
          )}
      </div>

      {showFairness && (
        <Fairness
          match={updatedMatch}
          onClose={() => setShowFairness(false)}
        />
      )}
    </div>
  );
}
