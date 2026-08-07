import React from "react";
import { History, LockKeyhole, Plus } from "lucide-react";
import { useSeo } from "../utils/useSeo.js";

const BACKGROUNDS = {
  Blackjack: "/bg-blackjack.png",
  Dice: "/bg-dice.png",
  Upgrader: "/bg-upgrader.png",
  Trades: "/bg-trades.png",
};

export default function TemporaryClosed({ gameName }) {
  useSeo({
    title: `${gameName} Temporarily Closed | GemTide`,
    description: `${gameName} is temporarily closed on GemTide.`,
    path: `/${gameName.toLowerCase()}`,
  });

  const background = BACKGROUNDS[gameName];

  return (
    <main
      style={{
        minHeight: "100%",
        color: "#fff",
        background: background
          ? `linear-gradient(180deg, rgba(4,8,16,.56), rgba(4,8,16,.94)), url(${background}) center/cover no-repeat fixed`
          : "linear-gradient(180deg, #111321, #070810)",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,.08)",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: ".15em",
            color: "#777",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {gameName}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled
            style={disabledButton}
            title={`${gameName} history is temporarily closed`}
          >
            <History size={14} /> History
          </button>
          <button
            type="button"
            disabled
            style={disabledButton}
            title={`${gameName} rooms are temporarily closed`}
          >
            <Plus size={14} /> Create Room
          </button>
        </div>
      </header>

      <section
        style={{
          minHeight: "calc(100vh - 78px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            padding: "42px 32px",
            border: "1px solid rgba(167,139,250,.25)",
            borderRadius: 16,
            background: "rgba(9,10,20,.72)",
            boxShadow: "0 20px 70px rgba(0,0,0,.35)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 18px",
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              color: "#c4b5fd",
              background: "rgba(139,92,246,.16)",
              border: "1px solid rgba(167,139,250,.3)",
            }}
          >
            <LockKeyhole size={25} />
          </div>
          <p
            style={{
              margin: 0,
              color: "#c4b5fd",
              fontSize: 11,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              fontWeight: 800,
            }}
          >
            Temporarily Closed
          </p>
          <h1 style={{ margin: "12px 0 8px", fontSize: 28, lineHeight: 1.15 }}>
            {gameName} is unavailable
          </h1>
          <p style={{ margin: 0, color: "#9ca3af", fontSize: 14, lineHeight: 1.6 }}>
            This game is temporarily closed while we finish the Cloudflare
            migration. Please check back later.
          </p>
        </div>
      </section>
    </main>
  );
}

const disabledButton = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 14px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,.08)",
  background: "rgba(255,255,255,.04)",
  color: "#555",
  fontSize: 13,
  fontWeight: 600,
  cursor: "not-allowed",
  opacity: 0.7,
};