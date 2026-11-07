import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { findSuperBowl, teamsFromEvent, finishedPeriodScores } from '../../src/utils/espn.js';

// Runs every 5 minutes. In the two weeks before the game it fills in the
// teams and kickoff time once ESPN lists them; on game day it copies
// finished-quarter scores into Firestore, so nobody has to press "Sync".
// Needs FIREBASE_SERVICE_ACCOUNT (the service account JSON) in Netlify env vars.

const DATA = 'artifacts/foth-superbowl-pool/public/data';
const DAY_MS = 24 * 60 * 60 * 1000;
const STOP_AFTER_KICKOFF_MS = 8 * 60 * 60 * 1000;

function getDb() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) return null;
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  return getFirestore();
}

const sameScore = (a, b) => String(a?.top) === String(b?.top) && String(a?.side) === String(b?.side);

export default async () => {
  try {
    const db = getDb();
    if (!db) {
      console.log('FIREBASE_SERVICE_ACCOUNT is not set; skipping automatic scores.');
      return;
    }

    const year = (await db.doc(`${DATA}/config/settings`).get()).data()?.activeYear;
    if (!year) return;
    const gameRef = db.doc(`${DATA}/years/${year}/config/game`);
    const game = (await gameRef.get()).data();
    if (!game?.date) return;

    // Game date at midnight UTC is close enough to decide whether to look at ESPN at all.
    const gameDay = new Date(`${game.date}T00:00:00Z`).getTime();
    const now = Date.now();
    if (now < gameDay - 14 * DAY_MS || now > gameDay + 2 * DAY_MS) return;

    const needsTeams = !game.top || !game.side || !game.kickoff;
    const kickoff = game.kickoff ? new Date(game.kickoff).getTime() : null;
    const gameWindow = kickoff && now > kickoff - 15 * 60 * 1000 && now < kickoff + STOP_AFTER_KICKOFF_MS;
    if (!needsTeams && !gameWindow) return;

    const found = await findSuperBowl(game.date, game.top, game.side);
    if (!found) return;

    if (needsTeams) {
      const espn = teamsFromEvent(found);
      // Never overwrite a team the commissioner already picked.
      const update = {
        ...(!game.top && espn.top ? { top: espn.top } : {}),
        ...(!game.side && espn.side ? { side: espn.side } : {}),
        ...(espn.kickoff && espn.kickoff !== game.kickoff ? { kickoff: espn.kickoff } : {})
      };
      if (Object.keys(update).length) {
        await gameRef.set(update, { merge: true });
        console.log(`Updated ${year} game:`, JSON.stringify(update));
      }
      return;
    }

    const newScores = finishedPeriodScores(found, game.top, game.side);
    if (Object.keys(newScores).length === 0) return;

    const scoresRef = db.doc(`${DATA}/years/${year}/config/scores`);
    const existing = (await scoresRef.get()).data() || {};
    if (Object.entries(newScores).every(([period, score]) => sameScore(existing[period], score))) return;

    await scoresRef.set(newScores, { merge: true });
    console.log(`Updated ${year} scores:`, JSON.stringify(newScores));
  } catch (err) {
    console.error('Automatic score update failed:', err);
  }
};

export const config = {
  schedule: '*/5 * * * *'
};
