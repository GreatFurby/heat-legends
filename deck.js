export const STORAGE_KEY = 'heat-legends-nine-car.session.v1';
export const CARD_IDS = Object.freeze(Array.from({ length: 10 }, (_, i) => i + 1));

export function shuffle(random = Math.random) {
  const deck = [...CARD_IDS];
  // Fisher–Yates: choose uniformly from the still-unshuffled portion.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createSession(random = Math.random) {
  return { version: 1, cycles: [shuffle(random)], cursor: 0 };
}

export function currentCard(state) {
  const cycle = Math.floor(state.cursor / 10);
  const position = state.cursor % 10;
  return { id: state.cycles[cycle][position], position, cycle };
}

export function advance(state, random = Math.random) {
  const cursor = state.cursor + 1;
  // Keep future cycles after undo. Advancing again must replay, never re-shuffle.
  const cycles = cursor < state.cycles.length * 10
    ? state.cycles
    : [...state.cycles, shuffle(random)];
  return { version: 1, cycles, cursor };
}

export function undo(state) {
  return state.cursor === 0 ? state : { ...state, cursor: state.cursor - 1 };
}

export function isValidSession(state) {
  return !!state && state.version === 1 &&
    Array.isArray(state.cycles) && state.cycles.length > 0 &&
    Number.isSafeInteger(state.cursor) && state.cursor >= 0 &&
    state.cursor < state.cycles.length * 10 &&
    state.cycles.every(deck => Array.isArray(deck) && deck.length === 10 &&
      new Set(deck).size === 10 && deck.every(id => Number.isInteger(id) && id >= 1 && id <= 10));
}

export function serialize(state) {
  if (!isValidSession(state)) throw new Error('Cannot save an invalid deck.');
  return JSON.stringify(state);
}

export function deserialize(value) {
  if (value === null || value === undefined) return null;
  try {
    const state = JSON.parse(value);
    return isValidSession(state) ? { version: 1, cycles: state.cycles, cursor: state.cursor } : null;
  } catch {
    return null;
  }
}
