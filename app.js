import { CARDS, COLOURS, groupCard, validateCards } from './data.js';
import { STORAGE_KEY, createSession, currentCard, advance, undo, serialize, deserialize } from './deck.js';

const $ = id => document.getElementById(id);
let state = null;
let saveFailed = false;

function notice(message) {
  $('notice').textContent = message;
  $('notice').hidden = false;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state));
    if (saveFailed) $('notice').hidden = true;
    saveFailed = false;
  } catch {
    saveFailed = true;
    notice('Your deck works, but this browser cannot save it. Keep the app open to preserve this session.');
  }
}

// Original front-facing helmet drawing. No artwork from the physical cards is used.
function helmet(colour, speed) {
  return `<svg class="helmet" viewBox="0 0 90 94" aria-hidden="true" focusable="false">
    <path d="M13 73V43C13 20 25 7 45 7s32 13 32 36v30l-13 9-7-24H33l-7 24Z" fill="${colour.paint}" stroke="${colour.outline}" stroke-width="2.7" stroke-linejoin="round"/>
    <path d="M41 9h8v19h-8Z" fill="#ffffff" opacity=".3"/>
    <path d="M19 35h52v18l-15 7H34l-15-7Z" fill="#202d35"/>
    <path d="M23 38h44v5H23Z" fill="#acc6c6" opacity=".42"/>
    <path d="M18 62v9m54-9v9" stroke="#ffffff" stroke-width="2" opacity=".3"/>
    <text class="helmet-speed" x="44" y="83" text-anchor="middle">${speed}</text>
  </svg>`;
}

function render() {
  const playing = state !== null;
  $('start-screen').hidden = playing;
  $('game-screen').hidden = !playing;
  $('new-game').hidden = !playing;
  if (!playing) return;

  const { id, position } = currentCard(state);
  const card = CARDS[id - 1];
  $('bonus-grid').innerHTML = groupCard(card).map((cars, bonus) => `
    <span class="bonus-column" data-bonus="${bonus}">
      <span class="bonus-heading"><span class="bonus-label">BONUS</span><span class="bonus-number">${bonus}</span></span>
      <span class="car-stack">${cars.map(car => {
        const colour = COLOURS.find(item => item.id === car.colour);
        return `<span class="car-token" data-colour="${car.colour}" data-speed="${car.speed}">
          ${helmet(colour, car.speed)}<span class="car-name">${colour.name}</span></span>`;
      }).join('')}</span>
    </span>`).join('');
  $('card-counter').textContent = `Card ${position + 1} / 10`;
  $('undo').disabled = state.cursor === 0;
  const summary = groupCard(card).map((cars, bonus) => `Bonus ${bonus}: ${cars.map(car => `${car.colour} ${car.speed}`).join(', ') || 'none'}`).join('. ');
  $('race-card').setAttribute('aria-label', `Legends card. ${summary}. Tap to draw the next card.`);
  $('announcement').textContent = `Card ${position + 1} of 10. ${summary}.`;
}

function startGame() {
  state = createSession();
  save();
  render();
  $('race-card').focus({ preventScroll: true });
}

$('start').addEventListener('click', startGame);
$('race-card').addEventListener('click', () => {
  state = advance(state);
  save();
  render();
});
$('race-card').addEventListener('keydown', event => {
  if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
});
$('undo').addEventListener('click', () => {
  state = undo(state);
  save();
  render();
  if ($('undo').disabled) $('race-card').focus({ preventScroll: true });
});
$('new-game').addEventListener('click', () => {
  // Escape must cancel even when the previous dialog was confirmed.
  $('new-game-dialog').returnValue = '';
  $('new-game-dialog').showModal();
});
$('new-game-dialog').addEventListener('close', () => {
  if ($('new-game-dialog').returnValue === 'new') startGame();
});

$('cover-colours').innerHTML = COLOURS.map(colour => `<span style="--paint:${colour.paint}"></span>`).join('');

const errors = validateCards();
if (errors.length) {
  $('start').disabled = true;
  notice('The card data could not be validated. Please reload the app.');
  console.error(errors);
} else {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    state = deserialize(stored);
    if (stored && !state) notice('The saved deck could not be restored. Tap Start to begin a fresh game.');
  } catch {
    notice('This browser cannot save your deck. You can still play while the app stays open.');
  }
  render();
}

// Save on every action, not just on exit: mobile browsers can stop without an unload event.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state) save();
});
window.addEventListener('pagehide', () => { if (state) save(); });

function setOfflineStatus(ready, label) {
  $('offline-status').dataset.ready = String(ready);
  $('offline-status').replaceChildren(Object.assign(document.createElement('span')), document.createTextNode(label));
}

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').then(async registration => {
    // An installing worker is not a promise of offline availability. Wait for activation.
    await navigator.serviceWorker.ready;
    setOfflineStatus(true, 'Ready offline');
    if (registration.waiting) setOfflineStatus(true, 'Update ready · reopen to apply');
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setOfflineStatus(true, 'Update ready · close & reopen');
        }
      });
    });
  }).catch(() => setOfflineStatus(false, 'Offline setup unavailable'));
} else {
  setOfflineStatus(false, 'Use HTTPS to enable offline');
}
