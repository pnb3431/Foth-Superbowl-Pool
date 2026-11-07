import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PERIODS, computeResults, winningSquareId, squareNumbers, shuffledNumbers, isRevealed, nextSoldSquare, currentPeriod
} from '../src/utils/pool.js';
import { findSuperBowlEvent, teamsFromEvent, finishedPeriodScores } from '../src/utils/espn.js';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
// Numbers in order (square id = side digit * 10 + top digit) except where a test overrides them.
const orderedNumbers = () => Object.fromEntries(PERIODS.map(p => [p, { top: [...DIGITS], side: [...DIGITS] }]));
const fullBoard = () => Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i, { name: `Person ${i}` }]));
const score = (top, side) => ({ top, side });

test('every period gets its own shuffled set of 0-9 on both sides', () => {
  const numbers = shuffledNumbers();
  assert.deepEqual(Object.keys(numbers), PERIODS);
  PERIODS.forEach(p => {
    assert.deepEqual([...numbers[p].top].sort(), DIGITS);
    assert.deepEqual([...numbers[p].side].sort(), DIGITS);
  });
});

test('numbers stay hidden until the grid is revealed', () => {
  const grid = { price: 10, revealed: false, numbers: orderedNumbers() };
  assert.equal(isRevealed(grid), false);
  assert.equal(winningSquareId(grid, 'q1', score(7, 3)), null);
  assert.equal(squareNumbers(grid, 5), null);
});

test('a full $10 grid pays 200 / 200 / 200 / 400 using each period\'s own numbers', () => {
  const numbers = orderedNumbers();
  numbers.q2 = { top: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0], side: [...DIGITS] };
  const grid = { price: 10, revealed: true, numbers };
  const scores = { q1: score(7, 3), q2: score(14, 10), q3: score(17, 24), final: score(31, 27) };
  const { pot, periods } = computeResults(grid, scores, fullBoard());

  assert.equal(pot, 1000);
  assert.deepEqual(PERIODS.map(p => periods[p].amount), [200, 200, 200, 400]);
  assert.equal(periods.q1.winnerSquareId, 37); // side 3, top 7
  assert.equal(periods.q2.winnerSquareId, 5); // side 0, top 4 sits in column 5 of the reversed Q2 row
  assert.equal(periods.q3.winnerSquareId, 47);
  assert.equal(periods.final.winnerSquareId, 71);
  assert.equal(periods.final.name, 'Person 71');
});

test('a $20 grid pays 400 / 400 / 400 / 800', () => {
  const grid = { price: 20, revealed: true, numbers: orderedNumbers() };
  const scores = { q1: score(0, 0), q2: score(3, 0), q3: score(10, 7), final: score(20, 17) };
  const { periods } = computeResults(grid, scores, fullBoard());
  assert.deepEqual(PERIODS.map(p => periods[p].amount), [400, 400, 400, 800]);
});

test('scores waiting to come in are pending and show their base amount', () => {
  const grid = { price: 10, revealed: true, numbers: orderedNumbers() };
  const { periods } = computeResults(grid, { q1: score(7, 0), q2: score('', '') }, fullBoard());
  assert.equal(periods.q1.status, 'won');
  assert.equal(periods.q2.status, 'pending');
  assert.equal(periods.final.status, 'pending');
  assert.equal(periods.final.amount, 400);
  assert.equal(currentPeriod({ q1: score(7, 0) }), 'q2');
});

test('an unsold winning square rolls its money into the next period', () => {
  const grid = { price: 10, revealed: true, numbers: orderedNumbers() };
  const squares = fullBoard();
  delete squares[7]; delete squares[17];
  // Pot is now 98 squares x $10 = $980: 196 / 196 / 196 / 392
  const scores = { q1: score(7, 0), q2: score(7, 1), q3: score(10, 7), final: score(20, 17) };
  const { pot, periods } = computeResults(grid, scores, squares);

  assert.equal(pot, 980);
  assert.equal(periods.q1.status, 'rolled');
  assert.equal(periods.q1.amount, 0);
  assert.equal(periods.q2.status, 'rolled');
  assert.equal(periods.q2.rolledIn, 196);
  assert.equal(periods.q3.status, 'won');
  assert.equal(periods.q3.amount, 196 * 3);
  assert.equal(periods.final.amount, 392);
});

test('an unsold Final square pays the next sold square, wrapping past 99', () => {
  const grid = { price: 10, revealed: true, numbers: orderedNumbers() };
  const squares = fullBoard();
  delete squares[99]; delete squares[0];
  const { periods } = computeResults(grid, { q1: score(1, 0), q2: score(1, 0), q3: score(1, 0), final: score(9, 9) }, squares);
  assert.equal(periods.final.squareId, 99);
  assert.equal(periods.final.winnerSquareId, 1);
  assert.equal(periods.final.name, 'Person 1');
  assert.equal(nextSoldSquare({}, 5), null);
});

test('ESPN: last year\'s Super Bowl (SEA 29, NE 13) gives the right quarter scores', () => {
  const scoreboard = JSON.parse(readFileSync(new URL('./sb-lx-final.json', import.meta.url)));
  const found = findSuperBowlEvent(scoreboard, 'NE', 'SEA');
  assert.ok(found);
  assert.deepEqual(teamsFromEvent(found), { top: 'NE', side: 'SEA', kickoff: '2026-02-08T23:30Z' });
  assert.deepEqual(finishedPeriodScores(found, 'NE', 'SEA'), {
    q1: { top: 0, side: 3 }, q2: { top: 0, side: 9 }, q3: { top: 0, side: 12 }, final: { top: 13, side: 29 }
  });
});

test('ESPN: next year\'s game is found while the teams are still TBD', () => {
  const scoreboard = JSON.parse(readFileSync(new URL('./sb-lxi-tbd.json', import.meta.url)));
  const found = findSuperBowlEvent(scoreboard, '', '');
  assert.ok(found);
  assert.deepEqual(teamsFromEvent(found), { top: '', side: '', kickoff: '2027-02-14T23:30Z' });
  assert.deepEqual(finishedPeriodScores(found, '', ''), {});
});
