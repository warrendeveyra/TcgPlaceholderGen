// Service Worker for TCG Master Set Generator
// Version is automatically updated during build - change this to force update
const CACHE_VERSION = 'v4-' + new Date().toISOString().split('T')[0];
const CACHE_NAME = 'tcg-gen-' + CACHE_VERSION;
const BASE_PATH = '/TcgPlaceholderGen/';

// Assets to cache on install
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

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating new version:', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
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

// Fetch event - Network-first for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and non-http/https protocols (e.g. chrome-extension)
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
        return;
    }

    const url = new URL(event.request.url);

    // Network-first for HTML pages (always get latest)
    if (event.request.mode === 'navigate' ||
        event.request.destination === 'document' ||
        url.pathname.endsWith('.html') ||
        url.pathname === BASE_PATH ||
        url.pathname === BASE_PATH.slice(0, -1)) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache the new version
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache-first for other assets (JS, CSS, images)
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then((response) => {
                    // Check if we should cache this response
                    // We cache:
                    // 1. Success responses (200) from our own origin (basic)
                    // 2. Successful CORS responses from TCGdex CDN
                    // 3. Opaque responses for images (status 0) from allowed CDNs
                    const isAllowedCdn = url.hostname.includes('tcgdex.net') || url.hostname.includes('googleusercontent.com');
                    const isImage = event.request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|svg|webp)$/i);

                    const shouldCache =
                        (response.status === 200 && (response.type === 'basic' || response.type === 'cors')) ||
                        (response.status === 0 && isAllowedCdn && isImage);

                    if (!shouldCache) {
                        return response;
                    }

                    // Cache the fetched resource
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                });
            })
    );
});

// Listen for skip waiting message from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
