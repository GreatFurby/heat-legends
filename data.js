// The approved dataset. Keep the original colour order and all values unchanged.
export const COLOURS = Object.freeze([
  { id: 'red', name: 'Red', paint: '#d94343', outline: '#8c262d' },
  { id: 'blue', name: 'Blue', paint: '#267bd1', outline: '#1b4a82' },
  { id: 'green', name: 'Green', paint: '#1b996c', outline: '#176348' },
  { id: 'yellow', name: 'Yellow', paint: '#f2ce43', outline: '#8d742c' },
  { id: 'black', name: 'Black', paint: '#252b32', outline: '#85929c' },
  { id: 'grey', name: 'Grey', paint: '#929da9', outline: '#52606f' },
  { id: 'purple', name: 'Purple', paint: '#9759c9', outline: '#643b8a' },
  { id: 'orange', name: 'Orange', paint: '#ef873a', outline: '#a65729' },
  { id: 'white', name: 'White', paint: '#fffef6', outline: '#9aa4ac' },
].map(Object.freeze));

const SPEEDS = [
  [10, 17, 16, 19, 13, 12, 15, 11, 18],
  [17, 16, 12, 13, 18, 19, 14, 10, 11],
  [11, 14, 10, 15, 17, 13, 12, 18, 19],
  [18, 13, 19, 14, 15, 11, 16, 12, 17],
  [15, 12, 18, 17, 14, 16, 11, 13, 10],
  [12, 19, 14, 16, 11, 10, 13, 17, 15],
  [16, 15, 11, 18, 10, 17, 19, 14, 13],
  [14, 10, 13, 12, 19, 18, 17, 15, 16],
  [19, 11, 17, 10, 12, 15, 18, 16, 14],
  [13, 18, 15, 11, 16, 14, 10, 19, 12],
];

export function bonusFor(speed) {
  if (!Number.isInteger(speed) || speed < 10 || speed > 19) {
    throw new RangeError('A Legends speed must be an integer from 10 to 19.');
  }
  return speed <= 11 ? 0 : speed <= 14 ? 1 : speed <= 17 ? 2 : 3;
}

export const CARDS = Object.freeze(SPEEDS.map((row, index) => Object.freeze({
  id: index + 1,
  cars: Object.freeze(row.map((speed, colourIndex) => Object.freeze({
    colour: COLOURS[colourIndex].id,
    speed,
    bonus: bonusFor(speed),
  }))),
})));

export function groupCard(card) {
  return [0, 1, 2, 3].map(bonus => card.cars
    .filter(car => car.bonus === bonus)
    .sort((a, b) => a.speed - b.speed));
}

// Also callable from Node: this deliberately fails loudly if data is edited incorrectly.
export function validateCards(cards = CARDS) {
  const errors = [];
  const names = COLOURS.map(colour => colour.id);
  if (cards.length !== 10) errors.push('The deck must contain exactly 10 cards.');
  if (new Set(cards.map(card => card.id)).size !== 10 ||
      cards.some(card => !Number.isInteger(card.id) || card.id < 1 || card.id > 10)) {
    errors.push('Card IDs must be 1 through 10 exactly once.');
  }
  for (const card of cards) {
    if (card.cars.length !== 9 || names.some(name => card.cars.filter(car => car.colour === name).length !== 1)) {
      errors.push(`Card ${card.id} must contain each of the nine colours once.`);
    }
    if (new Set(card.cars.map(car => car.speed)).size !== 9) {
      errors.push(`Card ${card.id} has duplicate speeds.`);
    }
    for (const car of card.cars) {
      try {
        if (car.bonus !== bonusFor(car.speed)) errors.push(`Card ${card.id} has an incorrect bonus.`);
      } catch {
        errors.push(`Card ${card.id} has a speed outside 10–19.`);
      }
    }
  }
  for (const name of names) {
    const cars = cards.flatMap(card => card.cars.filter(car => car.colour === name));
    const speeds = cars.map(car => car.speed).sort((a, b) => a - b);
    if (speeds.join(',') !== '10,11,12,13,14,15,16,17,18,19') errors.push(`${name} must receive every speed once.`);
    if (speeds.reduce((sum, speed) => sum + speed, 0) !== 145) errors.push(`${name} must total 145 speed.`);
    if ([0, 1, 2, 3].map(bonus => cars.filter(car => car.bonus === bonus).length).join(',') !== '2,3,3,2') {
      errors.push(`${name} has an incorrect bonus distribution.`);
    }
  }
  return errors;
}
