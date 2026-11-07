import { Trophy, CheckCircle, X } from 'lucide-react';
import { PERIODS, PERIOD_LABELS, periodHasScore, squareNumbers, formatMoney } from '../utils/pool';
import { textOn } from '../utils/teams';

const initials = (name) => (name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();

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

// Grid layout: column 1 is the side team's name, columns 2-5 hold the side
// numbers (Q1, Q2, Q3, F), columns 6-15 are the squares. Rows mirror that:
// row 1 is the top team's name, rows 2-5 the top numbers, rows 6-15 the squares.
const NUMBER_TRACKS = PERIODS.length;
const FIRST_SQUARE = NUMBER_TRACKS + 2;

// The digit a period's score lands on, so the matching number can be lit up.
const scoreDigit = (score, side) => (periodHasScore(score) ? Math.abs(parseInt(score[side], 10)) % 10 : null);

function NumberCell({ value, lit, style, className = '' }) {
  return (
    <div
      style={style}
      className={`${className} flex items-center justify-center rounded sm:rounded-md font-black leading-none text-[10px] sm:text-base
        ${value === null ? 'bg-slate-50 text-slate-300' : lit ? 'bg-gold text-navy' : 'bg-slate-100 text-navy'}`}
    >
      {value === null ? '?' : value}
    </div>
  );
}

export default function SquareGrid({
  grid, squares, revealed, signupsOpen, isAdmin, isLocked, scores, results,
  topTeam, sideTeam, onSquareClick, inspectedSquare, closeDetails, highlightedSquares
}) {
  // Periods each square has won, and squares drawn for a period while unsold.
  const wonBy = {};
  const drawnUnsold = new Set();
  PERIODS.forEach(p => {
    const r = results.periods[p];
    if (r.status === 'won') (wonBy[r.winnerSquareId] ||= []).push(PERIOD_LABELS[p]);
    if (r.status !== 'pending' && r.squareId !== r.winnerSquareId) drawnUnsold.add(r.squareId);
  });

  return (
    <section className="bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-2.5 sm:p-6">
      <div
        className="grid gap-[2px] sm:gap-1"
        style={{
          gridTemplateColumns: `minmax(0.9rem, 1.5rem) repeat(${NUMBER_TRACKS}, minmax(0, 0.62fr)) repeat(10, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${NUMBER_TRACKS + 1}, auto)`
        }}
      >
        {/* Top team label */}
        <div
          className="rounded-md sm:rounded-xl py-1 sm:py-2 text-center font-black uppercase tracking-[0.3em] text-[10px] sm:text-base truncate"
          style={{ gridRow: 1, gridColumn: `${FIRST_SQUARE} / span 10`, backgroundColor: topTeam.primary, color: textOn(topTeam.primary) }}
        >
          {topTeam.name}
        </div>

        {/* Period labels: down the corner for the top rows, across it for the side columns ("F" is shared) */}
        {PERIODS.map((p, i) => (
          <div key={`row-label-${p}`} className="flex items-center justify-center text-[8px] sm:text-[11px] font-black uppercase text-slate-500"
            style={{ gridRow: i + 2, gridColumn: NUMBER_TRACKS + 1 }}>
            {p === 'final' ? 'F' : PERIOD_LABELS[p]}
          </div>
        ))}
        {PERIODS.slice(0, -1).map((p, i) => (
          <div key={`col-label-${p}`} className="flex items-center justify-center text-[8px] sm:text-[11px] font-black uppercase text-slate-500"
            style={{ gridRow: NUMBER_TRACKS + 1, gridColumn: i + 2 }}>
            {PERIOD_LABELS[p]}
          </div>
        ))}

        {/* Top numbers: one row per period */}
        {PERIODS.map((p, i) => {
          const lit = scoreDigit(scores[p], 'top');
          return Array.from({ length: 10 }).map((_, col) => {
            const value = revealed ? grid.numbers[p].top[col] : null;
            return <NumberCell key={`top-${p}-${col}`} value={value} lit={value !== null && value === lit} className="h-[1.15rem] sm:h-8" style={{ gridRow: i + 2, gridColumn: FIRST_SQUARE + col }} />;
          });
        })}

        {/* Side team label */}
        <div
          className="rounded-md sm:rounded-xl flex items-center justify-center font-black uppercase tracking-[0.3em] text-[10px] sm:text-base overflow-hidden"
          style={{ gridRow: `${FIRST_SQUARE} / span 10`, gridColumn: 1, backgroundColor: sideTeam.primary, color: textOn(sideTeam.primary), writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {sideTeam.name}
        </div>

        {Array.from({ length: 10 }).map((_, row) => (
          <div key={`row-${row}`} className="contents">
            {/* Side numbers: one column per period */}
            {PERIODS.map((p, i) => {
              const value = revealed ? grid.numbers[p].side[row] : null;
              const lit = scoreDigit(scores[p], 'side');
              return <NumberCell key={`side-${p}-${row}`} value={value} lit={value !== null && value === lit} style={{ gridRow: FIRST_SQUARE + row, gridColumn: i + 2 }} />;
            })}

            {Array.from({ length: 10 }).map((_, col) => {
              const idx = row * 10 + col;
              const data = squares[idx];
              const claimed = Boolean(data);
              const wins = wonBy[idx];
              const isDrawn = drawnUnsold.has(idx);
              const isHighlighted = highlightedSquares.has(idx);
              const open = !claimed && (signupsOpen || (isAdmin && !isLocked));
              return (
                <button
                  key={idx}
                  onClick={() => onSquareClick(idx)}
                  aria-label={`Square ${idx + 1}: ${claimed ? data.name : open ? 'open, tap to claim' : 'unsold'}${wins ? `, won ${wins.join(', ')}` : ''}`}
                  style={{ gridRow: FIRST_SQUARE + row, gridColumn: FIRST_SQUARE + col }}
                  className={`
                    relative aspect-square min-w-0 rounded sm:rounded-lg border flex items-center justify-center p-0.5
                    ${wins ? 'bg-gold border-navy text-navy ring-2 ring-gold z-10 shadow-lg' : ''}
                    ${!wins && isDrawn ? 'bg-slate-200 border-navy border-dashed text-slate-500' : ''}
                    ${!wins && !isDrawn && claimed && data.paid ? 'bg-navy border-navy text-white' : ''}
                    ${!wins && !isDrawn && claimed && !data.paid ? 'bg-white border-slate-300 text-navy' : ''}
                    ${!wins && !isDrawn && !claimed && open ? 'bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:bg-gold/20 hover:border-navy cursor-pointer' : ''}
                    ${!wins && !isDrawn && !claimed && !open ? 'bg-slate-50 border-dashed border-slate-200 text-slate-300' : ''}
                    ${isHighlighted && !wins ? 'ring-2 sm:ring-4 ring-blue-500 z-10' : ''}
                    ${inspectedSquare === idx ? 'outline-2 outline-offset-1 outline-navy' : ''}
                  `}
                >
                  {claimed ? (
                    <>
                      <span className="sm:hidden text-[8px] font-black leading-none">{initials(data.name)}</span>
                      <span className="hidden sm:block text-[10px] font-bold uppercase leading-tight text-center break-words line-clamp-2 w-full">{data.name}</span>
                    </>
                  ) : (
                    open && <span className="text-[7px] sm:text-[10px] font-bold">{idx + 1}</span>
                  )}
                  {wins && (
                    <span className="absolute -top-1.5 -right-1 bg-navy text-gold rounded-full px-1 text-[7px] sm:text-[9px] font-black leading-[1.4] whitespace-nowrap">
                      {wins.join('·')}
                    </span>
                  )}
                  {!wins && claimed && data.paid && isAdmin && <span className="absolute -top-1 -right-1 bg-gold text-navy rounded-full"><CheckCircle size={9} /></span>}
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

      <p className="mt-4 text-center text-xs font-bold text-slate-600">
        Each period has its own numbers: {topTeam.name} across the top, {sideTeam.name} down the side. Read the row and column marked Q1 for the 1st quarter, and so on.
        {revealed ? ' Gold numbers match the score.' : ' All four sets are drawn when the grid is full.'}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        {signupsOpen && <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border border-dashed border-slate-300 bg-slate-50" /> Open</span>}
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border border-slate-300 bg-white" /> Taken</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-navy" /> Paid</span>
        {revealed && <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-gold border border-navy" /> Winner</span>}
      </div>
      <p className="mt-2 text-center text-[11px] font-bold text-slate-400 sm:hidden">Names show as initials — tap a square to see who has it.</p>
    </section>
  );
}
