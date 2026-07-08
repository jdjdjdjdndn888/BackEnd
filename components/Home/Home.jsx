import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SocketContext from "@/utils/socket";
import "./Home.css";

// ─── SVG ICONS ────────────────────────────────────────────────────────────────

const UsersIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" />
    <path d="M9 14c-4.418 0-8 3-8 6v1h16v-1c0-3-3.582-6-8-6z" />
    <circle cx="17" cy="8" r="3" opacity="0.6" />
    <path d="M21 21v-1c0-2.4-2.1-4.6-5-5.6" opacity="0.6" />
  </svg>
);

const TrophyIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
  </svg>
);

const DiamondIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
    <path d="M2 9h20" />
    <path d="M12 21l-4-12" />
    <path d="M12 21l4-12" />
    <path d="M6 3l2 6" />
    <path d="M18 3l-2 6" />
  </svg>
);

const GamepadIcon = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="4" />
    <path d="M6 12h4" />
    <path d="M8 10v4" />
    <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
    <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
    <circle cx="17" cy="11" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const CoinflipIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="12" r="7" />
    <path d="M14 6a7 7 0 1 1 0 12" />
    <line x1="3" y1="12" x2="17" y2="12" />
    <line x1="7" y1="9" x2="7" y2="15" />
    <line x1="13" y1="9" x2="13" y2="15" />
  </svg>
);

const JackpotIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16" />
    <path d="M5 6v6a7 7 0 0 0 14 0V6" />
    <path d="M12 13v6" />
    <path d="M8 19h8" />
    <path d="M2 6v4a2 2 0 0 0 2 2" />
    <path d="M22 6v4a2 2 0 0 1-2 2" />
  </svg>
);

const DiceIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="16" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="16" r="1.5" fill="currentColor" />
    <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const CardIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M12 8l2 3-2 3-2-3z" />
    <path d="M7 5h1" />
    <path d="M16 19h1" />
  </svg>
);

const UpgraderIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="8" />
    <polyline points="8 12 12 8 16 12" />
    <line x1="6" y1="6" x2="7" y2="7" />
    <line x1="18" y1="6" x2="17" y2="7" />
  </svg>
);

const TradesIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 10a7 7 0 0 1 14 0" />
    <polyline points="15 6 19 10 15 14" />
    <path d="M19 14a7 7 0 0 1-14 0" />
    <polyline points="9 18 5 14 9 10" />
  </svg>
);

const RobloxIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M10 9h4c1 0 2 1 2 2s-1 2-2 2h-4v-4z" />
    <line x1="10" y1="13" x2="10" y2="16" />
    <line x1="14" y1="13" x2="16" y2="16" />
  </svg>
);

const WalletIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M16 6v12" />
    <line x1="3" y1="10" x2="16" y2="10" />
    <circle cx="19" cy="12" r="1" />
  </svg>
);

const ZapIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const DiscordIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0" />
    <path d="M14 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0" />
    <path d="M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833-1.671 3.5-3c.667-1.667.5-5.833-1.5-11.5c-1.457-1.015-3-1.34-4.5-1.5l-1 2.5a16.81 16.81 0 0 0-4 0l-1-2.5c-1.5.16-3.043.485-4.5 1.5c-2 5.667-2.167 9.833-1.5 11.5c.667 1.329 2 3 3.5 3c.5 0 2-2 2-3" />
    <path d="M8.5 17c1.5 1 3.5 1 5 0" />
  </svg>
);

const TwitterIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l11.733 16h4.267l-11.733-16z" />
    <path d="M4 20l6.768-6.768m2.46-2.46l6.772-6.772" />
  </svg>
);

// ─── DATA ─────────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { user: "xXDragonSlayer", game: "Coinflip",  item: "Huge Cat",         amount: "4,200 gems"  },
  { user: "PetGod99",       game: "Jackpot",   item: "Titanic Corgi",    amount: "12,500 gems" },
  { user: "RBX_Hunter",     game: "Upgrader",  item: "Huge Hell Rock",   amount: "8,900 gems"  },
  { user: "GemKing",        game: "Blackjack", item: "Exclusive Agony",  amount: "28,000 gems" },
  { user: "Speedster_77",   game: "Dice Roll", item: "Rainbow Agony",    amount: "42,000 gems" },
  { user: "PS99Pro",        game: "Trades",    item: "Titanic Penguin",  amount: "55,000 gems" },
  { user: "TitanGamer",     game: "Coinflip",  item: "Huge Pixel Cat",   amount: "7,200 gems"  },
  { user: "NoobToPro",      game: "Jackpot",   item: "Huge Hacked Cat",  amount: "19,500 gems" },
];

const GAMES = [
  { name: "Coinflip",   desc: "A 50/50 chance to double your wager.",            href: "/coinflip",  icon: CoinflipIcon,  banner: "/coinflip-banner.png"  },
  { name: "Jackpot",    desc: "Deposit items into the pool to win it all.",       href: "/jackpot",   icon: JackpotIcon,   banner: "/jackpot-banner.png"   },
  { name: "Dice Roll",  desc: "Roll the dice to hit your target multiplier.",     href: "/dice",      icon: DiceIcon,      banner: "/dice-banner.png"      },
  { name: "Blackjack",  desc: "Play against the dealer. Get closer to 21.",       href: "/blackjack", icon: CardIcon,      banner: "/blackjack-banner.png" },
  { name: "Upgrader",   desc: "Risk your current pets to upgrade to a higher tier.", href: "/upgrader", icon: UpgraderIcon, banner: "/upgrader-banner.png"  },
  { name: "Trades",     desc: "P2P betting. Propose a wager and negotiate.",      href: "/trades",    icon: TradesIcon,    banner: "/trades-banner.png"    },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const Home = () => {
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(1247);

  useEffect(() => {
    if (!socket) return;
    const handler = (count) => setOnlineCount(count);
    socket.on("ONLINE_UPDATE", handler);
    return () => socket.off("ONLINE_UPDATE", handler);
  }, [socket]);

  const fmt = (n) => n >= 1_000_000
    ? (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
    : n >= 1_000 ? n.toLocaleString() : String(n);

  return (
    <div style={{ backgroundColor: "#0c0c0c", color: "#fff", fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh" }}>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden w-full flex flex-col justify-center" style={{ minHeight: "72vh", backgroundColor: "#0c0c0c" }}>
        <img src="/login-banner.png" alt="PS99Bet" className="hero-banner-img" />
        <div className="hero-gradient" />
        <div className="hero-content">
          <div className="inline-flex items-center px-3 py-1 mb-5 rounded-full"
            style={{ border: "1px solid rgba(255,255,255,0.1)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", backgroundColor: "transparent" }}>
            Season 2 Active
          </div>
          <h1 style={{ fontWeight: 800, fontSize: "clamp(36px,4.5vw,68px)", letterSpacing: "-0.04em", lineHeight: 0.95, marginBottom: 20 }}>
            <div style={{ color: "#ccc" }}>WIN BIG ON</div>
            <div style={{ color: "#fff" }}>PS99BET</div>
          </h1>
          <p style={{ color: "#888", fontSize: 14, marginBottom: 28 }}>
            Provably fair games for PS99 pets &amp; gems.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/coinflip")}
              style={{ padding: "10px 22px", borderRadius: 6, background: "#fff", color: "#0c0c0c", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#e6e6e6"}
              onMouseOut={(e) => e.currentTarget.style.background = "#fff"}>
              Play Now →
            </button>
            <button
              onClick={() => document.getElementById("home-games")?.scrollIntoView({ behavior: "smooth" })}
              style={{ padding: "10px 22px", borderRadius: 6, background: "transparent", color: "#fff", fontWeight: 500, fontSize: 13, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer" }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
              View Games
            </button>
          </div>
          <div className="hero-stats" style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "#888" }}>
            <span>{fmt(onlineCount)} Online</span>
            <span style={{ color: "#333" }}>·</span>
            <span>4.2M Gems Wagered</span>
            <span style={{ color: "#333" }}>·</span>
            <span>892K Games Played</span>
          </div>
        </div>
      </section>

      {/* ── LIVE BETS TICKER ── */}
      <div style={{ width: "100%", display: "flex", alignItems: "center", overflow: "hidden", height: 56, backgroundColor: "#0c0c0c", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 32px", height: "100%", flexShrink: 0, backgroundColor: "#0c0c0c", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="home-dot-pulse" style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#fff", marginRight: 10 }} />
          <span style={{ fontSize: 13, letterSpacing: "0.1em", color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Live Bets</span>
        </div>
        <div style={{ flex: 1, overflow: "hidden", height: "100%", display: "flex", alignItems: "center" }}>
          <div className="home-ticker-track">
            {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", fontSize: 15, color: "#888", padding: "0 32px", flexShrink: 0, height: "100%", whiteSpace: "nowrap" }}>
                <span style={{ fontWeight: 500 }}>{item.user}</span>
                <span style={{ margin: "0 14px", color: "#333" }}>·</span>
                <span>{item.game}</span>
                <span style={{ margin: "0 14px", color: "#333" }}>·</span>
                <span style={{ color: "#fff", fontWeight: 500 }}>{item.item}</span>
                <span style={{ margin: "0 14px", color: "#333" }}>·</span>
                <span style={{ color: "#fff", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{item.amount}</span>
                <span style={{ marginLeft: 56, color: "rgba(255,255,255,0.05)" }}>|</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── GAMES GRID ── */}
      <div id="home-games" style={{ maxWidth: 1152, margin: "0 auto", padding: "56px 24px 72px" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: 20, fontWeight: 600 }}>Games</div>
        <div className="home-game-grid">
          {GAMES.map((game) => (
            <div key={game.href} className="home-game-cell" onClick={() => navigate(game.href)}>
              <img
                src={game.banner}
                alt={game.name}
                className="home-game-banner"
                style={{ width: "100%", height: 160, objectFit: "cover", objectPosition: "center top", display: "block" }}
              />
              <div style={{ padding: "14px 18px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <game.icon className="home-game-icon" style={{ width: 18, height: 18, color: "#888" }} />
                  <span className="home-game-play" style={{ fontSize: 11, fontWeight: 500 }}>Play →</span>
                </div>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{game.name}</div>
                <div style={{ color: "#888", fontSize: 11, lineHeight: 1.5 }}>{game.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 24px" }}>
          <div className="home-stats-grid">
            {[
              { icon: UsersIcon,   value: fmt(onlineCount), label: "Online Now"    },
              { icon: GamepadIcon, value: "892,441",         label: "Games Played"  },
              { icon: TrophyIcon,  value: "14,892",          label: "Total Winners" },
              { icon: DiamondIcon, value: "4.2M+",           label: "Gems Wagered"  },
            ].map(({ icon: Icon, value, label }, i) => (
              <div key={label} className="home-stat-cell" style={{ borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <Icon style={{ width: 18, height: 18, color: "#555", marginBottom: 12 }} />
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", marginBottom: 3 }}>{value}</div>
                <div style={{ color: "#888", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: 36, fontWeight: 600, textAlign: "center" }}>How It Works</div>
        <div className="home-how-grid">
          {[
            { num: "01", icon: RobloxIcon, title: "Login with Roblox",         body: "Connect your account securely using OAuth. No passwords or personal information required."   },
            { num: "02", icon: WalletIcon, title: "Deposit your pets",          body: "Send your huge pets or gems to our verified secure bots. Balances update instantly."          },
            { num: "03", icon: ZapIcon,    title: "Play & withdraw instantly",  body: "Win provably fair games and withdraw your multiplied inventory whenever you want."             },
          ].map(({ num, icon: Icon, title, body }) => (
            <div key={num} style={{ position: "relative", paddingTop: 20 }}>
              <div style={{ position: "absolute", top: -20, left: -8, fontSize: 80, fontWeight: 700, lineHeight: 1, color: "#1a1a1a", userSelect: "none", zIndex: 0, letterSpacing: "-0.05em" }}>{num}</div>
              <Icon style={{ width: 18, height: 18, color: "#555", marginBottom: 12, position: "relative", zIndex: 1 }} />
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 6, position: "relative", zIndex: 1 }}>{title}</div>
              <div style={{ color: "#888", fontSize: 12, lineHeight: 1.6, position: "relative", zIndex: 1 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 48px" }}>
        <div className="home-footer-inner">
          <a href="https://discord.gg/ps99bet" target="_blank" rel="noreferrer" className="home-footer-link"
            onMouseOver={(e) => e.currentTarget.style.color = "#fff"} onMouseOut={(e) => e.currentTarget.style.color = "#444"}>
            <DiscordIcon style={{ width: 18, height: 18 }} /> Discord
          </a>
          <a href="#" className="home-footer-link"
            onMouseOver={(e) => e.currentTarget.style.color = "#fff"} onMouseOut={(e) => e.currentTarget.style.color = "#444"}>
            <TwitterIcon style={{ width: 18, height: 18 }} /> Twitter
          </a>
          <span style={{ color: "rgba(255,255,255,0.08)" }} className="home-footer-dot">·</span>
          <a href="#" className="home-footer-link"
            onMouseOver={(e) => e.currentTarget.style.color = "#fff"} onMouseOut={(e) => e.currentTarget.style.color = "#444"}>Terms</a>
          <span style={{ color: "rgba(255,255,255,0.08)" }} className="home-footer-dot">·</span>
          <a href="#" className="home-footer-link"
            onMouseOver={(e) => e.currentTarget.style.color = "#fff"} onMouseOut={(e) => e.currentTarget.style.color = "#444"}>Privacy</a>
          <span style={{ color: "rgba(255,255,255,0.08)" }} className="home-footer-dot">·</span>
          <span>© 2025 PS99Bet</span>
        </div>
      </footer>

    </div>
  );
};
