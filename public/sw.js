const CACHE_NAME = 'stayhub-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  // Add core pages or fallback UI paths here if needed
];

// 1. Install Event: Cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Serve from cache first, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like Supabase API calls or analytics)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version, but try to fetch latest in the background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {/* Ignore network errors during background revalidation */});

        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).catch(() => {
        // Optional: Return a custom fallback offline page for HTML navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
