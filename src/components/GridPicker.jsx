import { formatMoney } from '../utils/pool';

function statusLabel(g) {
  if (g.revealed) return 'Numbers out';
  if (g.sold >= 100) return 'Full';
  return `${100 - g.sold} left`;
}

export default function GridPicker({ grids, currentGridId, selectGrid }) {
  const list = Object.values(grids).sort((a, b) => (a.order || 0) - (b.order || 0));
  return (
    <nav aria-label="Grids" className="grid grid-cols-3 gap-2 sm:gap-3">
      {list.map(g => {
        const active = g.id === currentGridId;
        return (
          <button
            key={g.id}
            onClick={() => selectGrid(g.id)}
            aria-pressed={active}
            className={`rounded-2xl px-2 py-3 sm:py-4 border-2 text-center transition-all ${active ? 'bg-navy border-navy text-white shadow-lg' : 'bg-white border-slate-200 text-navy hover:border-navy'}`}
          >
            <span className="block font-black uppercase tracking-wider text-sm sm:text-base leading-tight">{g.name}</span>
            <span className={`block font-black text-xl sm:text-2xl leading-tight ${active ? 'text-gold' : 'text-navy'}`}>{formatMoney(g.price)}</span>
            <span className={`block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mt-0.5 ${active ? 'text-silver' : 'text-slate-500'}`}>{statusLabel(g)}</span>
          </button>
        );
      })}
    </nav>
  );
}
