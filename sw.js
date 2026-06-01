const CACHE_NAME = 'lore-counter-v11';
const BASE = '/lore-counter';
const ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/style.css`,
  `${BASE}/app.js`,
  `${BASE}/manifest.json`,
  `${BASE}/assets/lato.css`,
  `${BASE}/assets/lato-300.ttf`,
  `${BASE}/assets/lato-400.ttf`,
  `${BASE}/assets/lato-700.ttf`,
  `${BASE}/assets/fa.css`,
  `${BASE}/assets/webfonts/fa-solid-900.woff2`,
  `${BASE}/assets/webfonts/fa-solid-900.ttf`,
  `${BASE}/assets/webfonts/fa-regular-400.woff2`,
  `${BASE}/assets/webfonts/fa-regular-400.ttf`,
  `${BASE}/assets/losango_alongado_illuminary_gold.svg`,
  `${BASE}/assets/divider.svg`,
  `${BASE}/assets/background.jpg`,
  `${BASE}/assets/exception.png`,
  `${BASE}/assets/DLC_Logo_Medium_RGB.png`,
];

// Install: pre-cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
  // Notify all clients to reload so they get the new version immediately
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
  });
});

// Fetch: stale-while-revalidate for all requests
// Serves from cache immediately (works offline), updates cache in background
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        // Return cached version immediately if available, otherwise wait for network
        return cached || fetchPromise;
      })
    )
  );
});
