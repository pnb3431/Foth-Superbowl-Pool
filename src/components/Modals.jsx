import { useState } from 'react';
import { UserPlus, Lock, X } from 'lucide-react';
import { formatMoney } from '../utils/pool';

const input = 'w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-navy focus:bg-white outline-none font-bold';
const label = 'block text-[11px] font-bold uppercase text-slate-500 mb-2 tracking-widest';

function Shell({ title, subtitle, Icon, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-navy/90 backdrop-blur flex items-end sm:items-center justify-center sm:p-4 z-[100]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-navy text-white px-6 py-6 relative text-center rounded-t-3xl">
          <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-2 text-silver hover:text-white"><X size={18} /></button>
          <h3 className="text-2xl font-black italic tracking-tight flex items-center justify-center gap-2">
            <Icon size={24} className="text-gold" /> {title}
          </h3>
          {subtitle && <p className="text-silver text-xs mt-2 uppercase font-black tracking-widest">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

// Keeps the form state local so typing doesn't re-render the whole app.
function ClaimModal({ selectedSquare, setSelectedSquare, grid, handleClaimSquare, savedClaimer }) {
  const [saved] = useState(savedClaimer);
  // Starts blank so the square never looks taken; one tap fills in last time's details.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const canReuse = saved.name && saved.email && !(name === saved.name && email === saved.email);

  const submit = (e) => {
    e.preventDefault();
    handleClaimSquare(name, email);
  };

  return (
    <Shell title={`Claim square #${selectedSquare + 1}`} subtitle={`${grid.name} · ${formatMoney(grid.price)}`} Icon={UserPlus} onClose={() => setSelectedSquare(null)}>
      <form onSubmit={submit} className="p-6 space-y-5">
        {canReuse && (
          <button type="button" onClick={() => { setName(saved.name); setEmail(saved.email); }}
            className="w-full text-left rounded-2xl border-2 border-dashed border-slate-200 px-4 py-3 hover:border-navy">
            <span className="block text-[11px] font-black uppercase tracking-widest text-slate-500">Use my info</span>
            <span className="block font-bold text-navy truncate">{saved.name} · {saved.email}</span>
          </button>
        )}
        <div>
          <label htmlFor="claimName" className={label}>Full name</label>
          <input id="claimName" name="claimName" autoComplete="name" autoFocus required maxLength={100} type="text" value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="e.g. Vince Lombardi" />
        </div>
        <div>
          <label htmlFor="claimEmail" className={label}>Email</label>
          <input id="claimEmail" name="claimEmail" autoComplete="email" required maxLength={200} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="name@foth.com" />
          <p className="text-[11px] font-bold text-slate-400 mt-1.5">Only the commissioner sees your email.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setSelectedSquare(null)} className="flex-1 py-4 font-bold text-slate-500 uppercase text-xs tracking-widest">Go back</button>
          <button type="submit" className="flex-1 py-4 rounded-2xl font-black bg-navy text-gold hover:bg-navy-light shadow-xl uppercase text-xs tracking-[0.2em]">
            Claim it
          </button>
        </div>
      </form>
    </Shell>
  );
}

function AdminLoginModal({ setShowAdminLogin, handleAdminLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!(await handleAdminLogin(email, password))) setPassword('');
  };
  return (
    <Shell title="Commissioner" Icon={Lock} onClose={() => setShowAdminLogin(false)}>
      <form onSubmit={submit} className="p-6 space-y-5">
        <div>
          <label htmlFor="adminEmail" className={label}>Email</label>
          <input id="adminEmail" autoComplete="username" autoFocus required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="adminPassword" className={label}>Password</label>
          <input id="adminPassword" autoComplete="current-password" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </div>
        <p className="text-[11px] font-bold text-slate-400">Same login as the Packer pool.</p>
        <button type="submit" className="w-full py-4 rounded-2xl font-black bg-navy text-gold uppercase text-xs tracking-[0.2em]">Log in</button>
      </form>
    </Shell>
  );
}

// key={adminSquare} resets this form whenever a different square is opened.
function SquareAdminModal({ adminSquare, setAdminSquare, squares, contacts, updatePayment, clearSquare, updateSquareInfo }) {
  const square = squares[adminSquare] || {};
  const [name, setName] = useState(square.name || '');
  const [email, setEmail] = useState(contacts[adminSquare]?.email || '');
  const [emailEdited, setEmailEdited] = useState(false);
  // Contacts can load after the modal opens; show them until the commissioner edits the field.
  const shownEmail = emailEdited ? email : (contacts[adminSquare]?.email || '');

  return (
    <Shell title={`Square #${adminSquare + 1}`} subtitle={square.paid ? `Paid via ${square.paymentMethod || 'unknown'}` : 'Unpaid'} Icon={UserPlus} onClose={() => setAdminSquare(null)}>
      <div className="p-6 space-y-5">
        <div>
          <p className={label}>Mark paid</p>
          <div className="grid grid-cols-2 gap-2">
            {['Venmo', 'PayPal', 'Zelle', 'Cash'].map(method => (
              <button key={method} onClick={() => updatePayment(method)}
                className={`py-3 rounded-2xl font-black text-xs uppercase tracking-widest ${square.paymentMethod === method ? 'bg-green-600 text-white' : 'bg-slate-50 text-slate-600 border-2 border-slate-100'}`}>
                {method}
              </button>
            ))}
          </div>
          {square.paid && (
            <button onClick={() => updatePayment('unpaid')} className="w-full mt-2 py-3 rounded-2xl font-black bg-amber-50 text-amber-700 border-2 border-amber-100 uppercase text-xs tracking-widest">Mark unpaid</button>
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); updateSquareInfo(name, shownEmail); }} className="space-y-3">
          <div>
            <label htmlFor="editName" className={label}>Name</label>
            <input id="editName" required type="text" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="editEmail" className={label}>Email</label>
            <input id="editEmail" type="email" value={shownEmail} onChange={(e) => { setEmailEdited(true); setEmail(e.target.value); }} className={input} />
          </div>
          <button type="submit" className="w-full py-3 rounded-2xl font-black bg-navy text-white uppercase text-xs tracking-widest">Save changes</button>
        </form>
        <button onClick={clearSquare} className="w-full py-3 rounded-2xl font-black text-red-600 border-2 border-red-100 bg-red-50 uppercase text-xs tracking-widest">Remove from square</button>
      </div>
    </Shell>
  );
}

export default function Modals({
  showAdminLogin, setShowAdminLogin, handleAdminLogin,
  selectedSquare, setSelectedSquare, grid, handleClaimSquare, savedClaimer,
  adminSquare, setAdminSquare, squares, contacts, updatePayment, clearSquare, updateSquareInfo
}) {
  return (
    <>
      {showAdminLogin && <AdminLoginModal setShowAdminLogin={setShowAdminLogin} handleAdminLogin={handleAdminLogin} />}
      {selectedSquare !== null && (
        <ClaimModal key={selectedSquare} selectedSquare={selectedSquare} setSelectedSquare={setSelectedSquare} grid={grid} handleClaimSquare={handleClaimSquare} savedClaimer={savedClaimer} />
      )}
      {adminSquare !== null && (
        <SquareAdminModal key={adminSquare} adminSquare={adminSquare} setAdminSquare={setAdminSquare} squares={squares} contacts={contacts} updatePayment={updatePayment} clearSquare={clearSquare} updateSquareInfo={updateSquareInfo} />
      )}
    </>
  );
}
