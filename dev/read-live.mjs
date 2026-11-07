// Read-only look at the live Super Bowl pool data, as an anonymous visitor.
// Run: node --env-file=.env dev/read-live.mjs
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, collection } from 'firebase/firestore';

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
});
const auth = getAuth(app);
const db = getFirestore(app);
await signInAnonymously(auth);
const SB = ['artifacts', 'foth-superbowl-pool', 'public', 'data'];

const settings = await getDoc(doc(db, ...SB, 'config', 'settings'));
console.log('settings:', settings.exists() ? JSON.stringify(settings.data()) : 'MISSING');
const year = settings.data()?.activeYear || '2027';
const game = await getDoc(doc(db, ...SB, 'years', year, 'config', 'game'));
console.log('game:', game.exists() ? JSON.stringify(game.data()) : 'MISSING');
const grids = await getDocs(collection(db, ...SB, 'years', year, 'grids'));
console.log('grids:', grids.size ? '' : 'NONE');
for (const g of grids.docs) {
  const { numbers, ...rest } = g.data();
  const squares = await getDocs(collection(db, ...SB, 'years', year, 'grids', g.id, 'squares'));
  console.log(` ${g.id}:`, JSON.stringify(rest), `numbers: ${numbers ? 'drawn' : 'none'}`, `squares: ${squares.size}`);
}
await auth.signOut();
process.exit(0);
