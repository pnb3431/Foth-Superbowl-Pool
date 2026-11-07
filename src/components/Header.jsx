import { Lock, LogOut } from 'lucide-react';
import { textOn } from '../utils/teams';

const ROMAN = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const toRoman = (n) => ROMAN.reduce((out, [value, numeral]) => {
  while (n >= value) { out += numeral; n -= value; }
  return out;
}, '');

// Super Bowl I was played in January 1967.
const superBowlNumber = (year) => toRoman(Number(year) - 1966);

function kickoffLabel(game) {
  if (game.kickoff) {
    const d = new Date(game.kickoff);
    if (!isNaN(d)) {
      return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(game.date || '')) {
    const [y, m, d] = game.date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  return 'Date TBD';
}

function TeamChip({ team }) {
  return (
    <span
      className="inline-flex items-center justify-center min-w-0 px-3 py-1.5 rounded-xl font-black uppercase tracking-wider text-sm sm:text-lg border-2 truncate"
      style={{ backgroundColor: team.primary, color: textOn(team.primary), borderColor: team.secondary }}
    >
      {team.name}
    </span>
  );
}

export default function Header({ year, game, topTeam, sideTeam, isAdmin, onExitAdmin, setShowAdminLogin }) {
  return (
    <header className="bg-navy text-white shadow-xl border-b-4 border-silver">
      <div className="max-w-5xl mx-auto px-4 py-5 sm:py-7">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-silver text-[11px] font-black uppercase tracking-[0.3em]">Foth Super Bowl Pool</p>
            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tight leading-none mt-1">
              Super Bowl {superBowlNumber(year)}
            </h1>
          </div>
          {isAdmin ? (
            <button onClick={onExitAdmin} className="shrink-0 flex items-center gap-1.5 bg-gold text-navy px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest">
              <LogOut size={14} /> Admin
            </button>
          ) : (
            <button onClick={() => setShowAdminLogin(true)} aria-label="Commissioner login" className="shrink-0 p-2.5 rounded-xl text-silver/60 hover:text-white hover:bg-white/10">
              <Lock size={16} />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <TeamChip team={topTeam} />
            <span className="text-silver font-black italic text-sm">vs</span>
            <TeamChip team={sideTeam} />
          </div>
          <span className="text-silver font-bold text-sm">{kickoffLabel(game)}</span>
        </div>
      </div>
    </header>
  );
}
