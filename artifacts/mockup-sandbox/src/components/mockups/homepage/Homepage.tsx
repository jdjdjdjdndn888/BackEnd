import React from 'react';
import './_group.css';

// --- CUSTOM GEOMETRIC SVG ICONS ---
const CoinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" stroke="currentColor" fill="none" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6" />
    <line x1="8" y1="2" x2="8" y2="14" />
  </svg>
);

const DiceIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" stroke="currentColor" fill="none" strokeWidth="1.5">
    <rect x="3" y="3" width="10" height="10" rx="2" />
    <circle cx="8" cy="8" r="1.5" />
  </svg>
);

const JackpotIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="square">
    <path d="M4 4v4a4 4 0 0 0 8 0V4" />
    <line x1="8" y1="12" x2="8" y2="16" />
    <line x1="5" y1="16" x2="11" y2="16" />
  </svg>
);

const CardIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" stroke="currentColor" fill="none" strokeWidth="1.5">
    <rect x="3" y="2" width="10" height="12" rx="1" />
    <line x1="6" y1="5" x2="8" y2="7" />
  </svg>
);

const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" stroke="currentColor" fill="none" strokeWidth="1.5">
    <line x1="8" y1="14" x2="8" y2="2" />
    <polyline points="4 6 8 2 12 6" />
  </svg>
);

const SwapIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" stroke="currentColor" fill="none" strokeWidth="1.5">
    <line x1="3" y1="6" x2="13" y2="6" />
    <polyline points="10 3 13 6 10 9" />
    <line x1="13" y1="10" x2="3" y2="10" />
    <polyline points="6 7 3 10 6 13" />
  </svg>
);

// --- END SVGs ---

export default function Homepage() {
  return (
    <div style={{ backgroundColor: '#0c0c0c', color: '#ffffff', fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh' }}>
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12" style={{ height: '56px', borderBottom: '1px solid rgba(255,255,255,0.07)', backgroundColor: 'rgba(12,12,12,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="text-white font-[800] text-lg tracking-tight">
          PS99BET
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

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '80vh', paddingTop: '56px' }}>
        <div className="inline-flex items-center px-3 py-1 mb-6 rounded-full text-[11px] uppercase tracking-[0.1em] text-[#888]" style={{ border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent' }}>
          Season 2 Active
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6" style={{ letterSpacing: '-0.03em' }}>
          <div className="text-white">The #1 PS99</div>
          <div className="text-[#ccc]">Betting Platform</div>
        </h1>
        
        <p className="text-[#888] text-base md:text-lg max-w-lg mb-10">
          Provably fair games. Instant withdrawals. 1,247 players online.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button className="h-11 px-6 rounded-md bg-white text-[#0c0c0c] font-semibold text-[14px] hover:bg-[#e6e6e6] transition-colors flex items-center justify-center">
            Play Now
          </button>
          <button className="h-11 px-6 rounded-md bg-transparent text-white font-medium text-[14px] hover:bg-[rgba(255,255,255,0.05)] transition-colors flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
            View Games
          </button>
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
              <div key={game.name} className="p-8 flex flex-col items-start cursor-pointer group">
                <game.icon className="w-5 h-5 text-[#888] mb-5" />
                <h3 className="text-white font-semibold text-base mb-2">{game.name}</h3>
                <p className="text-[#888] text-[13px] leading-relaxed mb-10">{game.desc}</p>
                <div className="mt-auto w-full text-right text-[#888] text-[13px] font-medium group-hover:text-white transition-colors">
                  Play &rarr;
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
            <div className="flex flex-col py-4 px-2" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-white text-[28px] font-[700] tabular-nums mb-1">1,247</div>
              <div className="text-[#888] text-[11px] tracking-[0.1em] uppercase font-medium">Online Now</div>
            </div>
            <div className="flex flex-col py-4 px-2 pl-6" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-white text-[28px] font-[700] tabular-nums mb-1">892,441</div>
              <div className="text-[#888] text-[11px] tracking-[0.1em] uppercase font-medium">Games Played</div>
            </div>
            <div className="flex flex-col py-4 px-2 pl-6" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-white text-[28px] font-[700] tabular-nums mb-1">14,892</div>
              <div className="text-[#888] text-[11px] tracking-[0.1em] uppercase font-medium">Total Winners</div>
            </div>
            <div className="flex flex-col py-4 px-2 pl-6">
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
            <h4 className="text-white text-base font-semibold mb-2">Login with Roblox</h4>
            <p className="text-[#888] text-[13px] leading-relaxed">Connect your account securely using OAuth. No passwords or personal information required.</p>
          </div>
          <div className="relative pt-6">
            <div className="absolute top-0 left-0 text-[100px] font-bold leading-none text-[#1a1a1a] select-none -z-10 tracking-tighter" style={{ marginTop: '-24px', marginLeft: '-8px' }}>
              02
            </div>
            <h4 className="text-white text-base font-semibold mb-2">Deposit your pets</h4>
            <p className="text-[#888] text-[13px] leading-relaxed">Send your huge pets or gems to our verified secure bots. Balances update instantly.</p>
          </div>
          <div className="relative pt-6">
            <div className="absolute top-0 left-0 text-[100px] font-bold leading-none text-[#1a1a1a] select-none -z-10 tracking-tighter" style={{ marginTop: '-24px', marginLeft: '-8px' }}>
              03
            </div>
            <h4 className="text-white text-base font-semibold mb-2">Play & withdraw instantly</h4>
            <p className="text-[#888] text-[13px] leading-relaxed">Win provably fair games and withdraw your multiplied inventory whenever you want.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[#444] text-[13px] py-8 w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        © 2025 PS99Bet <span className="mx-2 text-[rgba(255,255,255,0.1)]">·</span> 
        <a href="#" className="hover:text-[#888] transition-colors">Terms</a> <span className="mx-2 text-[rgba(255,255,255,0.1)]">·</span> 
        <a href="#" className="hover:text-[#888] transition-colors">Privacy</a> <span className="mx-2 text-[rgba(255,255,255,0.1)]">·</span> 
        <a href="#" className="hover:text-[#888] transition-colors">Discord</a>
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
  { name: "Coinflip", desc: "A 50/50 chance to double your wager. Create a game or join an existing one.", icon: CoinIcon },
  { name: "Jackpot", desc: "Deposit items into the pool. The more you bet, the higher your chance to win it all.", icon: JackpotIcon },
  { name: "Dice Roll", desc: "Roll the dice to hit your target multiplier. Fast-paced, automated betting action.", icon: DiceIcon },
  { name: "Blackjack", desc: "Play against the dealer. Get closer to 21 without busting to win the hand.", icon: CardIcon },
  { name: "Upgrader", desc: "Risk your current pets to upgrade to a higher tier. Adjust your win chance.", icon: ArrowUpIcon },
  { name: "Trades", desc: "P2P betting. Propose a wager to a specific user and negotiate terms.", icon: SwapIcon }
];