import React, { useState, useEffect } from "react";
import ViewStyles from "./veryfairness.module.css";
import toast from "react-hot-toast";
import sha256 from "crypto-js/sha256";
import { useModal } from "../../../utils/ModalContext";

export default function VerifyFairness({ match, onClose } = {}) {
  const [randomSeed, setRandomSeed] = useState(match?.randomSeed || "");
  const [serverSeed, setServerSeed] = useState(match?.serverSeed || "");
  const [starterValue, setStarterValue] = useState(
    match?.PlayerOne?.items?.length
      ? String(
          match.PlayerOne.items.reduce((acc, i) => acc + i.itemvalue, 0),
        )
      : "",
  );
  const [joinerValue, setJoinerValue] = useState(
    match?.PlayerTwo?.items?.length
      ? String(
          match.PlayerTwo.items.reduce((acc, i) => acc + i.itemvalue, 0),
        )
      : "",
  );
  const [result, setResult] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const { setModalState } = useModal();

  useEffect(() => {
    if (
      match?.serverSeed &&
      match?.randomSeed &&
      starterValue &&
      joinerValue
    ) {
      validateFairness();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeNumber = (value) => {
    return parseFloat(String(value).replace(/,/g, ""));
  };

  const validateFairness = async () => {
    if (!randomSeed || !serverSeed || !starterValue || !joinerValue) {
      toast.error("Some fields are missing!");
      return;
    }

    try {
      const normalizedResult = await getResult(serverSeed, randomSeed);
      const { winningPlayer } = getWinningPlayer(
        normalizedResult,
        starterValue,
        joinerValue,
      );
      const hashMatches = match?.serverSeedHash
        ? await verifyHash(serverSeed, match.serverSeedHash)
        : null;
      setResult({ normalizedResult, winningPlayer, hashMatches });
    } catch (error) {
      toast.error("Error calculating hash");
      console.error(error);
    }
  };

  const verifyHash = async (seed, expectedHash) => {
    const computedHash = await sha256Hex(seed);
    return computedHash === expectedHash;
  };

  const sha256Hex = async (input) => {
    if (window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return sha256(input).toString();
  };

  const getResult = async (serverSeed, randomSeed) => {
    const mod = `${serverSeed}-${randomSeed}`;
    const hashHex = await sha256Hex(mod);
    const decimalResult = parseInt(hashHex.substring(0, 8), 16);
    const maxValue = Math.pow(16, 8);
    return decimalResult / maxValue;
  };

  const getWinningPlayer = (normalizedResult, starterValue, joinerValue) => {
    const totalValue =
      normalizeNumber(starterValue) + normalizeNumber(joinerValue);
    const starterChance = normalizeNumber(starterValue) / totalValue;
    return {
      winningPlayer: normalizedResult < starterChance ? "PlayerOne" : "PlayerTwo",
    };
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        setModalState(null);
      }
    }, 200);
  };

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
        <button
          className={ViewStyles.closeButton}
          onClick={() => closeModal(false)}
        >
          &times;
        </button>
        <h1 className={ViewStyles.header}>Rock Paper Scissors Fairness</h1>
        <p></p>
        <div className={ViewStyles.section}>
          <span className={ViewStyles.sectionTitle}>Random Seed</span>
          <div className={ViewStyles.inputHolder}>
            <input
              type="text"
              value={randomSeed}
              onChange={(e) => setRandomSeed(e.target.value)}
              className={ViewStyles.valueText}
            />
          </div>
        </div>

        <div className={ViewStyles.section}>
          <span className={ViewStyles.sectionTitle}>Server Seed</span>
          <div className={ViewStyles.inputHolder}>
            <input
              type="text"
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              className={ViewStyles.valueText}
            />
          </div>
        </div>

        {match?.serverSeedHash && (
          <div className={ViewStyles.section}>
            <span className={ViewStyles.sectionTitle}>
              Committed Server Seed Hash
            </span>
            <div className={ViewStyles.inputHolder}>
              <span className={ViewStyles.valueText}>
                {match.serverSeedHash}
              </span>
            </div>
          </div>
        )}

        <div className={ViewStyles.inputGroup}>
          <div className={ViewStyles.section}>
            <span className={ViewStyles.sectionTitle}>Starter Value</span>
            <div className={ViewStyles.inputHolder}>
              <input
                type="text"
                value={starterValue}
                onChange={(e) => setStarterValue(e.target.value)}
                className={ViewStyles.valueText}
              />
            </div>
          </div>

          <div className={ViewStyles.section}>
            <span className={ViewStyles.sectionTitle}>Joiner Value</span>
            <div className={ViewStyles.inputHolder}>
              <input
                type="text"
                value={joinerValue}
                onChange={(e) => setJoinerValue(e.target.value)}
                className={ViewStyles.valueText}
              />
            </div>
          </div>
        </div>

        {result && (
          <div className={ViewStyles.resultSection}>
            <div className={ViewStyles.sectionTitle}>Result:</div>
            <div className={ViewStyles.resultText}>
              Result: {result.normalizedResult.toFixed(6)}
              <br />
              Winning Player: {result.winningPlayer}
              {result.hashMatches !== null && (
                <>
                  <br />
                  Server Seed Hash Matches Commitment:{" "}
                  {result.hashMatches ? "✅ Yes" : "❌ No"}
                </>
              )}
              {match?.winner && (
                <>
                  <br />
                  Actual Recorded Winner:{" "}
                  {match.winner === match.PlayerOne?.id
                    ? "PlayerOne"
                    : "PlayerTwo"}{" "}
                  {result.winningPlayer ===
                  (match.winner === match.PlayerOne?.id
                    ? "PlayerOne"
                    : "PlayerTwo")
                    ? "✅ Matches"
                    : "❌ Mismatch"}
                </>
              )}
            </div>
          </div>
        )}

        <div className={ViewStyles.buttonContainer}>
          <button
            className={`${ViewStyles.button} button`}
            onClick={validateFairness}
          >
            Validate Fairness
          </button>
          <span
            className={ViewStyles.showCodeLink}
            onClick={() => setShowCode(!showCode)}
          >
            {showCode ? "Hide Code" : "Show Code"}
          </span>
        </div>

        {showCode && (
          <pre className={ViewStyles.codeBlock}>
            {`async function generateFairResult(serverSeed, randomSeed) {
  const inputData = new TextEncoder().encode(\`\${serverSeed}-\${randomSeed}\`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', inputData);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return parseInt(hashHex.slice(0, 8), 16) / Math.pow(16, 8);
}

async function verifyServerSeed(serverSeed, committedHash) {
  const inputData = new TextEncoder().encode(serverSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', inputData);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex === committedHash;
}

function decideWinningPlayer(normalizedValue, starterContribution, joinerContribution) {
  return normalizedValue < starterContribution / (starterContribution + joinerContribution)
    ? 'PlayerOne'
    : 'PlayerTwo';
}

const serverSeed = 'the revealed server seed shown after the match ends';
const randomSeed = 'the random seed shown after the match ends';
const starterValue = 55;
const joinerValue =  23;

generateFairResult(serverSeed, randomSeed)
  .then(normalizedResult => {
    console.log(\`Normalized Result (0-1 Float): \${normalizedResult}\`);
    console.log(\`Winning Player: \${decideWinningPlayer(normalizedResult, starterValue, joinerValue)}\`);
  })
  .catch(console.error);
`}
          </pre>
        )}
      </div>
    </div>
  );
}
