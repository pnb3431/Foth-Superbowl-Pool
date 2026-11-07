// Checks the live security rules as an anonymous visitor, for both pools.
// Nothing here should succeed in writing: every write attempt is one the rules must refuse.
// Run: node --env-file=.env dev/check-live-rules.mjs
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
});
const auth = getAuth(app);
const db = getFirestore(app);
const { user } = await signInAnonymously(auth);

const PACKER = ['artifacts', 'foth-packer-pools', 'public', 'data'];
const SB = ['artifacts', 'foth-superbowl-pool', 'public', 'data'];

const results = [];
async function expect(label, shouldWork, fn) {
  let worked = true, detail = '';
  try { detail = (await fn()) ?? ''; } catch (err) { worked = false; detail = err.code || err.message; }
  results.push({ ok: worked === shouldWork, label, expected: shouldWork ? 'allowed' : 'denied', got: worked ? 'allowed' : 'denied', detail });
}

// Packer pool: must behave exactly as before.
let season = '';
await expect('Packer: read seasons', true, async () => {
  season = (await getDoc(doc(db, ...PACKER, 'config', 'seasons'))).data()?.activeSeason;
  return `active season ${season}`;
});
await expect('Packer: read pool1 squares', true, async () => `${(await getDocs(collection(db, ...PACKER, 'seasons', season, 'pools', 'pool1', 'squares'))).size} squares`);
await expect('Packer: read schedule', true, async () => (await getDoc(doc(db, ...PACKER, 'seasons', season, 'config', 'schedule'))).exists() ? 'found' : 'missing');
await expect('Packer: visitor cannot change config', false, () => setDoc(doc(db, ...PACKER, 'config', 'payment'), { venmo: 'x' }, { merge: true }));
await expect('Packer: visitor cannot read emails', false, () => getDocs(collection(db, ...PACKER, 'seasons', season, 'pools', 'pool1', 'contacts')));

// Super Bowl pool
const sbSettings = await getDoc(doc(db, ...SB, 'config', 'settings')).catch(() => null);
const year = sbSettings?.data()?.activeYear || '2027';
await expect('Super Bowl: read settings', true, async () => sbSettings ? (sbSettings.exists() ? `active year ${year}` : 'not created yet') : Promise.reject(new Error('permission-denied')));
await expect('Super Bowl: read grid 1 squares', true, async () => `${(await getDocs(collection(db, ...SB, 'years', year, 'grids', 'grid1', 'squares'))).size} squares`);
await expect('Super Bowl: visitor cannot change settings', false, () => setDoc(doc(db, ...SB, 'config', 'settings'), { activeYear: '1999' }, { merge: true }));
await expect('Super Bowl: visitor cannot change a grid', false, () => setDoc(doc(db, ...SB, 'years', year, 'grids', 'grid1'), { revealed: true }, { merge: true }));
await expect('Super Bowl: visitor cannot enter scores', false, () => setDoc(doc(db, ...SB, 'years', year, 'config', 'scores'), { q1: { top: 1 } }, { merge: true }));
await expect('Super Bowl: visitor cannot read emails', false, () => getDocs(collection(db, ...SB, 'years', year, 'grids', 'grid1', 'contacts')));
await expect('Super Bowl: no claiming a made-up grid', false, () => setDoc(doc(db, ...SB, 'years', year, 'grids', 'grid9', 'squares', '5'), { name: 'Rule Check', claimedBy: user.uid, timestamp: Date.now(), paid: false }));
await expect('Super Bowl: no claiming square #101', false, () => setDoc(doc(db, ...SB, 'years', year, 'grids', 'grid1', 'squares', '100'), { name: 'Rule Check', claimedBy: user.uid, timestamp: Date.now(), paid: false }));
await expect('Super Bowl: no claiming as already paid', false, () => setDoc(doc(db, ...SB, 'years', year, 'grids', 'grid1', 'squares', '99'), { name: 'Rule Check', claimedBy: user.uid, timestamp: Date.now(), paid: true }));

results.forEach(r => console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label} — expected ${r.expected}, got ${r.got}${r.detail ? ` (${r.detail})` : ''}`));
console.log(`\n${results.filter(r => r.ok).length}/${results.length} as expected`);
await auth.signOut();
process.exit(results.every(r => r.ok) ? 0 : 1);
