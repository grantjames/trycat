import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  getBoardRows,
  getKeyboardState,
  getLetterStatus,
  getLocalDateKey,
  restoreGame,
  submitGuess,
} from '../src/gameLogic.js';
import {
  DAILY_WORDS_3,
  DAILY_WORDS_4,
  TOTAL_DAILY_WORDS,
  getDailyWord,
  getDailyWordProgress,
  isValidGuess,
} from '../src/wordBank.js';
import { VALID_GUESSES_3, VALID_GUESSES_4 } from '../src/validGuesses.js';

const START_DATE = new Date(2026, 7, 31, 12);

test('daily words begin at index zero and advance by local calendar day', () => {
  assert.equal(getDailyWord(3, START_DATE), DAILY_WORDS_3[0]);
  assert.equal(getDailyWord(4, START_DATE), DAILY_WORDS_4[0]);
  assert.equal(getDailyWord(3, new Date(2026, 8, 1, 12)), DAILY_WORDS_3[1]);
  assert.equal(getDailyWord(4, new Date(2026, 8, 1, 12)), DAILY_WORDS_4[1]);
  assert.equal(getDailyWord(3, new Date(2026, 11, 8, 12)), DAILY_WORDS_3[99]);
  assert.equal(getDailyWord(4, new Date(2026, 11, 8, 12)), DAILY_WORDS_4[99]);
});

test('dates before launch safely use the first word', () => {
  assert.equal(getDailyWord(3, new Date(2026, 7, 1, 12)), DAILY_WORDS_3[0]);
});

test('daily progress finishes only after all 100 words have been used', () => {
  assert.deepEqual(getDailyWordProgress(START_DATE), {
    dayIndex: 0,
    wordNumber: 1,
    totalWords: 100,
    finished: false,
  });
  assert.deepEqual(getDailyWordProgress(new Date(2026, 11, 8, 12)), {
    dayIndex: 99,
    wordNumber: 100,
    totalWords: 100,
    finished: false,
  });
  assert.deepEqual(getDailyWordProgress(new Date(2026, 11, 9, 12)), {
    dayIndex: 100,
    wordNumber: 100,
    totalWords: 100,
    finished: true,
  });
  assert.equal(getDailyWord(3, new Date(2026, 11, 9, 12)), undefined);
  assert.equal(DAILY_WORDS_3.length, TOTAL_DAILY_WORDS);
  assert.equal(DAILY_WORDS_4.length, TOTAL_DAILY_WORDS);
});

test('local date keys do not use UTC calendar dates', () => {
  const date = new Date(2026, 8, 1, 0, 30);
  assert.equal(getLocalDateKey(date), '2026-09-01');
});

test('letter scoring handles repeated letters', () => {
  assert.deepEqual(
    getLetterStatus('boot', 'book'),
    ['correct', 'correct', 'correct', 'absent'],
  );
  assert.deepEqual(
    getLetterStatus('moon', 'book'),
    ['absent', 'correct', 'correct', 'absent'],
  );
});

test('unfinished guesses appear only in the active row and are not scored', () => {
  const game = { ...createGame(3, START_DATE), currentGuess: 'ca' };
  const rows = getBoardRows(game);

  assert.deepEqual(rows[0].map((cell) => cell.letter), ['c', 'a', '']);
  assert.deepEqual(rows[0].map((cell) => cell.status), ['empty', 'empty', 'empty']);
  rows.slice(1).forEach((row) => {
    assert.deepEqual(row.map((cell) => cell.letter), ['', '', '']);
    assert.deepEqual(row.map((cell) => cell.status), ['empty', 'empty', 'empty']);
  });
});

test('invalid guesses do not consume an attempt', () => {
  const game = { ...createGame(3, START_DATE), currentGuess: 'qzx' };
  const nextGame = submitGuess(game);

  assert.deepEqual(nextGame.guesses, []);
  assert.equal(nextGame.status, 'playing');
  assert.match(nextGame.message, /Sorry/i);
});

test('a repeated guess does not consume another attempt', () => {
  const initialGame = createGame(3, START_DATE);
  const previousGuess = DAILY_WORDS_3.find((word) => word !== initialGame.answer);
  const game = {
    ...initialGame,
    currentGuess: previousGuess,
    guesses: [previousGuess],
  };
  const nextGame = submitGuess(game);

  assert.deepEqual(nextGame.guesses, [previousGuess]);
  assert.equal(nextGame.currentGuess, previousGuess);
  assert.equal(nextGame.status, 'playing');
  assert.equal(nextGame.message, "You've already tried this word");
});

test('a correct valid guess completes and locks the game', () => {
  const initialGame = createGame(3, START_DATE);
  const game = { ...initialGame, currentGuess: initialGame.answer };
  const wonGame = submitGuess(game);

  assert.equal(wonGame.status, 'won');
  assert.deepEqual(wonGame.guesses, [initialGame.answer]);
  assert.strictEqual(submitGuess(wonGame), wonGame);
});

test('restored games are sanitized and derive their completion state', () => {
  const answer = getDailyWord(3, START_DATE);
  const wrongGuess = DAILY_WORDS_3.find((word) => word !== answer);
  const restored = restoreGame(3, JSON.stringify({
    guesses: ['qzx', wrongGuess, answer, 'dog'],
    currentGuess: '<script>',
    status: 'playing',
  }), START_DATE);

  assert.deepEqual(restored.guesses, [wrongGuess, answer]);
  assert.equal(restored.currentGuess, '');
  assert.equal(restored.status, 'won');
});

test('keyboard state is derived only from the current game', () => {
  const played = { ...createGame(3, START_DATE), guesses: ['sun'] };
  assert.deepEqual(Object.keys(getKeyboardState(createGame(4, START_DATE))), []);
  assert.deepEqual(Object.keys(getKeyboardState(played)).sort(), ['N', 'S', 'U']);
});

test('guess validation uses broad dictionaries separate from daily answers', () => {
  assert.equal(VALID_GUESSES_3.size, 1300);
  assert.equal(VALID_GUESSES_4.size, 5469);
  assert.equal(isValidGuess('axe', 3), true);
  assert.equal(isValidGuess('able', 4), true);
  assert.equal(isValidGuess('cat', 3), true);
  assert.equal(isValidGuess('fish', 4), true);
  assert.equal(isValidGuess('fish', 3), false);
  assert.equal(isValidGuess('qzx', 3), false);
});

test('every daily answer is accepted as a valid guess', () => {
  DAILY_WORDS_3.forEach((word) => assert.equal(isValidGuess(word, 3), true, word));
  DAILY_WORDS_4.forEach((word) => assert.equal(isValidGuess(word, 4), true, word));
});
