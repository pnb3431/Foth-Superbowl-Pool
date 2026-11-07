// Local demo stand-in for firebase/auth. Only used by `npm run demo`.
// Any email works as the commissioner with the password "demo".
const listeners = new Set();
const auth = { currentUser: null };
const notify = () => listeners.forEach(cb => setTimeout(() => cb(auth.currentUser), 0));

export const getAuth = () => auth;
export const onAuthStateChanged = (_auth, cb) => {
  listeners.add(cb);
  setTimeout(() => cb(auth.currentUser), 0);
  return () => listeners.delete(cb);
};
export const signInAnonymously = async () => {
  auth.currentUser = { uid: `anon-${Math.random().toString(36).slice(2, 8)}`, isAnonymous: true, getIdToken: async () => 'demo' };
  notify();
};
export const signInWithEmailAndPassword = async (_auth, email, password) => {
  if (password !== 'demo') throw new Error('auth/invalid-credential');
  auth.currentUser = { uid: 'commissioner', email, isAnonymous: false, getIdToken: async () => 'demo' };
  notify();
};
export const signOut = async () => {
  auth.currentUser = null;
  notify();
};
