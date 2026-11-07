// ESPN scoreboard helpers shared by the app (team lookup, score sync) and the
// autoScores Netlify function. Keep this file free of browser-only APIs.
import { TEAMS } from './teams.js';

const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

/** "2027-02-14" -> "20270214" */
export const toEspnDate = (isoDate) => (isoDate || '').replace(/-/g, '');

/** Fetches the scoreboard for one date (YYYYMMDD). */
export async function fetchScoreboard(espnDate) {
  const res = await fetch(`${SCOREBOARD_URL}?dates=${espnDate}`);
  if (!res.ok) throw new Error(`ESPN scoreboard returned ${res.status}`);
  return res.json();
}

// ESPN's postseason week number for the Super Bowl changes year to year, so go by its headline.
const isSuperBowl = (event) =>
  (event?.competitions?.[0]?.notes || []).some(n => /super bowl/i.test(n.headline || ''));

/**
 * Finds the Super Bowl in a scoreboard response. When both teams are known it
 * must be their game; otherwise the game ESPN labels "Super Bowl" on that date.
 * Returns { event, comp } or null.
 */
export function findSuperBowlEvent(scoreboard, topAbbr, sideAbbr) {
  const events = scoreboard?.events || [];
  if (topAbbr && sideAbbr) {
    const match = events.find(event => {
      const abbrs = (event.competitions?.[0]?.competitors || []).map(c => c.team?.abbreviation);
      return abbrs.includes(topAbbr) && abbrs.includes(sideAbbr);
    });
    if (match) return { event: match, comp: match.competitions[0] };
  }
  const event = events.find(isSuperBowl) || (events.length === 1 ? events[0] : null);
  return event ? { event, comp: event.competitions?.[0] } : null;
}

/** Looks up the Super Bowl on its scheduled date. */
export async function findSuperBowl(gameDate, topAbbr, sideAbbr) {
  if (!gameDate) return null;
  return findSuperBowlEvent(await fetchScoreboard(toEspnDate(gameDate)), topAbbr, sideAbbr);
}

/**
 * The AFC (top) and NFC (side) teams once ESPN knows them, plus kickoff time.
 * Teams are '' while ESPN still lists them as TBD.
 */
export function teamsFromEvent({ event, comp }) {
  const result = { top: '', side: '', kickoff: event?.date || '' };
  (comp?.competitors || []).forEach(c => {
    const team = TEAMS[c.team?.abbreviation];
    if (team?.conf === 'AFC') result.top = c.team.abbreviation;
    if (team?.conf === 'NFC') result.side = c.team.abbreviation;
  });
  return result;
}

/**
 * Cumulative scores for every period that has finished, in our
 * { q1: { top, side }, ... } format. In-progress periods are left out so they
 * don't overwrite anything. The Final includes overtime.
 */
export function finishedPeriodScores({ comp, event }, topAbbr, sideAbbr) {
  const top = comp?.competitors?.find(c => c.team?.abbreviation === topAbbr);
  const side = comp?.competitors?.find(c => c.team?.abbreviation === sideAbbr);
  if (!top || !side) return {};

  const status = comp.status || event?.status || {};
  const completed = Boolean(status.type?.completed);
  const livePeriod = status.period || 0;
  const betweenPeriods = ['STATUS_HALFTIME', 'STATUS_END_PERIOD'].includes(status.type?.name);
  const quarterDone = (q) => completed || livePeriod > q || (livePeriod === q && betweenPeriods);

  const topScores = top.linescores || [];
  const sideScores = side.linescores || [];
  const cumulative = (scores, quarter) => scores.slice(0, quarter).reduce((sum, s) => sum + (s?.value || 0), 0);

  const result = {};
  ['q1', 'q2', 'q3'].forEach((period, i) => {
    const q = i + 1;
    if (quarterDone(q) && topScores[i] && sideScores[i]) {
      result[period] = { top: cumulative(topScores, q), side: cumulative(sideScores, q) };
    }
  });
  if (completed) result.final = { top: Number(top.score), side: Number(side.score) };
  return result;
}
