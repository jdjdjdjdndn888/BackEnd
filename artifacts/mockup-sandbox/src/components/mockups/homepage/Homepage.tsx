import React from 'react';
import './_group.css';

// --- CUSTOM GEOMETRIC SVG ICONS ---

// UI Icons
const MenuIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="17" y2="12" />
    <line x1="3" y1="18" x2="19" y2="18" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="6" y1="18" x2="18" y2="6" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// Stats Icons
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" />
    <path d="M9 14c-4.418 0-8 3-8 6v1h16v-1c0-3-3.582-6-8-6z" />
    <circle cx="17" cy="8" r="3" opacity="0.6" />
    <path d="M21 21v-1c0-2.4-2.1-4.6-5-5.6" opacity="0.6" />
  </svg>
);

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7c0 3.31-2.69 6-6 6s-6-2.69-6-6V2z" />
  </svg>
);

const DiamondIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
    <path d="M2 9h20" />
    <path d="M12 21l-4-12" />
    <path d="M12 21l4-12" />
    <path d="M6 3l2 6" />
    <path d="M18 3l-2 6" />
  </svg>
);

const GamepadIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="4" />
    <path d="M6 12h4" />
    <path d="M8 10v4" />
    <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
    <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
    <circle cx="17" cy="11" r="1" fill="currentColor" stroke="none" />
  </svg>
);

// Game Type Icons
const CoinflipIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="12" r="7" />
    <path d="M14 6a7 7 0 1 1 0 12" />
    <line x1="3" y1="12" x2="17" y2="12" />
    <line x1="7" y1="9" x2="7" y2="15" />
    <line x1="13" y1="9" x2="13" y2="15" />
  </svg>
);

const JackpotIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16" />
    <path d="M5 6v6a7 7 0 0 0 14 0V6" />
    <path d="M12 13v6" />
    <path d="M8 19h8" />
    <path d="M2 6v4a2 2 0 0 0 2 2" />
    <path d="M22 6v4a2 2 0 0 1-2 2" />
  </svg>
);

const DiceIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="16" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="16" r="1.5" fill="currentColor" />
    <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const CardIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M12 8l2 3-2 3-2-3z" />
    <path d="M7 5h1" />
    <path d="M16 19h1" />
  </svg>
);

const UpgraderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="8" />
    <polyline points="8 12 12 8 16 12" />
    <line x1="6" y1="6" x2="7" y2="7" />
    <line x1="18" y1="6" x2="17" y2="7" />
  </svg>
);

const TradesIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 10a7 7 0 0 1 14 0" />
    <polyline points="15 6 19 10 15 14" />
    <path d="M19 14a7 7 0 0 1-14 0" />
    <polyline points="9 18 5 14 9 10" />
  </svg>
);

// Feature Icons
const RobloxIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M10 9h4c1 0 2 1 2 2s-1 2-2 2h-4v-4z" />
    <line x1="10" y1="13" x2="10" y2="16" />
    <line x1="14" y1="13" x2="16" y2="16" />
  </svg>
);

const WalletIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M16 6v12" />
    <line x1="3" y1="10" x2="16" y2="10" />
    <circle cx="19" cy="12" r="1" />
  </svg>
);

const ZapIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

// Social Icons
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0" />
    <path d="M14 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0" />
    <path d="M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833-1.671 3.5-3c.667-1.667 .5-5.833-1.5-11.5c-1.457-1.015-3-1.34-4.5-1.5l-1 2.5a16.81 16.81 0 0 0-4 0l-1-2.5c-1.5 .16-3.043 .485-4.5 1.5c-2 5.667-2.167 9.833-1.5 11.5c.667 1.329 2 3 3.5 3c.5 0 2-2 2-3" />
    <path d="M8.5 17c1.5 1 3.5 1 5 0" />
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l11.733 16h4.267l-11.733-16z" />
    <path d="M4 20l6.768-6.768m2.46-2.46l6.772-6.772" />
  </svg>
);

// --- END SVGs ---

export default function Homepage() {
  return (
    <div style={{ backgroundColor: '#0c0c0c', color: '#ffffff', fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh' }}>
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12" style={{ height: '56px', borderBottom: '1px solid rgba(255,255,255,0.07)', backgroundColor: 'rgba(12,12,12,0.95)', backdropFilter: 'blur(12px)' }}>
        <div>
          <img src="/__mockup/images/logo-ps99bet.png" alt="PS99Bet" style={{ height: '44px', width: 'auto' }} />
        </div>
        <div className="hidden md:flex items-center gap-8 text-[13px] text-[#888]">
          <a href="#" className="hover:text-white transition-colors">Games</a>
          <a href="#" className="hover:text-white transition-colors">Leaderboard</a>
          <a href="#" className="hover:text-white transition-colors">Provably Fair</a>
        </div>
        <div>
          <button className="h-8 px-4 text-[13px] font-medium text-white bg-transparent rounded-md transition-colors hover:bg-white hover:text-black" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero Banner */}
      <section className="relative overflow-hidden w-full flex flex-col justify-center" style={{ minHeight: '90vh', backgroundColor: '#0c0c0c', paddingTop: '56px' }}>
        {/* Background elements */}
        <img src="/__mockup/images/login-banner.png" alt="Hero Character" className="hero-banner-img" />
        <div className="hero-gradient" />
        
        {/* Content */}
        <div className="hero-content">
          <div className="inline-flex items-center px-3 py-1 mb-6 rounded-full text-[10px] uppercase tracking-widest text-[#888]" style={{ border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent' }}>
            Season 2 Active
          </div>
          
          <h1 className="font-[800] leading-[0.95] mb-6" style={{ fontSize: 'clamp(52px, 6vw, 88px)', letterSpacing: '-0.04em' }}>
            <div className="text-[#ccc]">WIN BIG ON</div>
            <div className="text-white">PS99BET</div>
          </h1>
          
          <p className="text-[#888] text-[16px] mb-10">
            Provably fair games for PS99 pets & gems.
          </p>

          <div className="flex items-center gap-4 mb-8">
            <button className="px-[28px] py-[12px] rounded-md bg-white text-[#0c0c0c] font-[700] text-[15px] hover:bg-[#e6e6e6] transition-colors flex items-center justify-center">
              Play Now &rarr;
            </button>
            <button className="px-[28px] py-[12px] rounded-md bg-transparent text-white font-medium text-[15px] hover:bg-[rgba(255,255,255,0.05)] transition-colors flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
              View Games
            </button>
          </div>

          <div className="hero-stats flex items-center gap-3 text-[12px] text-[#888]">
            <span>1,247 Online</span>
            <span>·</span>
            <span>4.2M Gems Wagered</span>
            <span>·</span>
            <span>892K Games Played</span>
          </div>
        </div>
      </section>

      {/* Live Bets Ticker */}
      <div className="w-full flex items-center overflow-hidden" style={{ height: '40px', backgroundColor: '#0c0c0c', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center px-6 h-full shrink-0 z-10" style={{ backgroundColor: '#0c0c0c', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-dot-pulse mr-3" />
          <span className="text-[11px] tracking-[0.1em] text-[#888] font-semibold uppercase">LIVE BETS</span>
        </div>
        <div className="flex-1 overflow-hidden h-full flex items-center relative">
          <div className="animate-ticker h-full items-center whitespace-nowrap">
            {tickerItems.concat(tickerItems).map((item, i) => (
              <div key={i} className="flex items-center text-[13px] text-[#888] px-6 shrink-0 h-full">
                <span>{item.user}</span>
                <span className="mx-3 text-[#444]">·</span>
                <span>{item.game}</span>
                <span className="mx-3 text-[#444]">·</span>
                <span className="text-white">{item.item}</span>
                <span className="mx-3 text-[#444]">·</span>
                <span className="text-white tabular-nums">{item.amount}</span>
                <span className="ml-12 text-[rgba(255,255,255,0.06)]">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-24">
        {/* Games Grid */}
        <div className="mb-32">
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#888] mb-6 font-semibold">GAMES</div>
          <div className="game-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {gamesData.map(game => (
              <div key={game.name} className="flex flex-col cursor-pointer group pb-6">
                <img src={game.banner} alt={game.name} className="w-full h-[160px] object-cover object-top mb-5 opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="px-6 flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <game.icon className="w-[20px] h-[20px] text-[#888]" />
                    <span className="text-[#888] text-[12px] font-medium group-hover:text-white transition-colors">Play &rarr;</span>
                  </div>
                  <h3 className="text-white font-[600] text-[15px] mb-1">{game.name}</h3>
                  <p className="text-[#888] text-[12px] leading-relaxed">{game.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="w-full" style={{ padding: '40px 0', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="stats-grid grid-cols-2 md:grid-cols-4" style={{ backgroundColor: 'transparent', borderTop: 'none', borderBottom: 'none' }}>
            <div className="flex flex-col py-6 px-4" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <UsersIcon className="w-6 h-6 text-[#555] mb-4" />
              <div className="text-white text-[28px] font-[700] tabular-nums mb-1">1,247</div>
              <div className="text-[#888] text-[11px] tracking-[0.1em] uppercase font-medium">Online Now</div>
            </div>
            <div className="flex flex-col py-6 px-4 md:pl-8" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <GamepadIcon className="w-6 h-6 text-[#555] mb-4" />
              <div className="text-white text-[28px] font-[700] tabular-nums mb-1">892,441</div>
              <div className="text-[#888] text-[11px] tracking-[0.1em] uppercase font-medium">Games Played</div>
            </div>
            <div className="flex flex-col py-6 px-4 lg:pl-8" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <TrophyIcon className="w-6 h-6 text-[#555] mb-4" />
              <div className="text-white text-[28px] font-[700] tabular-nums mb-1">14,892</div>
              <div className="text-[#888] text-[11px] tracking-[0.1em] uppercase font-medium">Total Winners</div>
            </div>
            <div className="flex flex-col py-6 px-4 md:pl-8 lg:pl-8">
              <DiamondIcon className="w-6 h-6 text-[#555] mb-4" />
              <div className="text-white text-[28px] font-[700] tabular-nums mb-1">4.2M+</div>
              <div className="text-[#888] text-[11px] tracking-[0.1em] uppercase font-medium">Gems Wagered</div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-32">
        <div className="text-[11px] uppercase tracking-[0.1em] text-[#888] mb-12 font-semibold text-center">HOW IT WORKS</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="relative pt-6">
            <div className="absolute top-0 left-0 text-[100px] font-bold leading-none text-[#1a1a1a] select-none -z-10 tracking-tighter" style={{ marginTop: '-24px', marginLeft: '-8px' }}>
              01
            </div>
            <RobloxIcon className="w-5 h-5 text-[#555] mb-4" />
            <h4 className="text-white text-base font-semibold mb-2">Login with Roblox</h4>
            <p className="text-[#888] text-[13px] leading-relaxed">Connect your account securely using OAuth. No passwords or personal information required.</p>
          </div>
          <div className="relative pt-6">
            <div className="absolute top-0 left-0 text-[100px] font-bold leading-none text-[#1a1a1a] select-none -z-10 tracking-tighter" style={{ marginTop: '-24px', marginLeft: '-8px' }}>
              02
            </div>
            <WalletIcon className="w-5 h-5 text-[#555] mb-4" />
            <h4 className="text-white text-base font-semibold mb-2">Deposit your pets</h4>
            <p className="text-[#888] text-[13px] leading-relaxed">Send your huge pets or gems to our verified secure bots. Balances update instantly.</p>
          </div>
          <div className="relative pt-6">
            <div className="absolute top-0 left-0 text-[100px] font-bold leading-none text-[#1a1a1a] select-none -z-10 tracking-tighter" style={{ marginTop: '-24px', marginLeft: '-8px' }}>
              03
            </div>
            <ZapIcon className="w-5 h-5 text-[#555] mb-4" />
            <h4 className="text-white text-base font-semibold mb-2">Play & withdraw instantly</h4>
            <p className="text-[#888] text-[13px] leading-relaxed">Win provably fair games and withdraw your multiplied inventory whenever you want.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-[#444] text-[13px]" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 48px' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6 text-center">
          <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
            <DiscordIcon className="w-5 h-5" />
            Discord
          </a>
          <a href="#" className="flex items-center gap-2 hover:text-white transition-colors">
            <TwitterIcon className="w-5 h-5" />
            Twitter
          </a>
          <span className="hidden md:inline text-[rgba(255,255,255,0.1)]">·</span>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <span className="hidden md:inline text-[rgba(255,255,255,0.1)]">·</span>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <span className="hidden md:inline text-[rgba(255,255,255,0.1)]">·</span>
          <span>© 2025 PS99Bet</span>
        </div>
      </footer>

    </div>
  );
}

// --- MOCK DATA ---

const tickerItems = [
  { user: "xXDragonSlayer", game: "Coinflip", item: "Huge Cat", amount: "4,200 gems" },
  { user: "PetGod99", game: "Jackpot", item: "Titanic Corgi", amount: "12,500 gems" },
  { user: "RBX_Hunter", game: "Upgrader", item: "Huge Hell Rock", amount: "8,900 gems" },
  { user: "GemKing", game: "Blackjack", item: "Exclusive Agony", amount: "28,000 gems" },
  { user: "Speedster_77", game: "Dice Roll", item: "Rainbow Agony", amount: "42,000 gems" },
  { user: "PS99Pro", game: "Trades", item: "Titanic Penguin", amount: "55,000 gems" },
  { user: "TitanGamer", game: "Coinflip", item: "Huge Pixel Cat", amount: "7,200 gems" },
  { user: "NoobToPro", game: "Jackpot", item: "Huge Hacked Cat", amount: "19,500 gems" }
];

const gamesData = [
  { name: "Coinflip", desc: "A 50/50 chance to double your wager.", icon: CoinflipIcon, banner: "/__mockup/images/coinflip-banner.png" },
  { name: "Jackpot", desc: "Deposit items into the pool to win it all.", icon: JackpotIcon, banner: "/__mockup/images/jackpot-banner.png" },
  { name: "Dice Roll", desc: "Roll the dice to hit your target multiplier.", icon: DiceIcon, banner: "/__mockup/images/dice-banner.png" },
  { name: "Blackjack", desc: "Play against the dealer. Get closer to 21.", icon: CardIcon, banner: "/__mockup/images/blackjack-banner.png" },
  { name: "Upgrader", desc: "Risk your current pets to upgrade to a higher tier.", icon: UpgraderIcon, banner: "/__mockup/images/upgrader-banner.png" },
  { name: "Trades", desc: "P2P betting. Propose a wager and negotiate.", icon: TradesIcon, banner: "/__mockup/images/trades-banner.png" }
];