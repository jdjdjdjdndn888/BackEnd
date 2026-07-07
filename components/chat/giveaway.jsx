import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import GiveawayStyles from "./giveaway.module.css";
import { useModal } from "../../utils/ModalContext.jsx";
import Profile from "../popup/profile.jsx";
import { Bobux } from "../../assets/exports.jsx";
import Countdown from "react-countdown";
import SocketContext from "../../utils/socket";
import { api } from "../../config.js";
import { getauth } from "../../utils/getauth";
import Confetti from "react-confetti";
import LoginModal from "../popup/login.jsx";
import UserContext from "../../utils/user.js";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function Giveaways() {
  const { setModalState } = useModal();
  const [loading, setLoading] = useState(false);
  const [giveaways, setGiveaways] = useState([]);
  const [currentGiveawayIndex, setCurrentGiveawayIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [carouselApi, setCarouselApi] = useState(null);
  const socket = useContext(SocketContext);
  const { userData } = useContext(UserContext);
  const currentGiveawayIdRef = useRef();

  useEffect(() => {
    currentGiveawayIdRef.current = giveaways[currentGiveawayIndex]?._id;
  }, [currentGiveawayIndex, giveaways]);

  // Wire up embla's select event for accurate slide tracking
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => {
      setCurrentGiveawayIndex(carouselApi.selectedScrollSnap());
    };
    carouselApi.on("select", onSelect);
    return () => carouselApi.off("select", onSelect);
  }, [carouselApi]);

  const fetchGiveaways = async () => {
    try {
      const response = await fetch(`${api}/giveaways/latest`);
      if (response.ok) {
        const data = await response.json();
        setGiveaways(data.giveaways || []);
      } else {
        toast.error("Failed to load giveaways!");
      }
    } catch {
      toast.error("Failed to load giveaways!");
    }
  };

  const handleGiveaway = useCallback((newGiveaway) => {
    if (newGiveaway?._id) {
      setGiveaways((prev) => [...prev, newGiveaway]);
    }
  }, []);

  const handleGiveawayUpdate = useCallback((updatedGiveaway) => {
    setGiveaways((prev) =>
      prev.map((g) =>
        g._id === updatedGiveaway._id ? { ...g, ...updatedGiveaway } : g,
      ),
    );

    if (
      updatedGiveaway.winner &&
      currentGiveawayIdRef.current === updatedGiveaway._id
    ) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, []);

  const handleGiveawayDone = useCallback((data) => {
    data?.giveaways && setGiveaways(data.giveaways);
  }, []);

  useEffect(() => {
    fetchGiveaways();
    if (socket) {
      socket.on("NEW_GIVEAWAY", handleGiveaway);
      socket.on("GIVEAWAY_UPDATE", handleGiveawayUpdate);
      socket.on("GIVEAWAY_DONE", handleGiveawayDone);
    }
    return () => {
      if (socket) {
        socket.off("NEW_GIVEAWAY", handleGiveaway);
        socket.off("GIVEAWAY_UPDATE", handleGiveawayUpdate);
        socket.off("GIVEAWAY_DONE", handleGiveawayDone);
      }
    };
  }, [socket, handleGiveaway, handleGiveawayUpdate, handleGiveawayDone]);

  const joinGiveaway = async (giveawayId) => {
    if (!giveawayId) return toast.error("Select a giveaway!");
    if (!userData) return setModalState(<LoginModal />);

    setLoading(true);
    try {
      const response = await fetch(`${api}/giveaways/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getauth()}`,
        },
        body: JSON.stringify({ giveawayid: giveawayId }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Successfully joined!");
      } else {
        toast.error(data.message || "Could not join the giveaway!");
      }
    } catch {
      toast.error("Could not join the giveaway!");
    } finally {
      setLoading(false);
    }
  };

  if (!giveaways.length) return null;

  return (
    <div className={GiveawayStyles.carouselContainer}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      <Carousel
        opts={{ align: "center", loop: false, containScroll: "trimSnaps" }}
        className={GiveawayStyles.carousel}
        setApi={setCarouselApi}
      >
        <CarouselContent className={GiveawayStyles.carouselContent}>
          {giveaways.map((giveaway) => (
            <CarouselItem
              key={giveaway._id}
              className={GiveawayStyles.carouselItem}
            >
              <div className={GiveawayStyles.giveawayWrapper}>
                {/* Header: creator + entries */}
                <div className={GiveawayStyles.giveawayHeader}>
                  <button
                    type="button"
                    className={GiveawayStyles.starterusername}
                    onClick={() =>
                      setModalState(<Profile userId={giveaway.starterid} />)
                    }
                    aria-label={`View profile of ${giveaway.starterusername}`}
                  >
                    {giveaway.starterusername}
                  </button>
                  <span className={GiveawayStyles.entries}>
                    {giveaway.entries} Entries
                  </span>
                </div>

                {/* Item display */}
                {giveaway.item?.length > 0 && (
                  <div className={GiveawayStyles.itemWrapper}>
                    <div className={GiveawayStyles.itemImageWrapper}>
                      <img
                        src={giveaway.item[0].itemimage}
                        alt=""
                        aria-hidden="true"
                        className={GiveawayStyles.bluritem}
                      />
                      <img
                        src={giveaway.item[0].itemimage}
                        alt={giveaway.item[0].itemname}
                        className={GiveawayStyles.itemImage}
                      />
                    </div>
                    <div className={GiveawayStyles.itemDetails}>
                      <h3>{giveaway.item[0].itemname}</h3>
                      <div className={GiveawayStyles.itemValueWrapper}>
                        <img
                          src={Bobux}
                          alt="Bobux"
                          className={GiveawayStyles.bobuxImage}
                        />
                        <p className={GiveawayStyles.itemValue}>
                          {typeof giveaway.item[0].itemvalue === "number"
                            ? giveaway.item[0].itemvalue.toLocaleString()
                            : giveaway.item[0].itemvalue}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Countdown + Join */}
                <Countdown
                  date={new Date(giveaway.enddate).getTime()}
                  renderer={({ hours, minutes, seconds, completed }) => (
                    <div className={GiveawayStyles.timerContainer}>
                      {completed ? (
                        <p className={giveaway.winner ? GiveawayStyles.winner : GiveawayStyles.timer}>
                          {giveaway.winner || "Rolling..."}
                        </p>
                      ) : (
                        <>
                          <p className={GiveawayStyles.timer}>
                            {String(hours).padStart(2, "0")}h{" "}
                            {String(minutes).padStart(2, "0")}m{" "}
                            {String(seconds).padStart(2, "0")}s
                          </p>
                          <button
                            type="button"
                            className={`button ${GiveawayStyles.joinButton}`}
                            disabled={loading}
                            onClick={() => joinGiveaway(giveaway._id)}
                            aria-label={`Join giveaway for ${giveaway.item?.[0]?.itemname ?? "item"}`}
                          >
                            {loading && (
                              <div className={GiveawayStyles.loaderWrapperSmall}>
                                <div className={GiveawayStyles.loaderSmall} />
                              </div>
                            )}
                            Join
                          </button>
                        </>
                      )}
                    </div>
                  )}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious
          className={`${GiveawayStyles.navButton} ${GiveawayStyles.prevButton}`}
          aria-label="Previous giveaway"
        />
        <CarouselNext
          className={`${GiveawayStyles.navButton} ${GiveawayStyles.nextButton}`}
          aria-label="Next giveaway"
        />
      </Carousel>
    </div>
  );
}
