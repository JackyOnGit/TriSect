const CACHE_NAME = 'trisect-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-first for Firebase/API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Network-first for Firebase API calls (use endsWith to prevent subdomain spoofing)
  if (
    url.hostname.endsWith('.firebaseio.com') ||
    url.hostname === 'firebaseio.com' ||
    url.hostname.endsWith('.googleapis.com') ||
    url.hostname === 'googleapis.com'
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for same-origin static assets (JS, CSS, images, fonts)
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

// Cache-first strategy: serve from cache, fall back to network and cache result
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return the cached index.html as offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline – content not available', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Network-first strategy: try network, fall back to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline – data not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
