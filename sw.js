// Bump this version whenever ANY cached file changes. New workers wait until all
// old app windows close, avoiding mixed JavaScript/data versions during a race.
const CACHE_PREFIX = `heat-legends:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v1.0.0`;
const APP_FILES = [
  './', './index.html', './styles.css', './app.js', './data.js', './deck.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png',
  './icons/icon-512.png', './icons/maskable-512.png',
];
const ROOT = new URL('./', self.location.href).href;
const APP_URLS = new Set(APP_FILES.map(path => new URL(path, ROOT).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Atomic install: activation only follows a successful complete cache.
    await cache.addAll(APP_FILES.map(path => new Request(new URL(path, ROOT), { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== new URL(ROOT).origin || !url.href.startsWith(ROOT)) return;
  // Never intercept sign-in, other sites, downloads, or unrelated URL paths.
  const canonical = new URL(url.href);
  canonical.search = '';
  canonical.hash = '';
  if (!APP_URLS.has(canonical.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(canonical.href);
    if (cached) return cached;
    // This path is only needed if a browser has evicted some cached bytes.
    const response = await fetch(event.request);
    if (response.ok && response.type !== 'opaque') await cache.put(canonical.href, response.clone());
    return response;
  })());
});
