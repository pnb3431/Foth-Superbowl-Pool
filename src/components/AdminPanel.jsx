import { Settings, Eye, EyeOff, Shuffle, RefreshCw, Download, Copy, CalendarPlus } from 'lucide-react';
import CommitInput from './CommitInput';
import { PERIODS, PERIOD_NAMES, formatMoney } from '../utils/pool';
import { teamsInConference } from '../utils/teams';

const fieldLabel = 'block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1';
const field = 'w-full min-w-0 bg-white border-2 border-slate-200 rounded-xl px-3 py-2 font-bold text-sm focus:border-navy outline-none';
const card = 'rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 space-y-3';
const cardTitle = 'text-xs font-black uppercase tracking-widest text-navy';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 font-black text-[11px] uppercase tracking-widest transition-colors';

function TeamSelect({ conf, value, onChange }) {
  return (
    <div className="min-w-0">
      <label htmlFor={`team-${conf}`} className={fieldLabel}>{conf} team ({conf === 'AFC' ? 'across the top' : 'down the side'})</label>
      <select id={`team-${conf}`} value={value || ''} onChange={(e) => onChange(e.target.value)} className={field}>
        <option value="">{conf} (TBD)</option>
        {teamsInConference(conf).map(([abbr, t]) => <option key={abbr} value={abbr}>{t.city} {t.name}</option>)}
      </select>
    </div>
  );
}

export default function AdminPanel({
  year, game, updateGame, pullTeamsFromEspn,
  grid, updateGridConfig, sold, paidCount, revealed, revealNumbers, hideNumbers, reshuffleNumbers,
  scores, updateScore, syncLiveScores, topTeam, sideTeam, results, togglePaidOut,
  paymentLinks, updatePaymentLink, copyEmails, startNextYear
}) {
  return (
    <section className="bg-white rounded-3xl shadow-xl border-2 border-gold p-4 sm:p-5 space-y-4">
      <h2 className="flex items-center gap-2 font-black uppercase tracking-widest text-navy"><Settings size={18} /> Commissioner</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {/* The game */}
        <div className={card}>
          <h3 className={cardTitle}>The game ({year})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TeamSelect conf="AFC" value={game.top} onChange={(v) => updateGame({ top: v })} />
            <TeamSelect conf="NFC" value={game.side} onChange={(v) => updateGame({ side: v })} />
          </div>
          <div>
            <label htmlFor="gameDate" className={fieldLabel}>Game date</label>
            <CommitInput id="gameDate" type="date" value={game.date} onCommit={(v) => updateGame({ date: v, kickoff: '' })} className={field} />
          </div>
          <button onClick={pullTeamsFromEspn} className={`${button} w-full bg-navy text-white hover:bg-navy-light`}>
            <Download size={14} /> Get teams &amp; kickoff from ESPN
          </button>
          <p className="text-[11px] font-bold text-slate-500">Teams also fill in by themselves once ESPN lists them (after the conference championships).</p>
        </div>

        {/* This grid */}
        <div className={card}>
          <h3 className={cardTitle}>{grid.name}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label htmlFor="gridName" className={fieldLabel}>Name</label>
              <CommitInput id="gridName" type="text" value={grid.name} onCommit={(v) => updateGridConfig('name', v)} className={field} />
            </div>
            <div className="min-w-0">
              <label htmlFor="gridPrice" className={fieldLabel}>$ per square</label>
              <CommitInput id="gridPrice" type="number" min="0" step="1" value={grid.price} onCommit={(v) => updateGridConfig('price', v)} className={field} />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-600">
            {sold} sold · {paidCount} paid · {formatMoney(paidCount * grid.price)} collected of {formatMoney(sold * grid.price)}
          </p>
          <div className="flex flex-wrap gap-2">
            {revealed ? (
              <button onClick={hideNumbers} className={`${button} bg-white border-2 border-slate-200 text-navy`}><EyeOff size={14} /> Hide numbers</button>
            ) : (
              <button onClick={revealNumbers} className={`${button} ${sold >= 100 ? 'bg-gold text-navy' : 'bg-white border-2 border-gold text-navy'}`}>
                <Eye size={14} /> Reveal numbers{sold < 100 ? ` (${100 - sold} unsold)` : ''}
              </button>
            )}
            {grid.numbers && (
              <button onClick={reshuffleNumbers} className={`${button} bg-white border-2 border-slate-200 text-navy`}><Shuffle size={14} /> Redraw numbers</button>
            )}
          </div>
        </div>

        {/* Scores */}
        <div className={card}>
          <div className="flex items-center justify-between gap-2">
            <h3 className={cardTitle}>Scores (all grids)</h3>
            <button onClick={syncLiveScores} className={`${button} bg-navy text-white hover:bg-navy-light`}><RefreshCw size={14} /> Sync ESPN</button>
          </div>
          <div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-2 items-center">
            <span />
            <span className="text-[10px] font-black uppercase text-center text-slate-500 truncate">{topTeam.name}</span>
            <span className="text-[10px] font-black uppercase text-center text-slate-500 truncate">{sideTeam.name}</span>
            {PERIODS.map(p => (
              <div key={p} className="contents">
                <span className="text-xs font-black uppercase text-navy">{PERIOD_NAMES[p]}</span>
                <CommitInput aria-label={`${PERIOD_NAMES[p]} ${topTeam.name} score`} type="number" min="0" inputMode="numeric" value={scores[p].top} onCommit={(v) => updateScore(p, 'top', v)} className={`${field} text-center`} />
                <CommitInput aria-label={`${PERIOD_NAMES[p]} ${sideTeam.name} score`} type="number" min="0" inputMode="numeric" value={scores[p].side} onCommit={(v) => updateScore(p, 'side', v)} className={`${field} text-center`} />
              </div>
            ))}
          </div>
          <p className="text-[11px] font-bold text-slate-500">Cumulative score at the end of each quarter. Final includes overtime. Scores also sync by themselves every 5 minutes during the game.</p>
        </div>

        {/* Payouts for this grid */}
        <div className={card}>
          <h3 className={cardTitle}>{grid.name} winners</h3>
          <ul className="space-y-2">
            {PERIODS.map(p => {
              const r = results.periods[p];
              const paidOut = Boolean(grid.paidOut?.[p]);
              return (
                <li key={p} className="flex items-center justify-between gap-2 bg-white rounded-xl border-2 border-slate-100 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black uppercase text-slate-500">{PERIOD_NAMES[p]} · {formatMoney(r.amount)}</span>
                    <span className="block font-black text-sm text-navy truncate">
                      {r.status === 'won' ? r.name : r.status === 'rolled' ? 'Unsold — rolled over' : '—'}
                    </span>
                  </span>
                  {r.status === 'won' && (
                    <button onClick={() => togglePaidOut(p)} className={`${button} shrink-0 ${paidOut ? 'bg-green-600 text-white' : 'bg-amber-50 border-2 border-amber-200 text-amber-700'}`}>
                      {paidOut ? 'Paid' : 'Unpaid'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Payment links */}
        <div className={card}>
          <h3 className={cardTitle}>Payment links</h3>
          {[{ key: 'venmo', label: 'Venmo', placeholder: '@username' }, { key: 'paypal', label: 'PayPal', placeholder: 'paypal.me name' }, { key: 'zelle', label: 'Zelle', placeholder: 'phone or email' }].map(f => (
            <div key={f.key}>
              <label htmlFor={`pay-${f.key}`} className={fieldLabel}>{f.label}</label>
              <CommitInput id={`pay-${f.key}`} type="text" value={paymentLinks[f.key]} onCommit={(v) => updatePaymentLink(f.key, v)} placeholder={f.placeholder} className={field} />
            </div>
          ))}
        </div>

        {/* Everyone */}
        <div className={card}>
          <h3 className={cardTitle}>Everyone</h3>
          <button onClick={copyEmails} className={`${button} w-full bg-white border-2 border-slate-200 text-navy`}><Copy size={14} /> Copy all emails (every grid)</button>
          <button onClick={startNextYear} className={`${button} w-full bg-white border-2 border-slate-200 text-slate-500`}><CalendarPlus size={14} /> Start next year&apos;s pool</button>
          <p className="text-[11px] font-bold text-slate-500">Tap a taken square on the grid to mark it paid, fix the name or email, or remove it.</p>
        </div>
      </div>
    </section>
  );
}
