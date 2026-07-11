import React, { useState, useEffect } from "react";
import { useModal } from "../../../utils/ModalContext";
import HistoryStyles from "./history.module.css";
import toast from "react-hot-toast";
import { api } from "../../../config.js";
import { getauth } from "../../../utils/getauth.js";
import Profile from "../../popup/profile.jsx";
import { RpsRock, RpsPaper, RpsScissors } from "../../../assets/exports.jsx";
import Bobux from "../../../assets/images/bobux.png";
import { formatLargeNumber } from "@/utils/value";
import View from "../View/view.jsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CHOICE_ICON = { rock: RpsRock, paper: RpsPaper, scissors: RpsScissors };

export default function History() {
  const { setModalState } = useModal();
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const fetchmatches = async () => {
      setLoading(true);
      setMatches([]);
      try {
        const response = await fetch(`${api}/rps/history/me`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${getauth()}`,
          },
        });
        const data = await response.json();
        if (data.history) {
          setMatches(data.history);
        } else {
          toast.error(data.message || "Could not fetch the history!");
          setMatches([]);
        }
      } catch (error) {
        toast.error("Could not fetch the history!");
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchmatches();
  }, []);

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setModalState(null);
    }, 200);
  };

  const renderItems = (playerItems, playerTwoItems) => {
    const allItems = [...playerItems, ...playerTwoItems].sort(
      (a, b) => b.itemvalue - a.itemvalue,
    );

    return (
      <TooltipProvider delayDuration={0}>
        <div className={HistoryStyles.itemholder}>
          {allItems.slice(0, 3).map((item) => (
            <Tooltip key={item._id}>
              <TooltipTrigger className="border-none bg-transparent">
                <div className={HistoryStyles.itemWrapper}>
                  <div className={HistoryStyles.imageContainer}>
                    <img
                      src={item.itemimage}
                      className={HistoryStyles.backgroundImage}
                    />
                    <img
                      src={item.itemimage}
                      alt={item.itemname}
                      className={HistoryStyles.itemone}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="tooltip z-[9999]">
                <p>{item.itemname || "Unknown Item"}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {allItems.length > 3 && (
            <div className={HistoryStyles.itemCount}>
              +{allItems.length - 3}
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  };

  const handleViewMatch = (match) => {
    setModalState(<View match={match} onClose={null} />);
  };

  return (
    <div className={HistoryStyles.blurbg} onClick={closeModal}>
      <div
        className={`${HistoryStyles.modalbackgroundhistory} ${
          isClosing ? HistoryStyles.shrinkOut : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={HistoryStyles.closeButton} onClick={closeModal}>
          &times;
        </button>

        <div className={HistoryStyles.modalContent}>
          <h1 className={HistoryStyles.historyTitle}>Rock Paper Scissors</h1>

          {loading ? (
            <div className={HistoryStyles.loaderWrapper}>
              <div className={HistoryStyles.loader}></div>
            </div>
          ) : (
            <div className={HistoryStyles.coinflips}>
              {matches.map((match) => (
                <div key={match._id} className={HistoryStyles.flip}>
                  <div className={HistoryStyles.players}>
                    <div
                      className={`${HistoryStyles.player} ${
                        match.PlayerTwo
                          ? match.winner === match.PlayerOne.id
                            ? HistoryStyles.winner
                            : HistoryStyles.loser
                          : ""
                      }`}
                    >
                      <div className={HistoryStyles.playerCoin}>
                        <img
                          src={CHOICE_ICON[match.PlayerOne.choice]}
                          alt="choice"
                          className={HistoryStyles.coinIndicator}
                        />
                      </div>
                      <img
                        src={match.PlayerOne.thumbnail}
                        alt={match.PlayerOne.username}
                        className={HistoryStyles.avatar}
                        onClick={() => {
                          setModalState(null);
                          setTimeout(() =>
                            setModalState(
                              <Profile userid={match.PlayerOne.id} />,
                            ),
                          );
                        }}
                      />
                    </div>

                    <div
                      className={`${HistoryStyles.player} ${
                        match.PlayerTwo
                          ? match.winner === match.PlayerTwo.id
                            ? HistoryStyles.winner
                            : HistoryStyles.loser
                          : HistoryStyles.coin
                      }`}
                    >
                      {match.PlayerTwo ? (
                        <>
                          <div className={HistoryStyles.playerCoin}>
                            <img
                              src={CHOICE_ICON[match.PlayerTwo.choice]}
                              alt="choice"
                              className={HistoryStyles.coinIndicator}
                            />
                          </div>
                          <img
                            src={match.PlayerTwo.thumbnail}
                            alt={match.PlayerTwo.username}
                            className={HistoryStyles.avatar}
                            onClick={() => {
                              setModalState(null);
                              setTimeout(() =>
                                setModalState(
                                  <Profile userid={match.PlayerTwo.id} />,
                                ),
                              );
                            }}
                          />
                        </>
                      ) : (
                        <div className={HistoryStyles.coinPlaceholder}>
                          <div className={HistoryStyles.questionMark}>?</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {match.PlayerTwo && (
                    <img
                      src={CHOICE_ICON[match.winnerchoice]}
                      alt="Winner Choice"
                      className={HistoryStyles.winnerCoin}
                    />
                  )}

                  <div className={HistoryStyles.itemholder}>
                    <div className={HistoryStyles.items}>
                      {renderItems(
                        match.PlayerOne.items,
                        match.PlayerTwo ? match.PlayerTwo.items : [],
                      )}
                    </div>
                  </div>

                  <div className={HistoryStyles.value}>
                    <div className={HistoryStyles.topRow}>
                      <img
                        src={Bobux}
                        alt="Icon"
                        className={HistoryStyles.bobuxicon}
                      />
                      <span>{formatLargeNumber(match.requirements.static)}</span>
                    </div>
                    <p>
                      {formatLargeNumber(match.requirements.min)} -{" "}
                      {formatLargeNumber(match.requirements.max)}
                    </p>
                  </div>

                  <div className={HistoryStyles.buttonsContainer}>
                    <button
                      onClick={() => handleViewMatch(match)}
                      className="buttonsecond"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
              {matches.length === 0 && !loading && null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
