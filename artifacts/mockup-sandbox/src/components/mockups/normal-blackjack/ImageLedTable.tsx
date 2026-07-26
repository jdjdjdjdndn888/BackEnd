import { useState } from "react";
import "./ImageLedTable.css";

type CardData = { rank: string; suit: string; red?: boolean };

const initialCards: CardData[] = [
  { rank: "10", suit: "♠" },
  { rank: "6", suit: "♥", red: true },
];

function PlayingCard({ card, hidden = false }: { card?: CardData; hidden?: boolean }) {
  return (
    <div className={`image-led-card ${hidden ? "image-led-card--hidden" : ""}`}>
      {hidden ? (
        <span>?</span>
      ) : (
        <>
          <strong className={card?.red ? "is-red" : ""}>{card?.rank}</strong>
          <span className={card?.red ? "is-red" : ""}>{card?.suit}</span>
        </>
      )}
    </div>
  );
}

export function ImageLedTable() {
  const [cards, setCards] = useState(initialCards);
  const [message, setMessage] = useState("Your move");
  const [finished, setFinished] = useState(false);

  const hit = () => {
    if (finished) return;
    setCards((current) => [
      ...current,
      current.length === 2
        ? { rank: "4", suit: "♦", red: true }
        : { rank: "A", suit: "♣" },
    ]);
    setMessage("Card dealt");
  };

  const stand = () => {
    setFinished(true);
    setMessage("Dealer is checking the table");
  };

  return (
    <main className="image-led-page">
      <div className="image-led-topbar">
        <div className="image-led-brand">
          <span className="image-led-mark">GT</span>
          <div>
            <b>Normal Blackjack</b>
            <small>Player versus dealer</small>
          </div>
        </div>
        <div className="image-led-wallet">
          <small>Normal wallet</small>
          <strong>100,000,000</strong>
          <span>credits</span>
        </div>
      </div>

      <section className="image-led-table" aria-label="Normal blackjack table">
        <img src="/__mockup/blackjack-table.png" alt="" className="image-led-art" />
        <div className="image-led-vignette" />
        <div className="image-led-no-chip" aria-hidden="true" />

        <div className="image-led-status">
          <span className="image-led-status-dot" />
          <span>{message}</span>
        </div>

        <div className="image-led-dealer-hand">
          <PlayingCard hidden />
          <PlayingCard card={{ rank: "K", suit: "♣" }} />
        </div>

        <div className="image-led-player-zone">
          <div className="image-led-player-heading">
            <span>Your hand</span>
            <b>{cards.reduce((total, card) => total + (card.rank === "A" ? 11 : Number(card.rank) || 10), 0)}</b>
          </div>
          <div className="image-led-player-cards">
            {cards.map((card, index) => <PlayingCard key={`${card.rank}-${index}`} card={card} />)}
          </div>
          <div className="image-led-actions">
            <button type="button" className="image-led-hit" onClick={hit} disabled={finished}>Hit</button>
            <button type="button" className="image-led-stand" onClick={stand} disabled={finished}>Stand</button>
          </div>
        </div>

        <div className="image-led-footer">
          <span>{finished ? "Hand complete" : "Bet 100,000 credits"}</span>
          <span>Dealer hits soft 17</span>
        </div>
      </section>

      <div className="image-led-below">
        <div><span>Current wager</span><strong>100,000</strong></div>
        <div><span>Wallet after wager</span><strong>99,900,000</strong></div>
        <button type="button" onClick={() => { setCards(initialCards); setFinished(false); setMessage("Your move"); }}>New hand</button>
      </div>
    </main>
  );
}