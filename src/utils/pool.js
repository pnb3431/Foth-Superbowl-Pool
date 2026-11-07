// Pool math shared by the app and the tests. Keep this file free of browser-only APIs.

export const PERIODS = ['q1', 'q2', 'q3', 'final'];
export const PERIOD_LABELS = { q1: 'Q1', q2: 'Q2', q3: 'Q3', final: 'Final' };
export const PERIOD_NAMES = { q1: '1st Quarter', q2: '2nd Quarter', q3: '3rd Quarter', final: 'Final' };

// Share of each grid's pot paid for each period.
export const PAYOUT_SHARES = { q1: 0.2, q2: 0.2, q3: 0.2, final: 0.4 };

export const GRID_SIZE = 100;

export const DEFAULT_GRIDS = {
  grid1: { name: 'Grid 1', price: 10, order: 1 },
  grid2: { name: 'Grid 2', price: 20, order: 2 },
  grid3: { name: 'Grid 3', price: 20, order: 3 }
};

export const emptyScores = () => ({
  q1: { top: '', side: '' }, q2: { top: '', side: '' }, q3: { top: '', side: '' }, final: { top: '', side: '' }
});

const shuffle = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** A fresh, independent set of numbers for every period: { q1: { top: [...], side: [...] }, ... } */
export const shuffledNumbers = () =>
  Object.fromEntries(PERIODS.map(period => [period, { top: shuffle(DIGITS), side: shuffle(DIGITS) }]));

const validRow = (row) => Array.isArray(row) && row.length === 10;

// Numbers are only "in play" once the admin has revealed them and every period has a full set.
export const isRevealed = (grid) =>
  grid?.revealed === true && PERIODS.every(p => validRow(grid.numbers?.[p]?.top) && validRow(grid.numbers?.[p]?.side));

export const hasScore = (v) => v !== '' && v !== undefined && v !== null && !isNaN(parseInt(v, 10));
export const periodHasScore = (score) => hasScore(score?.top) && hasScore(score?.side);

/** Row and column of a square (0-99). Columns follow the top team, rows the side team. */
export const squarePosition = (squareId) => ({ row: Math.floor(squareId / 10), col: squareId % 10 });

/** The numbers a square holds for each period, or null before the reveal. */
export function squareNumbers(grid, squareId) {
  if (!isRevealed(grid)) return null;
  const { row, col } = squarePosition(squareId);
  return Object.fromEntries(PERIODS.map(p => [p, { top: grid.numbers[p].top[col], side: grid.numbers[p].side[row] }]));
}

/** The square (0-99) whose numbers match a period's score, or null when hidden or unscored. */
export function winningSquareId(grid, period, score) {
  if (!isRevealed(grid) || !periodHasScore(score)) return null;
  const topDigit = Math.abs(parseInt(score.top, 10)) % 10;
  const sideDigit = Math.abs(parseInt(score.side, 10)) % 10;
  const col = grid.numbers[period].top.indexOf(topDigit);
  const row = grid.numbers[period].side.indexOf(sideDigit);
  if (col === -1 || row === -1) return null;
  return row * 10 + col;
}

/** The next sold square after squareId, moving right then down and wrapping to the top. */
export function nextSoldSquare(squares, squareId) {
  for (let step = 1; step < GRID_SIZE; step++) {
    const id = (squareId + step) % GRID_SIZE;
    if (squares[id]?.name) return id;
  }
  return null;
}

export const soldCount = (squares) => Object.values(squares || {}).filter(s => s?.name).length;

/**
 * Payout results for one grid. The pot is every sold square's price; each period
 * pays its share. If a period's winning square was never sold, that money rolls
 * into the next period. If the Final's square was never sold, it goes to the next
 * sold square (moving right, then down).
 *
 * Returns { pot, periods: { q1: { status, amount, squareId, winnerSquareId, name, rolledIn }, ... } }
 * status: 'pending' (no score yet), 'won', or 'rolled' (money moved to the next period).
 */
export function computeResults(grid, scores, squares) {
  const pot = soldCount(squares) * (Number(grid?.price) || 0);
  const periods = {};
  let carry = 0;

  PERIODS.forEach(period => {
    const amount = pot * PAYOUT_SHARES[period] + carry;
    const rolledIn = carry;
    const squareId = winningSquareId(grid, period, scores?.[period]);

    if (squareId === null) {
      // Later periods can't know about a rollover until this one is decided.
      periods[period] = { status: 'pending', amount, rolledIn, squareId: null, winnerSquareId: null, name: null };
      carry = 0;
      return;
    }

    const owner = squares?.[squareId];
    if (owner?.name) {
      periods[period] = { status: 'won', amount, rolledIn, squareId, winnerSquareId: squareId, name: owner.name };
      carry = 0;
    } else if (period !== 'final') {
      periods[period] = { status: 'rolled', amount: 0, rolledIn, squareId, winnerSquareId: null, name: null };
      carry = amount;
    } else {
      const winnerSquareId = nextSoldSquare(squares || {}, squareId);
      periods[period] = {
        status: winnerSquareId === null ? 'rolled' : 'won',
        amount: winnerSquareId === null ? 0 : amount,
        rolledIn,
        squareId,
        winnerSquareId,
        name: winnerSquareId === null ? null : squares[winnerSquareId].name
      };
    }
  });

  return { pot, periods };
}

/** The period to show first: the earliest one without a score, or the Final once all are in. */
export function currentPeriod(scores) {
  return PERIODS.find(p => !periodHasScore(scores?.[p])) || 'final';
}

// Same person even if their name was typed with different capitals or spacing.
export const personKey = (name) => (name || '').trim().replace(/\s+/g, ' ').toUpperCase();
export const cleanName = (name) => (name || '').trim().replace(/\s+/g, ' ');

export const formatMoney = (amount) => {
  const n = Number(amount) || 0;
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2
  });
};
