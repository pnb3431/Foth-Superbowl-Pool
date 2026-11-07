import { Trophy, CheckCircle, X } from 'lucide-react';
import { PERIODS, PERIOD_LABELS, periodHasScore, squareNumbers, formatMoney } from '../utils/pool';
import { textOn } from '../utils/teams';

const initials = (name) => (name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();

function PeriodTabs({ period, setPeriod, scores }) {
  return (
    <div role="tablist" aria-label="Which numbers to show" className="grid grid-cols-4 gap-1.5 mb-4">
      {PERIODS.map(p => {
        const active = p === period;
        const score = scores[p];
        return (
          <button
            key={p}
            role="tab"
            aria-selected={active}
            onClick={() => setPeriod(p)}
            className={`rounded-xl py-2 border-2 text-center ${active ? 'bg-navy border-navy text-white' : 'bg-white border-slate-200 text-navy'}`}
          >
            <span className="block font-black text-sm uppercase">{PERIOD_LABELS[p]}</span>
            <span className={`block text-[10px] font-bold ${active ? 'text-silver' : 'text-slate-500'}`}>
              {periodHasScore(score) ? `${score.top}–${score.side}` : 'numbers'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SquareDetails({ squareId, square, grid, topTeam, sideTeam, results, onClose }) {
  const numbers = squareNumbers(grid, squareId);
  const wins = PERIODS.filter(p => results.periods[p].status === 'won' && results.periods[p].winnerSquareId === squareId);
  return (
    <div className="mt-4 rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 relative">
      <button onClick={onClose} aria-label="Close" className="absolute top-2 right-2 p-2 text-slate-400 hover:text-navy"><X size={16} /></button>
      <p className="font-black text-navy pr-8">
        Square #{squareId + 1} · {square?.name || <span className="text-slate-500">Unsold</span>}
      </p>
      {numbers ? (
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          {PERIODS.map(p => (
            <div key={p} className="bg-white rounded-xl border border-slate-200 py-1.5">
              <span className="block text-[10px] font-black uppercase text-slate-500">{PERIOD_LABELS[p]}</span>
              <span className="block font-black text-navy">{numbers[p].top}–{numbers[p].side}</span>
            </div>
          ))}
        </div>
      ) : null}
      {numbers && <p className="mt-1 text-[10px] font-bold text-slate-400">Numbers read {topTeam.name}–{sideTeam.name}.</p>}
      {!numbers && (
        <p className="text-sm font-bold text-slate-500 mt-1">Numbers come out when the grid is full.</p>
      )}
      {wins.length > 0 && (
        <p className="mt-2 text-sm font-black text-navy flex items-center gap-1">
          <Trophy size={14} className="text-gold" /> Won {wins.map(p => PERIOD_LABELS[p]).join(', ')}: {formatMoney(wins.reduce((sum, p) => sum + results.periods[p].amount, 0))}
        </p>
      )}
    </div>
  );
}

export default function SquareGrid({
  grid, squares, revealed, signupsOpen, isAdmin, isLocked, period, setPeriod, scores, results,
  topTeam, sideTeam, onSquareClick, inspectedSquare, closeDetails, highlightedSquares
}) {
  const numbers = revealed ? grid.numbers[period] : null;
  const periodWinner = revealed ? results.periods[period] : null;
  // Squares that won (or were drawn for) the period being shown
  const shownSquare = periodWinner && periodWinner.status !== 'pending' ? periodWinner.squareId : null;
  const shownWinner = periodWinner?.status === 'won' ? periodWinner.winnerSquareId : null;
  const otherWinners = new Set(PERIODS.filter(p => p !== period && results.periods[p].status === 'won').map(p => results.periods[p].winnerSquareId));

  return (
    <section className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-3 sm:p-6">
      {revealed && <PeriodTabs period={period} setPeriod={setPeriod} scores={scores} />}

      <div
        className="grid gap-[3px] sm:gap-1.5"
        style={{ gridTemplateColumns: 'minmax(1.1rem, 1.6rem) repeat(11, minmax(0, 1fr))' }}
      >
        {/* Top team label */}
        <div className="col-start-3 col-span-10 rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-center font-black uppercase tracking-[0.3em] text-xs sm:text-base truncate"
          style={{ backgroundColor: topTeam.primary, color: textOn(topTeam.primary) }}>
          {topTeam.name}
        </div>

        {/* Top numbers */}
        <div className="col-start-2 row-start-2 flex items-center justify-center text-[9px] sm:text-[11px] font-black uppercase text-slate-400">
          {revealed ? PERIOD_LABELS[period] : ''}
        </div>
        {Array.from({ length: 10 }).map((_, col) => (
          <div key={`top-${col}`} className={`row-start-2 aspect-square flex items-center justify-center rounded-md sm:rounded-lg font-black text-sm sm:text-2xl ${numbers ? 'bg-slate-100 text-navy' : 'bg-slate-50 text-slate-300'}`}
            style={{ gridColumnStart: col + 3 }}>
            {numbers ? numbers.top[col] : '?'}
          </div>
        ))}

        {/* Side team label */}
        <div className="col-start-1 row-start-3 row-span-10 rounded-lg sm:rounded-xl flex items-center justify-center font-black uppercase tracking-[0.3em] text-xs sm:text-base overflow-hidden"
          style={{ backgroundColor: sideTeam.primary, color: textOn(sideTeam.primary), writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          {sideTeam.name}
        </div>

        {Array.from({ length: 10 }).map((_, row) => (
          <div key={`row-${row}`} className="contents">
            <div className={`col-start-2 aspect-square flex items-center justify-center rounded-md sm:rounded-lg font-black text-sm sm:text-2xl ${numbers ? 'bg-slate-100 text-navy' : 'bg-slate-50 text-slate-300'}`}
              style={{ gridRowStart: row + 3 }}>
              {numbers ? numbers.side[row] : '?'}
            </div>
            {Array.from({ length: 10 }).map((_, col) => {
              const idx = row * 10 + col;
              const data = squares[idx];
              const claimed = Boolean(data);
              const isWinner = idx === shownWinner;
              const isDrawn = idx === shownSquare && !isWinner;
              const isHighlighted = highlightedSquares.has(idx);
              const open = !claimed && (signupsOpen || (isAdmin && !isLocked));
              return (
                <button
                  key={idx}
                  onClick={() => onSquareClick(idx)}
                  aria-label={claimed ? `Square ${idx + 1}: ${data.name}` : `Square ${idx + 1}: ${open ? 'open, tap to claim' : 'unsold'}`}
                  style={{ gridRowStart: row + 3, gridColumnStart: col + 3 }}
                  className={`
                    relative aspect-square min-w-0 rounded-md sm:rounded-lg border flex items-center justify-center p-0.5 transition-transform
                    ${isWinner ? 'bg-gold border-navy text-navy ring-2 sm:ring-4 ring-gold z-10 scale-110 shadow-lg' : ''}
                    ${isDrawn ? 'bg-slate-200 border-navy border-dashed text-slate-500' : ''}
                    ${!isWinner && !isDrawn && claimed && data.paid ? 'bg-navy border-navy text-white' : ''}
                    ${!isWinner && !isDrawn && claimed && !data.paid ? 'bg-white border-slate-300 text-navy' : ''}
                    ${!isWinner && !isDrawn && !claimed && open ? 'bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:bg-gold/20 hover:border-navy cursor-pointer' : ''}
                    ${!isWinner && !isDrawn && !claimed && !open ? 'bg-slate-50 border-dashed border-slate-200 text-slate-300' : ''}
                    ${isHighlighted && !isWinner ? 'ring-2 sm:ring-4 ring-blue-500 z-10' : ''}
                    ${inspectedSquare === idx ? 'outline-2 outline-offset-1 outline-navy' : ''}
                  `}
                >
                  {claimed ? (
                    <>
                      <span className="sm:hidden text-[9px] font-black leading-none">{initials(data.name)}</span>
                      <span className="hidden sm:block text-[10px] font-bold uppercase leading-tight text-center break-words line-clamp-2 w-full">{data.name}</span>
                    </>
                  ) : (
                    open && <span className="text-[8px] sm:text-[10px] font-bold">{idx + 1}</span>
                  )}
                  {isWinner && <span className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 border border-navy"><Trophy size={10} /></span>}
                  {!isWinner && otherWinners.has(idx) && <span className="absolute -top-1 -right-1 bg-gold rounded-full p-0.5"><Trophy size={8} className="text-navy" /></span>}
                  {!isWinner && !otherWinners.has(idx) && claimed && data.paid && isAdmin && <span className="absolute -top-1 -right-1 bg-gold text-navy rounded-full"><CheckCircle size={9} /></span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {inspectedSquare !== null && (
        <SquareDetails
          squareId={inspectedSquare}
          square={squares[inspectedSquare]}
          grid={grid}
          topTeam={topTeam}
          sideTeam={sideTeam}
          results={results}
          onClose={closeDetails}
        />
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        {signupsOpen && <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border border-dashed border-slate-300 bg-slate-50" /> Open</span>}
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border border-slate-300 bg-white" /> Taken</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-navy" /> Paid</span>
        {revealed && <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-gold border border-navy" /> {PERIOD_LABELS[period]} winner</span>}
        {revealed && <span className="flex items-center gap-1.5"><Trophy size={12} className="text-gold" /> Other winners</span>}
      </div>
      <p className="mt-2 text-center text-[11px] font-bold text-slate-400 sm:hidden">Names show as initials — tap a square to see who has it.</p>
    </section>
  );
}
