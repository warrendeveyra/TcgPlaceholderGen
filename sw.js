// Service Worker for TCG Master Set Generator
// BUILD_TIMESTAMP is replaced during Vite build for proper cache invalidation
const BUILD_TIMESTAMP = '__BUILD_TIMESTAMP__';
const CACHE_VERSION = 'v5-' + BUILD_TIMESTAMP;
const CACHE_NAME = 'tcg-gen-' + CACHE_VERSION;
const BASE_PATH = self.location.pathname.includes('/TcgPlaceholderGen/') ? '/TcgPlaceholderGen/' : '/';

// Assets to cache on install (minimal - just the shell)
const urlsToCache = [
    BASE_PATH,
    BASE_PATH + 'index.html',
];

// Install event - cache core files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing new version:', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
    // Force this SW to become active immediately
    self.skipWaiting();
});

// Activate event - AGGRESSIVELY clean up ALL old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating new version:', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete ALL old tcg-gen caches, not just the previous version
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('tcg-gen-')) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Take control of all pages immediately
    self.clients.claim();

    // Notify all clients about the update
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
    });
});

// Helper: Check if this is a hashed asset (Vite generates these)
function isHashedAsset(url) {
    // Vite hashed assets look like: /assets/index-abc123.js or chunk-XYZ123.css
    return url.pathname.match(/\/assets\/.*-[a-zA-Z0-9]{8,}\.(js|css)$/);
}

// Helper: Clear all caches and reload clients
async function clearAllCachesAndReload() {
    console.log('[SW] Clearing all caches due to stale asset');
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    // Notify clients to reload
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'CACHE_CLEARED', reason: 'stale_asset' });
    });
}

// Fetch event - NETWORK-FIRST for JS/CSS, cache-first for images only
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and non-http/https protocols
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
        return;
    }

    const url = new URL(event.request.url);

    // 1. Bypass all caching for development
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return;
    }

    // 2. Network-first for HTML pages (always get latest)
    if (event.request.mode === 'navigate' ||
        event.request.destination === 'document' ||
        url.pathname.endsWith('.html') ||
        url.pathname === BASE_PATH ||
        url.pathname === BASE_PATH.slice(0, -1)) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // 3. NETWORK-FIRST for JS/CSS files (critical for avoiding stale code)
    if (event.request.destination === 'script' ||
        event.request.destination === 'style' ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(async () => {
                    // Network failed - try cache
                    const cached = await caches.match(event.request);
                    if (cached) {
                        return cached;
                    }
                    // If this is a hashed asset that doesn't exist, the app is stale
                    if (isHashedAsset(url)) {
                        console.warn('[SW] Stale hashed asset detected:', url.pathname);
                        clearAllCachesAndReload();
                    }
                    throw new Error('No cache available for ' + url.pathname);
                })
        );
        return;
    }

    // 4. Cache-first for images (they don't change)
    if (event.request.destination === 'image' ||
        url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico)$/i)) {
        event.respondWith(
            caches.match(event.request)
                .then((cached) => {
                    if (cached) return cached;
                    return fetch(event.request).then((response) => {
                        if (response.ok || response.type === 'opaque') {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return response;
                    });
                })
        );
        return;
    }

    // 5. Network-first for everything else (API calls, fonts, etc.)
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        clearAllCachesAndReload();
    }
});
