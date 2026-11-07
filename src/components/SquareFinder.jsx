import { Search, Trophy } from 'lucide-react';
import { PERIODS, PERIOD_LABELS, squareNumbers, isRevealed, formatMoney } from '../utils/pool';

export default function SquareFinder({ query, setQuery, matches, grids, currentGridId, selectGrid, topTeam, sideTeam }) {
  return (
    <section className="bg-white rounded-3xl shadow-lg border-2 border-slate-100 p-4 sm:p-5">
      <label htmlFor="finder" className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Find my squares</label>
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="finder"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your name"
          autoComplete="name"
          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-3 font-bold focus:border-navy focus:bg-white outline-none"
        />
      </div>

      {query.trim().length >= 2 && matches.length === 0 && (
        <p className="mt-3 text-sm font-bold text-slate-500">No squares under that name yet.</p>
      )}

      {matches.map(person => (
        <div key={person.key} className="mt-4">
          <p className="font-black text-navy flex items-center gap-2 flex-wrap">
            {person.displayName}
            <span className="text-xs font-bold text-slate-500">{person.squares.length} square{person.squares.length === 1 ? '' : 's'}</span>
            {person.winnings > 0 && <span className="text-xs font-black bg-gold text-navy rounded-full px-2 py-0.5 flex items-center gap-1"><Trophy size={11} /> {formatMoney(person.winnings)}</span>}
          </p>
          <ul className="mt-2 space-y-1.5">
            {person.squares.map(({ gridId, squareId }) => {
              const numbers = squareNumbers(grids[gridId], squareId);
              return (
                <li key={`${gridId}-${squareId}`}>
                  <button
                    onClick={() => selectGrid(gridId)}
                    className={`w-full text-left rounded-xl border-2 px-3 py-2 ${gridId === currentGridId ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}
                  >
                    <span className="text-xs font-black uppercase text-navy">{grids[gridId].name} · #{squareId + 1}</span>
                    {numbers ? (
                      <span className="mt-1 grid grid-cols-4 gap-1 text-center">
                        {PERIODS.map(p => (
                          <span key={p} className="bg-white rounded-lg border border-slate-200 py-0.5">
                            <span className="block text-[9px] font-black uppercase text-slate-500">{PERIOD_LABELS[p]}</span>
                            <span className="block text-xs font-black text-navy">{numbers[p].top}–{numbers[p].side}</span>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="block text-[11px] font-bold text-slate-500">Numbers not drawn yet</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {person.squares.some(s => isRevealed(grids[s.gridId])) && (
            <p className="mt-1 text-[10px] font-bold text-slate-400">Numbers read {topTeam.name}–{sideTeam.name}.</p>
          )}
        </div>
      ))}
    </section>
  );
}
