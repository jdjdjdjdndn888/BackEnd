import { useEffect } from "react";
import styles from "./RainbowAnimation.module.css";

const BANDS = [
  "#FF3B30", // red
  "#FF9500", // orange
  "#FFCC00", // yellow
  "#34C759", // green
  "#007AFF", // blue
  "#5856D6", // indigo
  "#AF52DE", // violet
];

const ITEMS = ["💎", "⭐", "🐾", "✨", "💰"];

export default function RainbowAnimation({ owners = [], onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={styles.overlay}>
      {/* Bag of items waiting on the right */}
      <div className={styles.bagScene}>
        <div className={styles.itemsBurst}>
          {ITEMS.map((item, i) => (
            <span key={i} className={styles.burstItem} style={{ "--i": i }}>
              {item}
            </span>
          ))}
        </div>
        <span className={styles.bagEmoji}>🎒</span>
      </div>

      {/* Rainbow + owners sliding across */}
      <div className={styles.scene}>
        {/* Avatars on top */}
        <div className={styles.avatarRow}>
          {(owners.length > 0 ? owners : [{ thumbnail: null, username: "👑" }]).map((owner, i) => (
            <div
              key={i}
              className={styles.avatarWrapper}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <span className={styles.crown}>👑</span>
              {owner.thumbnail ? (
                <img
                  src={owner.thumbnail}
                  alt={owner.username}
                  className={styles.avatar}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={styles.avatarFallback}
                style={{ display: owner.thumbnail ? "none" : "flex" }}
              >
                {(owner.username || "?")[0].toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {/* Rainbow bands */}
        <div className={styles.rainbow}>
          {BANDS.map((color, i) => (
            <div key={i} className={styles.band} style={{ background: color }} />
          ))}
          {/* Shine overlay */}
          <div className={styles.rainbowShine} />
        </div>
      </div>
    </div>
  );
}
