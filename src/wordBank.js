import { VALID_GUESSES_3, VALID_GUESSES_4 } from './validGuesses.js';

export const DAILY_WORDS_3 = [
  "cow", "sun", "hop", "red", "bee", "map", "dog", "cup", "sky", "pig",
  "run", "hat", "fox", "bed", "joy", "ant", "bus", "leg", "owl", "jam",
  "toy", "sit", "cat", "pen", "fly", "rug", "hen", "car", "egg", "hug",
  "box", "wet", "fin", "kid", "log", "pea", "van", "bat", "ice", "top",
  "dig", "ear", "bun", "key", "mud", "lip", "jet", "nut", "arm", "zoo",
  "hot", "bag", "eye", "gum", "pot", "yak", "net", "cap", "ham", "row",
  "fig", "toe", "web", "pet", "oak", "zip", "dad", "sea", "pin", "mix",
  "mom", "tub", "day", "paw", "win", "fan", "rat", "art", "bow", "lid",
  "nap", "bit", "ram", "tag", "cob", "gem", "cut", "pie", "tip", "dot",
  "lap", "kit", "sad", "tea", "ink", "wig", "can", "six", "one", "fun"
];

export const DAILY_WORDS_4 = [
  "moon", "cake", "tree", "duck", "star", "book", "frog", "milk", "bird",
  "play", "rain", "ball", "nest", "boat", "bear", "hand", "kite", "corn", "sock",
  "jump", "leaf", "door", "goat", "snow", "lamp", "crab", "farm", "rock", "seed",
  "king", "pink", "swim", "bell", "pony", "coat", "nose", "fire", "gift", "road",
  "lion", "baby", "sand", "song", "foot", "worm", "desk", "pear", "wave", "drum",
  "game", "hill", "face", "park", "rice", "fish", "ring", "ship", "shop", "bath", "flag",
  "blue", "gold", "kind", "soft", "fast", "slow", "warm", "cool", "loud", "calm",
  "help", "love", "grin", "wish", "clap", "sing", "read", "draw", "bake", "ride",
  "tent", "pond", "deer", "lamb", "swan", "mole", "seal", "tuna", "mint", "plum",
  "bean", "loaf", "soup", "fork", "bowl", "doll", "bike", "boot", "rope", "yard"
];

const WORDS = {
  3: DAILY_WORDS_3,
  4: DAILY_WORDS_4,
};

const VALID_GUESSES = {
  3: VALID_GUESSES_3,
  4: VALID_GUESSES_4,
};

const START_DATE = Date.UTC(2026, 7, 31);
const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const TOTAL_DAILY_WORDS = 100;

export function getDailyWordProgress(today = new Date()) {
  const todayDate = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const elapsedDays = Math.floor((todayDate - START_DATE) / DAY_IN_MS);
  const dayIndex = Math.max(0, elapsedDays);

  return {
    dayIndex,
    wordNumber: Math.min(dayIndex + 1, TOTAL_DAILY_WORDS),
    totalWords: TOTAL_DAILY_WORDS,
    finished: dayIndex >= TOTAL_DAILY_WORDS,
  };
}

export function getDailyWord(length, today = new Date()) {
  if (!WORDS[length]) {
    throw new Error('Invalid word length. Only 3 or 4 letter words are supported.');
  }
  const { dayIndex, finished } = getDailyWordProgress(today);
  if (finished) return undefined;
  return WORDS[length][dayIndex];
}

export function isValidGuess(word, length) {
  const normalizedWord = word.toLowerCase();
  return VALID_GUESSES[length]?.has(normalizedWord)
    || WORDS[length]?.includes(normalizedWord)
    || false;
}
