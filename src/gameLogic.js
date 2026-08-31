import { getDailyWord, isValidGuess } from './wordBank.js';

export const MAX_GUESSES = 6;

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStorageKey(length, dayKey) {
  return `trycat-${length}-${dayKey}`;
}

export function getLetterStatus(guess, answer) {
  const result = Array(guess.length).fill('absent');
  const remaining = {};

  guess.split('').forEach((letter, index) => {
    if (letter === answer[index]) {
      result[index] = 'correct';
    } else {
      remaining[answer[index]] = (remaining[answer[index]] || 0) + 1;
    }
  });

  guess.split('').forEach((letter, index) => {
    if (result[index] === 'correct') return;
    if ((remaining[letter] || 0) > 0) {
      result[index] = 'present';
      remaining[letter] -= 1;
    }
  });

  return result;
}

export function createGame(length, date = new Date()) {
  return {
    answer: getDailyWord(length, date),
    currentGuess: '',
    guesses: [],
    status: 'playing',
    message: '',
    mode: length,
  };
}

export function restoreGame(length, serializedGame, date = new Date()) {
  const game = createGame(length, date);
  if (!serializedGame) return game;

  try {
    const saved = JSON.parse(serializedGame);
    const guesses = [];

    if (Array.isArray(saved.guesses)) {
      for (const guess of saved.guesses) {
        if (typeof guess !== 'string') continue;
        const normalized = guess.toLowerCase();
        if (!isValidGuess(normalized, length)) continue;
        guesses.push(normalized);
        if (normalized === game.answer || guesses.length === MAX_GUESSES) break;
      }
    }

    const won = guesses.includes(game.answer);
    const lost = !won && guesses.length === MAX_GUESSES;
    const currentGuess = typeof saved.currentGuess === 'string'
      ? saved.currentGuess.replace(/[^a-z]/gi, '').slice(0, length).toLowerCase()
      : '';

    return {
      ...game,
      currentGuess: won || lost ? '' : currentGuess,
      guesses,
      status: won ? 'won' : lost ? 'lost' : 'playing',
      message: won
        ? 'Great job!'
        : lost
          ? `The word was ${game.answer.toUpperCase()}`
          : '',
    };
  } catch {
    return game;
  }
}

export function submitGuess(game) {
  if (game.status !== 'playing') return game;
  if (game.currentGuess.length !== game.mode) {
    return { ...game, message: `Type a ${game.mode}-letter word.` };
  }

  const guess = game.currentGuess.toLowerCase();
  if (!isValidGuess(guess, game.mode)) {
    return { ...game, message: 'Try a word from the word list.' };
  }
  if (game.guesses.includes(guess)) {
    return { ...game, message: "You've already tried this word" };
  }

  const guesses = [...game.guesses, guess];
  const won = guess === game.answer;
  const lost = !won && guesses.length >= MAX_GUESSES;

  return {
    ...game,
    currentGuess: '',
    guesses,
    status: won ? 'won' : lost ? 'lost' : 'playing',
    message: won
      ? 'Great job!'
      : lost
        ? `The word was ${game.answer.toUpperCase()}`
        : '',
  };
}

export function getBoardRows(game) {
  return Array.from({ length: MAX_GUESSES }, (_, rowIndex) => {
    const submittedGuess = game.guesses[rowIndex];
    const isActiveRow = game.status === 'playing' && rowIndex === game.guesses.length;
    const guess = submittedGuess ?? (isActiveRow ? game.currentGuess : '');
    const statuses = submittedGuess
      ? getLetterStatus(submittedGuess, game.answer)
      : Array(game.mode).fill('empty');

    return Array.from({ length: game.mode }, (_, columnIndex) => ({
      letter: guess[columnIndex] || '',
      status: statuses[columnIndex],
    }));
  });
}

export function getKeyboardState(game) {
  const keyboardState = {};
  const rank = { absent: 1, present: 2, correct: 3 };

  game.guesses.forEach((guess) => {
    getLetterStatus(guess, game.answer).forEach((status, index) => {
      const letter = guess[index].toUpperCase();
      if (!keyboardState[letter] || rank[status] > rank[keyboardState[letter]]) {
        keyboardState[letter] = status;
      }
    });
  });

  return keyboardState;
}
