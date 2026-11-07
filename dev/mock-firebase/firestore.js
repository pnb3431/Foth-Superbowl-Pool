// Local demo stand-in for firebase/firestore: an in-memory store with live
// listeners. Only used by `npm run demo`. Security rules are NOT applied here.
const store = new Map();
const listeners = new Set();

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const deepMerge = (target, source) => {
  const out = { ...(target || {}) };
  Object.entries(source).forEach(([k, v]) => {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : clone(v);
  });
  return out;
};

const docSnap = (path) => ({
  id: path.split('/').pop(),
  exists: () => store.has(path),
  data: () => clone(store.get(path)),
  metadata: { fromCache: false }
});

const collectionSnap = (path) => {
  const docs = [...store.keys()]
    .filter(p => p.startsWith(`${path}/`) && !p.slice(path.length + 1).includes('/'))
    .map(docSnap);
  return { docs, size: docs.length, forEach: (fn) => docs.forEach(fn), metadata: { fromCache: false } };
};

const emit = () => listeners.forEach(l => l.fire());

const write = (path, data, { merge = false, update = false } = {}) => {
  if (update && !store.has(path)) throw new Error(`No document to update: ${path}`);
  store.set(path, merge || update ? deepMerge(store.get(path), data) : clone(data));
};

export const getFirestore = () => ({});
export const doc = (_db, ...segments) => ({ type: 'doc', path: segments.join('/'), id: segments[segments.length - 1] });
export const collection = (_db, ...segments) => ({ type: 'collection', path: segments.join('/') });

export const onSnapshot = (ref, next) => {
  const listener = { fire: () => setTimeout(() => next(ref.type === 'doc' ? docSnap(ref.path) : collectionSnap(ref.path)), 0) };
  listeners.add(listener);
  listener.fire();
  return () => listeners.delete(listener);
};

export const getDocFromServer = async (ref) => docSnap(ref.path);
export const getDocsFromServer = async (ref) => collectionSnap(ref.path);

export const setDoc = async (ref, data, options) => { write(ref.path, data, options); emit(); };
export const updateDoc = async (ref, data) => { write(ref.path, data, { update: true }); emit(); };

const makeWriter = (ops) => ({
  set(ref, data, options) { ops.push(() => write(ref.path, data, options)); return this; },
  update(ref, data) { ops.push(() => write(ref.path, data, { update: true })); return this; },
  delete(ref) { ops.push(() => store.delete(ref.path)); return this; }
});

export const writeBatch = () => {
  const ops = [];
  return { ...makeWriter(ops), commit: async () => { ops.forEach(op => op()); emit(); } };
};

export const runTransaction = async (_db, fn) => {
  const ops = [];
  const tx = { ...makeWriter(ops), get: async (ref) => docSnap(ref.path) };
  const result = await fn(tx);
  ops.forEach(op => op());
  emit();
  return result;
};

// Handy for seeding demo data from the browser console.
window.__mockDb = {
  set: (path, data) => { write(path, data, { merge: true }); emit(); },
  remove: (path) => { store.delete(path); emit(); },
  dump: () => Object.fromEntries([...store.entries()].map(([k, v]) => [k, clone(v)]))
};
