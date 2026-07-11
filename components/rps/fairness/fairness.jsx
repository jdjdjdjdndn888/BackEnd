import React, { useEffect, useState } from "react";
import ViewStyles from "./fairness.module.css";
import toast from "react-hot-toast";
import { FiCopy, FiCheckCircle } from "react-icons/fi";
import sha256 from "crypto-js/sha256";
import VerifyFairness from "./verifyfairness";

async function sha256Hex(input) {
  if (window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sha256(input).toString();
}

export default function Fairness({ match, onClose }) {
  const [isClosing, setIsClosing] = useState(false);
  const [updatedMatch, setUpdatedMatch] = useState(match);
  const [showVerify, setShowVerify] = useState(false);
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (match) {
      setUpdatedMatch(match);
    } else {
      toast.error("Match data not found!");
    }
  }, [match]);

  const isFinished =
    !!updatedMatch &&
    !updatedMatch.active &&
    !!updatedMatch.randomSeed &&
    !!updatedMatch.serverSeed;

  useEffect(() => {
    if (!isFinished) {
      setVerification(null);
      return;
    }

    let cancelled = false;
    setVerifying(true);

    (async () => {
      try {
        const computedHash = await sha256Hex(updatedMatch.serverSeed);
        const hashMatches = computedHash === updatedMatch.serverSeedHash;

        const mod = `${updatedMatch.serverSeed}-${updatedMatch.randomSeed}`;
        const resultHash = await sha256Hex(mod);
        const decimalResult = parseInt(resultHash.substring(0, 8), 16);
        const normalizedResult = decimalResult / Math.pow(16, 8);

        const starterValue =
          updatedMatch.PlayerOne?.items?.reduce(
            (acc, i) => acc + i.itemvalue,
            0,
          ) || 0;
        const joinerValue =
          updatedMatch.PlayerTwo?.items?.reduce(
            (acc, i) => acc + i.itemvalue,
            0,
          ) || 0;
        const totalValue = starterValue + joinerValue;
        const starterChance = totalValue ? starterValue / totalValue : 0;
        const computedWinningPlayer =
          normalizedResult < starterChance ? "PlayerOne" : "PlayerTwo";
        const computedChoice =
          computedWinningPlayer === "PlayerOne"
            ? updatedMatch.PlayerOne?.choice
            : updatedMatch.PlayerTwo?.choice;

        const choiceMatches = computedChoice === updatedMatch.winnerchoice;

        if (!cancelled) {
          setVerification({
            hashMatches,
            choiceMatches,
            computedWinningPlayer,
            computedChoice,
            normalizedResult,
            isFair: hashMatches && choiceMatches,
          });
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setVerification({
            hashMatches: false,
            choiceMatches: false,
            isFair: false,
            error: true,
          });
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFinished, updatedMatch]);

  const copyToClipboard = (label, text) => {
    if (!text) {
      toast.error("The game did not end yet");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  if (!updatedMatch) return null;

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const FairnessField = ({ label, value }) => (
    <div className={ViewStyles.section}>
      <span className={ViewStyles.sectionTitle}>{label}</span>
      <div className={ViewStyles.inputHolder}>
        <span className={ViewStyles.valueText}>{value || "  "}</span>
        <FiCopy
          className={ViewStyles.copyIcon}
          onClick={() => copyToClipboard(label, value)}
          aria-label={`Copy ${label}`}
        />
      </div>
    </div>
  );

  return (
    <div
      className={ViewStyles.blurbg}
      onClick={() => closeModal()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`${ViewStyles.modalbgfair} ${isClosing ? ViewStyles.shrinkOut : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={ViewStyles.closeButton} onClick={() => closeModal()}>
          &times;
        </button>
        <h1 className={ViewStyles.header}>Rock Paper Scissors Fairness</h1>

        {isFinished && verification && (
          <div
            className={`${ViewStyles.verifiedBanner} ${
              verification.isFair
                ? ViewStyles.verifiedBannerSuccess
                : ViewStyles.verifiedBannerFail
            }`}
          >
            <FiCheckCircle className={ViewStyles.verifiedIcon} />
            <div>
              <p className={ViewStyles.verifiedTitle}>
                {verification.isFair
                  ? "100% Verified Fair"
                  : "Verification Failed"}
              </p>
              <p className={ViewStyles.verifiedSubtitle}>
                {verification.isFair
                  ? `Independently recalculated in your browser — winner confirmed as "${verification.computedWinningPlayer}" (${verification.computedChoice}), matching the recorded result exactly.`
                  : "The recalculated result did not match the recorded outcome."}
              </p>
            </div>
          </div>
        )}

        {isFinished && verifying && !verification && (
          <div className={ViewStyles.verifiedBanner}>
            <p className={ViewStyles.verifiedSubtitle}>Verifying result...</p>
          </div>
        )}

        <FairnessField label="Game ID" value={updatedMatch._id} />
        <FairnessField
          label="Server Seed Hash (Committed Before Match)"
          value={updatedMatch.serverSeedHash}
        />
        <FairnessField
          label={
            isFinished
              ? "Server Seed (Revealed)"
              : "Server Seed (Revealed After Match Ends)"
          }
          value={isFinished ? updatedMatch.serverSeed : ""}
        />
        <FairnessField label="Random Seed" value={updatedMatch.randomSeed} />

        {isFinished && (
          <button
            className={`${ViewStyles.verifyButton} button`}
            onClick={() => setShowVerify(true)}
          >
            Verify It Yourself
          </button>
        )}
      </div>

      {showVerify && (
        <VerifyFairness
          match={updatedMatch}
          onClose={() => setShowVerify(false)}
        />
      )}
    </div>
  );
}
