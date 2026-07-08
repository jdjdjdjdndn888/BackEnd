import React from 'react';
import { 
  Gamepad2, Coins, Dices, ArrowLeftRight, ArrowUpRight, 
  Trophy, Users, CircleDollarSign, ShieldCheck, Gamepad,
  Zap, Crown, Play, ChevronRight, Activity, Wallet, Key
} from 'lucide-react';
import './_group.css';

export default function Homepage() {
  return (
    <div className="homepage-wrapper relative">
      
      {/* Navbar (minimal for lobby context) */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/5 py-4 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-800 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)] border border-white/10">
            <Gamepad2 className="w-6 h-6 text-white" />
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
            <Gamepad className="w-4 h-4" />
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
            <Activity className="w-4 h-4" />
            <span>V2 Update is Live — New Upgrader Game</span>
          </div>
          
          <h1 className="heading-font text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-gradient">
            The #1 PS99 <br />
            <span className="text-gradient-purple">Betting Platform</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
            Multiply your huge pets and gems instantly. Provably fair games, instant withdrawals, and the most active community.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button className="w-full sm:w-auto glow-primary-button px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3">
              <Zap className="w-5 h-5" />
              <span>Play Now — Login with Roblox</span>
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-lg glass-panel hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-slate-400" />
              <span>Join Discord</span>
            </button>
          </div>

          {/* Stat Pills */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 w-full max-w-3xl">
            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center border-t border-t-white/10 border-b-black/50">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium uppercase tracking-wider text-slate-400">Online Now</span>
              </div>
              <span className="heading-font text-2xl font-bold">1,247</span>
            </div>
            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center border-t border-t-white/10 border-b-black/50">
              <div className="flex items-center gap-2 mb-1">
                <CircleDollarSign className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-medium uppercase tracking-wider text-slate-400">Total Wagered</span>
              </div>
              <span className="heading-font text-2xl font-bold">$4.2M</span>
            </div>
            <div className="glass-panel rounded-2xl p-4 flex flex-col items-center justify-center border-t border-t-white/10 border-b-black/50 col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-1">
                <Dices className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium uppercase tracking-wider text-slate-400">Games Played</span>
              </div>
              <span className="heading-font text-2xl font-bold">892K</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Games Feed */}
      <section className="py-8 border-y border-white/5 bg-black/20 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0a0b14] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0a0b14] to-transparent z-10 pointer-events-none" />
        
        <div className="scrolling-wrapper gap-4 px-4">
          {/* Double the list to create a seamless loop effect */}
          {[...mockLiveGames, ...mockLiveGames].map((game, i) => (
            <div key={i} className="glass-card rounded-xl p-4 min-w-[320px] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${game.color}-500/20 border border-${game.color}-500/30 flex items-center justify-center`}>
                  <game.icon className={`w-5 h-5 text-${game.color}-400`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{game.player1}</span>
                    <span className="text-slate-500 text-xs">vs</span>
                    <span className="font-semibold text-sm">{game.player2 || '???'}</span>
                  </div>
                  <div className="text-violet-400 text-sm font-bold flex items-center gap-1">
                    <span>⚡</span> {game.wager}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                {game.status === 'LIVE' ? (
                  <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-bold tracking-wider border border-red-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold tracking-wider border border-blue-500/30">
                    WAITING
                  </span>
                )}
                <span className="text-xs text-slate-500 mt-1">{game.type}</span>
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
              <Gamepad2 className="w-8 h-8 text-violet-500" />
              <span>Available Games</span>
            </h2>
            <p className="text-slate-400">Choose your game, place your bet, and multiply your inventory.</p>
          </div>
          <button className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 group">
            View Leaderboards 
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockGameModes.map((game, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 relative group cursor-pointer overflow-hidden flex flex-col h-full">
              {/* Hover glow effect background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 to-violet-600/0 group-hover:from-violet-600/10 group-hover:to-transparent transition-all duration-500" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-xl ${game.bgClass} flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300`}>
                    <game.icon className={`w-7 h-7 ${game.iconColor}`} />
                  </div>
                  {game.popular && (
                    <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold border border-violet-500/30 flex items-center gap-1">
                      <Zap className="w-3 h-3" fill="currentColor" /> HOT
                    </span>
                  )}
                </div>
                
                <h3 className="heading-font text-2xl font-bold mb-2 group-hover:text-violet-300 transition-colors">{game.title}</h3>
                <p className="text-slate-400 text-sm mb-8 flex-grow">{game.desc}</p>
                
                <button className="w-full py-3 rounded-lg bg-white/5 hover:bg-violet-600/20 border border-white/5 hover:border-violet-500/50 text-white font-semibold transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] mt-auto">
                  Play {game.title} <Play className="w-4 h-4" />
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
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent -translate-y-1/2 z-0" />

            <div className="glass-panel rounded-2xl p-8 text-center relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#12141f] border border-white/10 flex items-center justify-center mb-6 shadow-lg relative">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-sm border-4 border-[#0a0b14]">1</div>
                <Key className="w-7 h-7 text-violet-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Login Securely</h3>
              <p className="text-slate-400 text-sm">Sign in with your Roblox account. We use secure OAuth, no passwords required.</p>
            </div>

            <div className="glass-panel rounded-2xl p-8 text-center relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#12141f] border border-white/10 flex items-center justify-center mb-6 shadow-lg relative">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-sm border-4 border-[#0a0b14]">2</div>
                <Wallet className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Deposit Items</h3>
              <p className="text-slate-400 text-sm">Send your PS99 pets or gems to our secure bots to instantly credit your balance.</p>
            </div>

            <div className="glass-panel rounded-2xl p-8 text-center relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#12141f] border border-white/10 flex items-center justify-center mb-6 shadow-lg relative">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-sm border-4 border-[#0a0b14]">3</div>
                <Trophy className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Play & Win</h3>
              <p className="text-slate-400 text-sm">Join a game or create your own. Win huge pots and withdraw instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="py-8 px-6 lg:px-12 border-t border-white/5 text-center flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-violet-500" />
          <span className="font-bold text-white">PS99BET</span>
          <span>© 2024. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Fairness</a>
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
    icon: Coins,
    popular: true,
    bgClass: "bg-yellow-500/10",
    iconColor: "text-yellow-400"
  },
  {
    title: "Jackpot",
    desc: "Deposit items into the pool. The more you bet, the higher your chance to win it all.",
    icon: CircleDollarSign,
    popular: true,
    bgClass: "bg-emerald-500/10",
    iconColor: "text-emerald-400"
  },
  {
    title: "Dice Roll",
    desc: "Roll the dice to hit your target multiplier. Fast-paced, automated betting action.",
    icon: Dices,
    popular: false,
    bgClass: "bg-blue-500/10",
    iconColor: "text-blue-400"
  },
  {
    title: "Upgrader",
    desc: "Risk your current pets to upgrade to a higher tier. Adjust your win chance.",
    icon: ArrowUpRight,
    popular: true,
    bgClass: "bg-violet-500/10",
    iconColor: "text-violet-400"
  },
  {
    title: "Blackjack",
    desc: "Play against the dealer. Get closer to 21 without busting to win the hand.",
    icon: ShieldCheck,
    popular: false,
    bgClass: "bg-red-500/10",
    iconColor: "text-red-400"
  },
  {
    title: "Trades",
    desc: "P2P betting. Propose a wager to a specific user and negotiate terms.",
    icon: ArrowLeftRight,
    popular: false,
    bgClass: "bg-pink-500/10",
    iconColor: "text-pink-400"
  }
];

const mockLiveGames = [
  { type: "Coinflip", player1: "xX_Slayer_Xx", player2: "RobloxGod99", wager: "5.2M", status: "LIVE", icon: Coins, color: "yellow" },
  { type: "Jackpot", player1: "TitanGamer", player2: null, wager: "12M", status: "WAITING", icon: CircleDollarSign, color: "emerald" },
  { type: "Upgrader", player1: "PetMaster", player2: "Dealer", wager: "Titanic Cat", status: "LIVE", icon: ArrowUpRight, color: "violet" },
  { type: "Coinflip", player1: "NoobToPro", player2: null, wager: "500K", status: "WAITING", icon: Coins, color: "yellow" },
  { type: "Dice", player1: "LuckyGuy", player2: "House", wager: "2.1M", status: "LIVE", icon: Dices, color: "blue" },
];
