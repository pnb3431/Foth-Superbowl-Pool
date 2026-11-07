import { formatMoney } from '../utils/pool';

export default function PayCard({ paymentLinks, price }) {
  const { venmo, paypal, zelle } = paymentLinks;
  if (!venmo && !paypal && !zelle) return null;
  return (
    <section className="bg-white p-5 rounded-3xl shadow-lg border-l-8 border-navy flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-black text-navy uppercase italic">Ready to pay?</h3>
        <p className="text-sm text-slate-500 font-bold">{formatMoney(price)} per square on this grid.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {venmo && <a href={`https://venmo.com/${encodeURIComponent(venmo.replace('@', ''))}`} target="_blank" rel="noreferrer" className="bg-[#008CFF] text-white px-5 py-3 rounded-xl font-black text-xs uppercase shadow-md">Venmo</a>}
        {paypal && <a href={`https://paypal.me/${encodeURIComponent(paypal.replace('@', ''))}`} target="_blank" rel="noreferrer" className="bg-[#003087] text-white px-5 py-3 rounded-xl font-black text-xs uppercase shadow-md">PayPal</a>}
        {zelle && <div className="bg-[#7411E3] text-white px-5 py-3 rounded-xl font-black text-xs uppercase shadow-md">Zelle: {zelle}</div>}
      </div>
    </section>
  );
}
