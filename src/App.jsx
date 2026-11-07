import { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, updateDoc, writeBatch, getDocFromServer, getDocsFromServer } from 'firebase/firestore';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import Header from './components/Header';
import GridPicker from './components/GridPicker';
import GridStatus from './components/GridStatus';
import PayCard from './components/PayCard';
import AdminPanel from './components/AdminPanel';
import SquareFinder from './components/SquareFinder';
import SquareGrid from './components/SquareGrid';
import Modals from './components/Modals';
import {
  PERIODS, DEFAULT_GRIDS, emptyScores, shuffledNumbers, isRevealed, hasScore,
  computeResults, soldCount, personKey, cleanName, formatMoney
} from './utils/pool';
import { findSuperBowl, teamsFromEvent, finishedPeriodScores } from './utils/espn';
import { teamInfo } from './utils/teams';

// --- Firebase Setup (same project and commissioner login as the Packer pool) ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = 'foth-superbowl-pool';

// --- Firestore paths ---
const DATA = ['artifacts', appId, 'public', 'data'];
const globalConfigDoc = (name) => doc(db, ...DATA, 'config', name);
const yearConfigDoc = (year, name) => doc(db, ...DATA, 'years', year, 'config', name);
const gridsCollection = (year) => collection(db, ...DATA, 'years', year, 'grids');
const gridDoc = (year, gridId) => doc(db, ...DATA, 'years', year, 'grids', gridId);
const gridCollection = (year, gridId, coll) => collection(db, ...DATA, 'years', year, 'grids', gridId, coll);
const gridItemDoc = (year, gridId, coll, id) => doc(db, ...DATA, 'years', year, 'grids', gridId, coll, String(id));

const GRID_IDS = Object.keys(DEFAULT_GRIDS);
const DEFAULT_YEAR = '2027';
// ESPN's date for each Super Bowl, used to seed a new year. Editable in the admin panel.
const SUPER_BOWL_DATES = { 2027: '2027-02-14' };
const EMPTY = {};
const SAVED_CLAIMER = 'sb-pool-claimer';

const snapshotToMap = (snapshot) => {
  const data = {};
  snapshot.forEach(d => { data[d.id] = d.data(); });
  return data;
};

// Snapshot data is stored with the year it was loaded for, so data from a
// previous year is never shown (or acted on) after switching.
const forKey = (tagged, key, fallback) => (tagged.key === key ? tagged.value : fallback);
const untagged = { key: null, value: null };

const _initParams = new URLSearchParams(window.location.search);

const readSavedClaimer = () => {
  try { return JSON.parse(localStorage.getItem(SAVED_CLAIMER)) || {}; } catch { return {}; }
};

const TOAST_STYLES = {
  success: { className: 'bg-gold text-navy border-navy', Icon: CheckCircle },
  error: { className: 'bg-red-600 text-white border-red-900', Icon: AlertTriangle },
  info: { className: 'bg-navy text-white border-silver', Icon: Info }
};

const App = () => {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [paymentLinks, setPaymentLinks] = useState({ venmo: '', paypal: '', zelle: '' });
  const [gameSnap, setGameSnap] = useState(untagged);
  const [scoresSnap, setScoresSnap] = useState(untagged);
  const [gridsSnap, setGridsSnap] = useState(untagged);
  const [squaresSnap, setSquaresSnap] = useState({});
  const [contactsSnap, setContactsSnap] = useState({});

  const [currentGridId, setCurrentGridId] = useState(GRID_IDS.includes(_initParams.get('grid')) ? _initParams.get('grid') : GRID_IDS[0]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [adminSquare, setAdminSquare] = useState(null);
  const [inspectedSquare, setInspectedSquare] = useState(null);
  const [finderQuery, setFinderQuery] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const seeded = useRef({});

  const activeYear = settings?.activeYear || DEFAULT_YEAR;
  const urlYear = _initParams.get('year');
  const year = urlYear && /^\d{4}$/.test(urlYear) ? urlYear : activeYear;
  const isLocked = year !== activeYear;

  const game = forKey(gameSnap, year, null);
  const scores = useMemo(() => {
    // Scores are written one field at a time, so fill in any periods not saved yet.
    const raw = forKey(scoresSnap, year, EMPTY);
    return Object.fromEntries(Object.entries(emptyScores()).map(([p, blank]) => [p, { ...blank, ...raw[p] }]));
  }, [scoresSnap, year]);
  const savedGrids = forKey(gridsSnap, year, null);
  const grids = useMemo(() => Object.fromEntries(GRID_IDS.map(id => [id, { ...DEFAULT_GRIDS[id], ...savedGrids?.[id] }])), [savedGrids]);
  const squaresByGrid = useMemo(() => Object.fromEntries(GRID_IDS.map(id => [id, forKey(squaresSnap[id] || untagged, year, EMPTY)])), [squaresSnap, year]);
  const contactsByGrid = useMemo(() => Object.fromEntries(GRID_IDS.map(id => [id, isAdmin ? forKey(contactsSnap[id] || untagged, year, EMPTY) : EMPTY])), [contactsSnap, year, isAdmin]);

  const grid = grids[currentGridId];
  const squares = squaresByGrid[currentGridId];
  const contacts = contactsByGrid[currentGridId];
  const revealed = isRevealed(grid);
  const topTeam = teamInfo(game?.top, 'top');
  const sideTeam = teamInfo(game?.side, 'side');

  // URL Sync — only pin the grid and year in the URL when they aren't the defaults.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (currentGridId !== GRID_IDS[0]) params.set('grid', currentGridId);
    else params.delete('grid');
    const searchString = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${searchString ? '?' + searchString : ''}`);
  }, [currentGridId]);

  // 1. Auth Initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setIsAdmin(!u.isAnonymous);
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Auth error:", err);
          setAuthError(true);
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Global config (active year, payment links)
  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(globalConfigDoc('settings'), (snap) => {
      setSettings(snap.exists() ? snap.data() : { activeYear: DEFAULT_YEAR });
    }, (err) => {
      console.error("Error fetching settings:", err);
      setSettings({ activeYear: DEFAULT_YEAR });
    });
    const unsubPayment = onSnapshot(globalConfigDoc('payment'), (snap) => {
      if (snap.exists()) setPaymentLinks(snap.data());
    }, (err) => console.error("Error fetching payments:", err));
    return () => { unsubSettings(); unsubPayment(); };
  }, [user]);

  // 3. Year data: game info, scores, grid settings
  useEffect(() => {
    if (!user || !settings) return;
    const unsubGame = onSnapshot(yearConfigDoc(year, 'game'), (snap) => {
      setGameSnap({ key: year, value: snap.exists() ? snap.data() : { date: SUPER_BOWL_DATES[year] || '', top: '', side: '' } });
    }, (err) => console.error("Error fetching game:", err));

    const unsubScores = onSnapshot(yearConfigDoc(year, 'scores'), (snap) => {
      setScoresSnap({ key: year, value: snap.exists() ? snap.data() : {} });
    }, (err) => console.error("Error fetching scores:", err));

    const unsubGrids = onSnapshot(gridsCollection(year), (snapshot) => {
      setGridsSnap({ key: year, value: snapshotToMap(snapshot) });
    }, (err) => console.error("Error fetching grids:", err));

    return () => { unsubGame(); unsubScores(); unsubGrids(); };
  }, [user, settings, year]);

  // 4. Squares for every grid (so the picker can show what's left and the finder can search them all)
  useEffect(() => {
    if (!user || !settings) return;
    const unsubs = GRID_IDS.map(id => onSnapshot(gridCollection(year, id, 'squares'), (snapshot) => {
      setSquaresSnap(prev => ({ ...prev, [id]: { key: year, value: snapshotToMap(snapshot) } }));
    }, (err) => console.error(`Error fetching ${id} squares:`, err)));
    return () => unsubs.forEach(u => u());
  }, [user, settings, year]);

  // 5. Participant emails — only the commissioner can read these.
  useEffect(() => {
    if (!isAdmin || !settings) return;
    const unsubs = GRID_IDS.map(id => onSnapshot(gridCollection(year, id, 'contacts'), (snapshot) => {
      setContactsSnap(prev => ({ ...prev, [id]: { key: year, value: snapshotToMap(snapshot) } }));
    }, (err) => console.error(`Error fetching ${id} contacts:`, err)));
    return () => unsubs.forEach(u => u());
  }, [isAdmin, settings, year]);

  // 6. The commissioner's visit creates whatever the year still needs. Sign-ups only work once
  // the settings and grid documents exist (the security rules check them). This asks the
  // server directly: a listener can report a cached "missing" and never update.
  useEffect(() => {
    if (!isAdmin || !settings || isLocked || seeded.current[year]) return;
    seeded.current[year] = true;
    (async () => {
      const batch = writeBatch(db);
      let writes = 0;
      if (!(await getDocFromServer(globalConfigDoc('settings'))).exists()) {
        batch.set(globalConfigDoc('settings'), { activeYear: year }, { merge: true });
        writes++;
      }
      if (!(await getDocFromServer(yearConfigDoc(year, 'game'))).exists()) {
        batch.set(yearConfigDoc(year, 'game'), { date: SUPER_BOWL_DATES[year] || '', top: '', side: '' }, { merge: true });
        writes++;
      }
      const existingGrids = new Set((await getDocsFromServer(gridsCollection(year))).docs.map(d => d.id));
      GRID_IDS.filter(id => !existingGrids.has(id)).forEach(id => {
        batch.set(gridDoc(year, id), { ...DEFAULT_GRIDS[id], revealed: false }, { merge: true });
        writes++;
      });
      if (writes) {
        await batch.commit();
        console.info(`Set up ${writes} missing pool documents for ${year}.`);
      }
    })().catch(err => {
      console.error("Error setting up the pool:", err);
      seeded.current[year] = false;
    });
  }, [isAdmin, settings, year, isLocked]);

  const results = useMemo(() => computeResults(grid, scores, squares), [grid, scores, squares]);

  const gridSummaries = useMemo(() => Object.fromEntries(GRID_IDS.map(id => {
    const sold = soldCount(squaresByGrid[id]);
    return [id, { ...grids[id], id, sold, revealed: isRevealed(grids[id]) }];
  })), [grids, squaresByGrid]);

  // "Find my squares": everyone whose name matches, with their squares in every grid and what they've won.
  const finderMatches = useMemo(() => {
    const query = personKey(finderQuery);
    if (query.length < 2) return [];
    const people = {};
    GRID_IDS.forEach(gridId => {
      const gridResults = computeResults(grids[gridId], scores, squaresByGrid[gridId]);
      Object.entries(squaresByGrid[gridId]).forEach(([squareId, square]) => {
        const key = personKey(square.name);
        if (!key.includes(query)) return;
        if (!people[key]) people[key] = { key, displayName: cleanName(square.name), squares: [], winnings: 0 };
        people[key].squares.push({ gridId, squareId: Number(squareId) });
      });
      PERIODS.forEach(p => {
        const r = gridResults.periods[p];
        if (r.status !== 'won') return;
        const key = personKey(r.name);
        if (people[key]) people[key].winnings += r.amount;
      });
    });
    return Object.values(people).sort((a, b) => a.displayName.localeCompare(b.displayName)).slice(0, 6);
  }, [finderQuery, grids, scores, squaresByGrid]);

  const highlightedSquares = useMemo(() => new Set(
    finderMatches.flatMap(p => p.squares.filter(s => s.gridId === currentGridId).map(s => s.squareId))
  ), [finderMatches, currentGridId]);

  const showToast = (msg, tone = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), tone === 'error' ? 5000 : 3000);
  };

  // Runs a Firestore write and reports failures instead of leaving an unhandled rejection.
  const attempt = async (fn, errorMsg) => {
    try {
      await fn();
      return true;
    } catch (err) {
      console.error(err);
      showToast(errorMsg, 'error');
      return false;
    }
  };

  const selectGrid = (gridId) => {
    setCurrentGridId(gridId);
    setInspectedSquare(null);
  };

  const handleSquareClick = (squareId) => {
    const claimed = Boolean(squares[squareId]);
    if (isAdmin && claimed) return setAdminSquare(squareId);
    if (claimed || (revealed && !isAdmin)) return setInspectedSquare(prev => (prev === squareId ? null : squareId));
    if (isLocked) return;
    if (!savedGrids[currentGridId]) return showToast("Sign-ups for this grid aren't open yet. Check back soon!", 'info');
    setInspectedSquare(null);
    setSelectedSquare(squareId);
  };

  const handleAdminLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowAdminLogin(false);
      showToast("Access Granted, Commissioner");
      return true;
    } catch (err) {
      console.error(err);
      showToast("Invalid Credentials", 'error');
      return false;
    }
  };

  // Signing out drops back to an anonymous session via onAuthStateChanged.
  const handleExitAdmin = () => attempt(async () => {
    await signOut(auth);
    showToast("Logged out of admin mode");
  }, "Error logging out.");

  const handleClaimSquare = async (name, email) => {
    const claimName = cleanName(name);
    const claimEmail = email.trim().toLowerCase();
    if (selectedSquare === null || !claimName || !claimEmail) return;
    if (isLocked) return showToast("This pool is closed.", 'error');
    if (revealed && !isAdmin) return showToast("Numbers are out, so this grid is closed.", 'error');
    const squareId = selectedSquare;
    if (squares[squareId]) return showToast("Someone just took that square!", 'error');
    const batch = writeBatch(db);
    batch.set(gridItemDoc(year, currentGridId, 'squares', squareId), {
      name: claimName,
      claimedBy: user.uid,
      timestamp: Date.now(),
      paid: false
    });
    // Email is stored separately so only the commissioner can read it.
    batch.set(gridItemDoc(year, currentGridId, 'contacts', squareId), { email: claimEmail, claimedBy: user.uid });
    // The grid shows the square as soon as the write starts; the server confirms it
    // (or the rules refuse it, e.g. someone else got there first) a moment later.
    const saving = batch.commit();
    setSelectedSquare(null);
    try { localStorage.setItem(SAVED_CLAIMER, JSON.stringify({ name: claimName, email: claimEmail })); } catch { /* private window */ }
    try {
      await saving;
      showToast(`Square #${squareId + 1} is yours!`);
    } catch (err) {
      console.error(err);
      showToast(err?.code === 'permission-denied'
        ? `Square #${squareId + 1} couldn't be claimed. Someone may have just taken it. Please pick another.`
        : "Couldn't claim that square. Please try again.", 'error');
    }
  };

  // --- Commissioner actions ---
  const updatePayment = (method) => {
    if (!isAdmin || adminSquare === null) return;
    const squareRef = gridItemDoc(year, currentGridId, 'squares', adminSquare);
    return attempt(async () => {
      if (method === 'unpaid') {
        await updateDoc(squareRef, { paid: false, paymentMethod: null });
        showToast("Marked as Unpaid");
      } else {
        await updateDoc(squareRef, { paid: true, paymentMethod: method });
        showToast(`Marked Paid via ${method}`);
      }
      setAdminSquare(null);
    }, "Error updating payment.");
  };

  const clearSquare = () => {
    if (!isAdmin || adminSquare === null) return;
    const name = squares[adminSquare]?.name || 'this person';
    if (!window.confirm(`Remove ${name} from square #${adminSquare + 1}? This can't be undone.`)) return;
    return attempt(async () => {
      const batch = writeBatch(db);
      batch.delete(gridItemDoc(year, currentGridId, 'squares', adminSquare));
      batch.delete(gridItemDoc(year, currentGridId, 'contacts', adminSquare));
      await batch.commit();
      showToast("Square has been cleared!");
      setAdminSquare(null);
    }, "Error clearing square.");
  };

  const updateSquareInfo = (name, email) => {
    if (!isAdmin || adminSquare === null) return;
    return attempt(async () => {
      const batch = writeBatch(db);
      batch.update(gridItemDoc(year, currentGridId, 'squares', adminSquare), { name: cleanName(name) });
      batch.set(gridItemDoc(year, currentGridId, 'contacts', adminSquare), { email: email.trim().toLowerCase() }, { merge: true });
      await batch.commit();
      showToast("Square info updated!");
    }, "Error updating square.");
  };

  const updateGridConfig = (field, val) => attempt(
    () => setDoc(gridDoc(year, currentGridId), { [field]: field === 'price' ? parseFloat(val) || 0 : val.trim() }, { merge: true }),
    "Error updating grid."
  );

  const updateGame = (fields) => attempt(
    () => setDoc(yearConfigDoc(year, 'game'), fields, { merge: true }),
    "Error updating the game."
  );

  const updatePaymentLink = (method, val) => attempt(
    () => setDoc(globalConfigDoc('payment'), { [method]: val.trim() }, { merge: true }),
    "Error updating payment link."
  );

  const anyScores = PERIODS.some(p => hasScore(scores[p].top) || hasScore(scores[p].side));

  const revealNumbers = () => {
    const sold = soldCount(squares);
    if (sold < 100 && !window.confirm(`${grid.name} only has ${sold} of 100 squares sold. Sign-ups close when the numbers come out, and if an unsold square wins, its money rolls to the next quarter. Reveal anyway?`)) return;
    return attempt(async () => {
      await setDoc(gridDoc(year, currentGridId), {
        revealed: true,
        // Never reveal a board without numbers — draw them on the way out.
        ...(grid.numbers ? {} : { numbers: shuffledNumbers() })
      }, { merge: true });
      showToast(`${grid.name} numbers are out!`);
    }, "Error revealing numbers.");
  };

  const hideNumbers = () => {
    if (!window.confirm(`Hide ${grid.name}'s numbers and reopen sign-ups? The numbers are thrown out (so nobody can pick a square knowing them) and a new set is drawn when you reveal again.${anyScores ? " Winners will disappear until then." : ''}`)) return;
    // Grid documents are readable by everyone, so hidden numbers can't stay stored while sign-ups are open.
    return attempt(() => setDoc(gridDoc(year, currentGridId), { revealed: false, numbers: null }, { merge: true }), "Error hiding numbers.");
  };

  const reshuffleNumbers = () => {
    if (!window.confirm(`Draw new numbers for ${grid.name}? ${revealed ? 'Everyone has already seen the current ones, and this changes who wins.' : 'This replaces the numbers that were drawn before.'}`)) return;
    return attempt(async () => {
      await setDoc(gridDoc(year, currentGridId), { numbers: shuffledNumbers() }, { merge: true });
      showToast("New numbers drawn!");
    }, "Error drawing numbers.");
  };

  const updateScore = (p, team, val) => attempt(
    () => setDoc(yearConfigDoc(year, 'scores'), { [p]: { [team]: val } }, { merge: true }),
    "Error saving score."
  );

  const togglePaidOut = (p) => {
    const newStatus = !grid.paidOut?.[p];
    return attempt(async () => {
      await setDoc(gridDoc(year, currentGridId), { paidOut: { [p]: newStatus } }, { merge: true });
      showToast(`${grid.name} ${p === 'final' ? 'Final' : p.toUpperCase()} winner marked ${newStatus ? 'PAID' : 'UNPAID'}`);
    }, "Error updating payout.");
  };

  const pullTeamsFromEspn = async () => {
    if (!game?.date) return showToast("Set the game date first.", 'error');
    try {
      showToast("Checking ESPN...", 'info');
      const found = await findSuperBowl(game.date);
      if (!found) return showToast(`ESPN has no Super Bowl on ${game.date}. Check the game date.`, 'error');
      const teams = teamsFromEvent(found);
      if (!teams.top && !teams.side) {
        await updateGame({ kickoff: teams.kickoff });
        return showToast("ESPN still lists both teams as TBD. Kickoff time saved.", 'info');
      }
      await updateGame({ kickoff: teams.kickoff, ...(teams.top ? { top: teams.top } : {}), ...(teams.side ? { side: teams.side } : {}) });
      showToast(`Teams set: ${teamInfo(teams.top, 'top').name} vs ${teamInfo(teams.side, 'side').name}`);
    } catch (e) {
      console.error(e);
      showToast("Couldn't reach ESPN.", 'error');
    }
  };

  const syncLiveScores = async () => {
    if (!game?.top || !game?.side) return showToast("Pick both teams first.", 'error');
    try {
      showToast("Fetching scores from ESPN...", 'info');
      const found = await findSuperBowl(game.date, game.top, game.side);
      if (!found) return showToast(`Couldn't find the game on ESPN for ${game.date}.`, 'error');
      // Only finished periods are written, so in-progress quarters (and manual entries) aren't overwritten.
      const newScores = finishedPeriodScores(found, game.top, game.side);
      if (Object.keys(newScores).length === 0) {
        return showToast(found.comp.status?.type?.state === 'pre' ? "The game hasn't started yet." : "No completed quarters yet.", 'info');
      }
      await setDoc(yearConfigDoc(year, 'scores'), newScores, { merge: true });
      showToast("Scores synced!");
    } catch (e) {
      console.error(e);
      showToast("Error syncing scores.", 'error');
    }
  };

  const copyEmails = async () => {
    try {
      const emails = [...new Set(GRID_IDS.flatMap(id => Object.values(contactsByGrid[id]).map(c => c.email).filter(Boolean)))];
      if (emails.length === 0) return showToast("No emails yet!", 'info');
      await navigator.clipboard.writeText(emails.join(', '));
      showToast(`Copied ${emails.length} emails from all grids!`);
    } catch (err) {
      console.error('Failed to copy emails:', err);
      showToast("Failed to copy emails to clipboard", 'error');
    }
  };

  const startNextYear = () => {
    const next = String(Number(activeYear) + 1);
    if (!window.confirm(`Start a fresh pool for the ${next} Super Bowl? The ${activeYear} grids will be closed and everyone will see the new, empty ones.`)) return;
    return attempt(async () => {
      await setDoc(globalConfigDoc('settings'), { activeYear: next }, { merge: true });
      showToast(`The ${next} pool is open!`);
    }, "Error starting the new year.");
  };

  if (authError) return <div className="flex items-center justify-center h-screen bg-navy text-silver font-black text-xl tracking-widest uppercase italic text-center px-4">Couldn't connect to the pool. Please refresh to try again.</div>;
  if (loading || !game || !savedGrids) return <div className="flex items-center justify-center h-screen bg-navy text-silver font-black text-xl animate-pulse tracking-widest uppercase italic">Super Bowl Pool Loading...</div>;

  const toastStyle = toast && (TOAST_STYLES[toast.tone] || TOAST_STYLES.success);
  const paidCount = Object.values(squares).filter(s => s.paid).length;
  const signupsOpen = !revealed && !isLocked;

  return (
    <div className="min-h-screen text-slate-900 pb-24 font-sans selection:bg-gold selection:text-navy">
      {toast && (
        <div role={toast.tone === 'error' ? 'alert' : 'status'} className={`fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-2rem)] max-w-md font-black px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 uppercase italic tracking-tight text-sm ${toastStyle.className}`}>
          <toastStyle.Icon size={22} className="shrink-0" /> {toast.msg}
        </div>
      )}

      <Header
        year={year}
        game={game}
        topTeam={topTeam}
        sideTeam={sideTeam}
        isAdmin={isAdmin}
        onExitAdmin={handleExitAdmin}
        setShowAdminLogin={setShowAdminLogin}
      />

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {isLocked && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl text-center font-black uppercase tracking-widest text-sm">
            {year} pool — closed (read-only)
          </div>
        )}

        <GridPicker grids={gridSummaries} currentGridId={currentGridId} selectGrid={selectGrid} />

        <GridStatus
          grid={grid}
          sold={soldCount(squares)}
          results={results}
          scores={scores}
          topTeam={topTeam}
          sideTeam={sideTeam}
          revealed={revealed}
        />

        {isAdmin && !isLocked && (
          <AdminPanel
            year={year}
            game={game}
            updateGame={updateGame}
            pullTeamsFromEspn={pullTeamsFromEspn}
            grid={grid}
            updateGridConfig={updateGridConfig}
            sold={soldCount(squares)}
            paidCount={paidCount}
            revealed={revealed}
            revealNumbers={revealNumbers}
            hideNumbers={hideNumbers}
            reshuffleNumbers={reshuffleNumbers}
            scores={scores}
            updateScore={updateScore}
            syncLiveScores={syncLiveScores}
            topTeam={topTeam}
            sideTeam={sideTeam}
            results={results}
            togglePaidOut={togglePaidOut}
            paymentLinks={paymentLinks}
            updatePaymentLink={updatePaymentLink}
            copyEmails={copyEmails}
            startNextYear={startNextYear}
          />
        )}

        {signupsOpen && <PayCard paymentLinks={paymentLinks} price={grid.price} />}

        <SquareFinder
          query={finderQuery}
          setQuery={setFinderQuery}
          matches={finderMatches}
          grids={grids}
          currentGridId={currentGridId}
          selectGrid={selectGrid}
          topTeam={topTeam}
          sideTeam={sideTeam}
        />

        <SquareGrid
          grid={grid}
          squares={squares}
          revealed={revealed}
          signupsOpen={signupsOpen}
          isAdmin={isAdmin}
          isLocked={isLocked}
          scores={scores}
          results={results}
          topTeam={topTeam}
          sideTeam={sideTeam}
          onSquareClick={handleSquareClick}
          inspectedSquare={inspectedSquare}
          closeDetails={() => setInspectedSquare(null)}
          highlightedSquares={highlightedSquares}
        />

        <p className="text-center text-xs font-bold text-slate-500 px-4">
          On a full grid, Q1, Q2 and Q3 each pay {formatMoney(grid.price * 20)} and the Final pays {formatMoney(grid.price * 40)}. The Final includes overtime.
        </p>
      </main>

      <Modals
        showAdminLogin={showAdminLogin}
        setShowAdminLogin={setShowAdminLogin}
        handleAdminLogin={handleAdminLogin}
        selectedSquare={selectedSquare}
        setSelectedSquare={setSelectedSquare}
        grid={grid}
        handleClaimSquare={handleClaimSquare}
        savedClaimer={readSavedClaimer}
        adminSquare={adminSquare}
        setAdminSquare={setAdminSquare}
        squares={squares}
        contacts={contacts}
        updatePayment={updatePayment}
        clearSquare={clearSquare}
        updateSquareInfo={updateSquareInfo}
      />
    </div>
  );
};

export default App;
