import React from 'react';
import './_group.css';

// --- CUSTOM SVG ICONS ---
const CoinflipIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="14" r="6" />
    <path d="M10.8 8.2a6 6 0 1 1 5.4 9.6" />
    <path d="M14 10a2 2 0 1 0 0 4" />
  </svg>
);

const JackpotIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7c0 3.31-2.69 6-6 6s-6-2.69-6-6V2z" />
  </svg>
);

const DiceIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16.05L12 21.5l-9-5.45V8l9-5.45L21 8v8.05z" />
    <path d="M12 21.5V11" />
    <path d="M3 8l9 5.45" />
    <path d="M21 8l-9 5.45" />
    <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="7.5" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="14" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const UpgraderIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 11l5-5 5 5" />
    <path d="M7 17l5-5 5 5" />
  </svg>
);

const BlackjackIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="3" ry="3" />
    <path d="M12 10.5c-1.5-1.5-3-1-3 1.5s3 3.5 3 5c0-1.5 3-2.5 3-5s-1.5-3-3-1.5z" />
    <path d="M12 17v2" />
  </svg>
);

const TradesIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 4l4 4-4 4" />
    <path d="M21 8H7a4 4 0 0 0-4 4v0" />
    <path d="M7 20l-4-4 4-4" />
    <path d="M3 16h14a4 4 0 0 0 4-4v0" />
  </svg>
);

const GemIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8l4-5h10l4 5-9 12L3 8z" />
    <path d="M3 8h18" />
    <path d="M7 3l2 5" />
    <path d="M17 3l-2 5" />
    <path d="M12 3v5" />
    <path d="M12 8l4.5 6M12 8L7.5 14" />
  </svg>
);

const ZapIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const ShieldIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const UsersIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SparkIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
  </svg>
);

const ChevronRightIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const GamepadIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="6" ry="6" />
    <path d="M6 12h4M8 10v4" />
    <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="18" cy="10" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const PlayIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
// --- END CUSTOM SVG ICONS ---

export default function Homepage() {
  return (
    <div className="homepage-wrapper relative">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/5 py-4 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)] border border-white/10">
            <GamepadIcon className="w-6 h-6 text-white" />
          </div>
          <span className="heading-font text-2xl font-bold tracking-tight text-white">
            PS99<span className="text-violet-400">BET</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#" className="hover:text-white transition-colors">Games</a>
          <a href="#" className="hover:text-white transition-colors">Leaderboard</a>
          <a href="#" className="hover:text-white transition-colors">Provably Fair</a>
          <a href="#" className="hover:text-white transition-colors">Support</a>
        </div>
        <div>
          <button className="glow-primary-button px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2">
            <UsersIcon className="w-4 h-4" />
            <span>Login</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 lg:px-12 flex flex-col items-center justify-center min-h-[80vh] text-center overflow-hidden">
        <div className="hero-grid" />
        
        {/* Glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-8 border-violet-500/30 text-violet-300 text-sm font-medium">
            <SparkIcon className="w-4 h-4 text-amber-400" />
            <span>Season 2 is Live — Huge Cat Jackpot Active</span>
          </div>
          
          <h1 className="heading-font text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-gradient">
            The #1 PS99 <br />
            <span className="text-gradient-purple">Betting Platform</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
            Multiply your huge pets and gems instantly. Provably fair games, instant withdrawals, and the most active community.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button 
              className="w-full sm:w-auto glow-primary-button px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3"
              style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)' }}
            >
              <ZapIcon className="w-5 h-5" />
              <span>Play Now — Login with Roblox</span>
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-lg glass-panel hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
              <UsersIcon className="w-5 h-5 text-slate-400" />
              <span>Join Discord</span>
            </button>
          </div>

          {/* Stat Pills */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-4 w-full max-w-5xl">
            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center border-t border-t-white/10 border-b-black/50">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Online</span>
              </div>
              <span className="heading-font text-2xl font-bold">1,247</span>
            </div>
            
            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center border-t border-t-white/10 border-b-black/50">
              <div className="flex items-center gap-2 mb-1">
                <GamepadIcon className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Games Played</span>
              </div>
              <span className="heading-font text-2xl font-bold">892,441</span>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center border-t border-t-white/10 border-b-black/50">
              <div className="flex items-center gap-2 mb-1">
                <UsersIcon className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Winners</span>
              </div>
              <span className="heading-font text-2xl font-bold">14,892</span>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center border-t border-t-white/10 border-b-black/50">
              <div className="flex items-center gap-2 mb-1">
                <GemIcon className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Gems Wagered</span>
              </div>
              <span className="heading-font text-2xl font-bold text-amber-400">4,200,000+</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Games Feed */}
      <section className="py-8 border-y border-white/5 bg-black/20 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0b14] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0b14] to-transparent z-10 pointer-events-none" />
        
        <div className="scrolling-wrapper gap-4 px-4">
          {[...mockLiveGames, ...mockLiveGames].map((game, i) => (
            <div 
              key={i} 
              className="glass-card rounded-xl p-4 min-w-[340px] flex items-center justify-between shrink-0 relative overflow-hidden"
              style={{ borderLeft: `3px solid ${game.hexColor}` }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full bg-[#0a0b14] border flex items-center justify-center" 
                  style={{ borderColor: `${game.hexColor}40`, boxShadow: `0 0 10px ${game.hexColor}20` }}
                >
                  <game.icon className="w-5 h-5" style={{ color: game.hexColor }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{game.player1}</span>
                    <span className="text-slate-500 text-xs">vs</span>
                    <span className="font-semibold text-sm text-white">{game.player2 || '???'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-slate-300 text-xs font-medium">{game.wagerItem}</span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="text-xs font-bold" style={{ color: game.hexColor }}>{game.wagerValue}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {game.status === 'LIVE' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-red-400 text-[10px] font-bold tracking-wider">LIVE</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3 w-3 text-blue-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-blue-400 text-[10px] font-bold tracking-wider">FINDING</span>
                  </div>
                )}
                <span className="text-xs text-slate-500 font-medium">{game.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Games Grid Section */}
      <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="heading-font text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
              <GamepadIcon className="w-8 h-8 text-violet-500" />
              <span>Available Games</span>
            </h2>
            <p className="text-slate-400">Choose your game, place your bet, and multiply your inventory.</p>
          </div>
          <button className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 group">
            View Leaderboards 
            <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockGameModes.map((game, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 relative group cursor-pointer overflow-hidden flex flex-col h-full">
              {/* Hover glow effect background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 to-violet-600/0 group-hover:from-violet-600/10 group-hover:to-transparent transition-all duration-500" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div 
                    className="w-16 h-16 rounded-full bg-[#0a0b14] flex items-center justify-center border group-hover:scale-110 transition-transform duration-300"
                    style={{ borderColor: `${game.hexColor}40`, boxShadow: `0 0 20px ${game.hexColor}30` }}
                  >
                    <game.icon className="w-8 h-8" style={{ color: game.hexColor }} />
                  </div>
                  {game.popular && (
                    <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold border border-violet-500/30 flex items-center gap-1">
                      <SparkIcon className="w-3 h-3" /> HOT
                    </span>
                  )}
                </div>
                
                <h3 className="heading-font text-2xl font-bold mb-2 group-hover:text-violet-300 transition-colors">{game.title}</h3>
                <p className="text-slate-400 text-sm mb-8 flex-grow">{game.desc}</p>
                
                <button className="w-full py-3 rounded-lg bg-white/5 hover:bg-violet-600/20 border border-white/5 hover:border-violet-500/50 text-white font-semibold transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] mt-auto">
                  Play {game.title} <PlayIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 lg:px-12 bg-black/40 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/10 via-[#0a0b14]/0 to-[#0a0b14]/0 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="heading-font text-3xl md:text-4xl font-bold mb-4">Start Playing in Seconds</h2>
            <p className="text-slate-400 max-w-xl mx-auto">No complicated setups. Just link your account, deposit your items, and start winning big.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent -translate-y-1/2 z-0" />

            <div className="glass-panel rounded-2xl p-8 text-center relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#12141f] border border-white/10 flex items-center justify-center mb-6 shadow-lg relative">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-sm border-4 border-[#0a0b14]">1</div>
                <UsersIcon className="w-7 h-7 text-violet-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Login Securely</h3>
              <p className="text-slate-400 text-sm">Sign in with your Roblox account. We use secure OAuth, no passwords required.</p>
            </div>

            <div className="glass-panel rounded-2xl p-8 text-center relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#12141f] border border-white/10 flex items-center justify-center mb-6 shadow-lg relative">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-sm border-4 border-[#0a0b14]">2</div>
                <GemIcon className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Deposit Items</h3>
              <p className="text-slate-400 text-sm">Send your PS99 pets or gems to our secure bots to instantly credit your balance.</p>
            </div>

            <div className="glass-panel rounded-2xl p-8 text-center relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#12141f] border border-white/10 flex items-center justify-center mb-6 shadow-lg relative">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-sm border-4 border-[#0a0b14]">3</div>
                <JackpotIcon className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Play & Win</h3>
              <p className="text-slate-400 text-sm">Join a game or create your own. Win huge pots and withdraw instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 lg:px-12 border-t border-white/5 text-center flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <GamepadIcon className="w-5 h-5 text-violet-500" />
          <span className="font-bold text-white">PS99BET</span>
          <span>© 2024. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
            <ShieldIcon className="w-4 h-4" />
            Fairness
          </a>
        </div>
      </footer>
    </div>
  );
}

// Mock Data

const mockGameModes = [
  {
    title: "Coinflip",
    desc: "A 50/50 chance to double your wager. Create a game or join an existing one.",
    icon: CoinflipIcon,
    popular: true,
    hexColor: "#A855F7" // purple
  },
  {
    title: "Jackpot",
    desc: "Deposit items into the pool. The more you bet, the higher your chance to win it all.",
    icon: JackpotIcon,
    popular: true,
    hexColor: "#F59E0B" // amber
  },
  {
    title: "Dice Roll",
    desc: "Roll the dice to hit your target multiplier. Fast-paced, automated betting action.",
    icon: DiceIcon,
    popular: false,
    hexColor: "#3B82F6" // blue
  },
  {
    title: "Upgrader",
    desc: "Risk your current pets to upgrade to a higher tier. Adjust your win chance.",
    icon: UpgraderIcon,
    popular: true,
    hexColor: "#10B981" // green
  },
  {
    title: "Blackjack",
    desc: "Play against the dealer. Get closer to 21 without busting to win the hand.",
    icon: BlackjackIcon,
    popular: false,
    hexColor: "#EF4444" // red
  },
  {
    title: "Trades",
    desc: "P2P betting. Propose a wager to a specific user and negotiate terms.",
    icon: TradesIcon,
    popular: false,
    hexColor: "#06B6D4" // cyan
  }
];

const mockLiveGames = [
  { type: "Coinflip", player1: "xXDragonSlayer", player2: "PetGod99", wagerItem: "Huge Cat", wagerValue: "4,200 gems", status: "LIVE", time: "2m 34s", icon: CoinflipIcon, hexColor: "#A855F7" },
  { type: "Jackpot", player1: "RBX_Hunter", player2: null, wagerItem: "Titanic Penguin", wagerValue: "55,000 gems", status: "WAITING", time: "Finding...", icon: JackpotIcon, hexColor: "#F59E0B" },
  { type: "Upgrader", player1: "Speedster_77", player2: "House", wagerItem: "Huge Pixel Cat", wagerValue: "7,200 gems", status: "LIVE", time: "45s", icon: UpgraderIcon, hexColor: "#10B981" },
  { type: "Blackjack", player1: "GemKing", player2: "House", wagerItem: "Exclusive Agony", wagerValue: "28,000 gems", status: "LIVE", time: "1m 12s", icon: BlackjackIcon, hexColor: "#EF4444" },
  { type: "Dice", player1: "PS99Pro", player2: "House", wagerItem: "Rainbow Agony", wagerValue: "42,000 gems", status: "LIVE", time: "Just started", icon: DiceIcon, hexColor: "#3B82F6" },
  { type: "Trades", player1: "TitanGamer", player2: "NoobToPro", wagerItem: "Huge Hacked Cat", wagerValue: "19,500 gems", status: "WAITING", time: "Finding...", icon: TradesIcon, hexColor: "#06B6D4" },
];