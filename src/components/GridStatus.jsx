import { Trophy } from 'lucide-react';
import { PERIODS, PERIOD_LABELS, periodHasScore, formatMoney } from '../utils/pool';

function PeriodResult({ period, result, score, topTeam, sideTeam }) {
  const scored = periodHasScore(score);
  return (
    <div className={`rounded-2xl p-3 border-2 min-w-0 ${result.status === 'won' ? 'bg-gold/15 border-gold' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{PERIOD_LABELS[period]}</span>
        <span className="font-black text-navy">{formatMoney(result.amount)}</span>
      </div>
      <p className="text-xs font-bold text-slate-500 mt-1 truncate">
        {scored ? `${topTeam.abbr || topTeam.name} ${score.top} – ${sideTeam.abbr || sideTeam.name} ${score.side}` : 'Waiting on score'}
      </p>
      <p className="mt-1 font-black text-sm text-navy flex items-center gap-1 min-w-0">
        {result.status === 'won' && <><Trophy size={14} className="text-gold shrink-0" /> <span className="truncate">{result.name}</span></>}
        {result.status === 'rolled' && <span className="text-slate-500 text-xs leading-snug">#{result.squareId + 1} unsold — rolls over</span>}
        {result.status === 'pending' && <span className="text-slate-400">—</span>}
      </p>
      {result.status === 'won' && result.winnerSquareId !== result.squareId && (
        <p className="text-[10px] font-bold text-slate-500">Square #{result.squareId + 1} was unsold, so it went to the next sold square (#{result.winnerSquareId + 1}).</p>
      )}
      {result.rolledIn > 0 && <p className="text-[10px] font-bold text-slate-500">Includes {formatMoney(result.rolledIn)} rolled over</p>}
    </div>
  );
}

export default function GridStatus({ grid, sold, results, scores, topTeam, sideTeam, revealed }) {
  if (!revealed) {
    const fullPot = grid.price * 100;
    return (
      <section className="bg-white rounded-3xl shadow-lg border-2 border-slate-100 p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{grid.name} sign-up</p>
            <p className="text-2xl font-black text-navy leading-tight">{sold} of 100 taken</p>
          </div>
          <p className="text-right text-xs font-bold text-slate-500">Full pot<br /><span className="text-xl font-black text-navy">{formatMoney(fullPot)}</span></p>
        </div>
        <div className="mt-3 h-3 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={sold} aria-valuemin={0} aria-valuemax={100} aria-label="Squares taken">
          <div className="h-full bg-navy rounded-full transition-all duration-700" style={{ width: `${sold}%` }} />
        </div>
        <p className="mt-3 text-sm font-bold text-slate-600">
          Tap an open square to claim it. Numbers come out when the grid is full — a different set for Q1, Q2, Q3 and the Final.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-3xl shadow-lg border-2 border-slate-100 p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-black uppercase tracking-widest text-navy text-sm">{grid.name} payouts</h2>
        <span className="text-xs font-bold text-slate-500">Pot {formatMoney(results.pot)}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {PERIODS.map(p => (
          <PeriodResult key={p} period={p} result={results.periods[p]} score={scores[p]} topTeam={topTeam} sideTeam={sideTeam} />
        ))}
      </div>
    </section>
  );
}
