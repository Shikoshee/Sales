const CACHE_NAME = "inventra-v1";

// All pages and assets to cache on install
const PAGES_TO_CACHE = [
  "./",
  "./Stock.html",
  "./Sell.html",
  "./sales_report.html",
  "./debts.html",
  "./manage_user.html",
  "./user_stock.html",
  "./admin_dashboard.html",
  "./user_dashboard.html",
  "./Home Stock.html",
  "./login.html"
];

// ── Install: cache all pages ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("✅ Caching app pages...");
      // Cache each page individually so one failure doesn't break all
      return Promise.allSettled(
        PAGES_TO_CACHE.map(page =>
          cache.add(page).catch(err =>
            console.warn(`Could not cache ${page}:`, err)
          )
        )
      );
    })
  );
  // Take control immediately without waiting
  self.skipWaiting();
});

// ── Activate: clean up old caches ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("🗑 Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache, fall back to network ──
self.addEventListener("fetch", event => {

  // Skip non-GET requests and Supabase API calls
  // (Supabase handles its own offline behaviour)
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("supabase.co")) return;
  if (event.request.url.includes("cdn.jsdelivr.net")) return;
  if (event.request.url.includes("cdnjs.cloudflare.com")) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {

      if (cachedResponse) {
        // Serve from cache immediately
        // Also fetch fresh copy in background to update cache
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          })
          .catch(() => {}); // Silently fail if offline

        return cachedResponse;
      }

      // Not in cache — try network
      return fetch(event.request)
        .then(networkResponse => {
          // Cache the new response for next time
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Completely offline and not cached
          // Return a simple offline fallback page
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline - Inventra</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: #f4f6f9;
                    color: #333;
                    text-align: center;
                    padding: 20px;
                  }
                  h1 { font-size: 2rem; color: #007BFF; margin-bottom: 10px; }
                  p  { color: #666; margin-bottom: 20px; }
                  a  {
                    background: #007BFF; color: white;
                    padding: 12px 24px; border-radius: 8px;
                    text-decoration: none; font-weight: bold;
                  }
                </style>
              </head>
              <body>
                <h1>📦 Inventra</h1>
                <p>You're offline. Please check your internet connection.</p>
                <p>Previously visited pages are available — try navigating back.</p>
                <a href="./Stock.html">Go to Stock</a>
              </body>
            </html>`,
            {
              status: 200,
              headers: { "Content-Type": "text/html" }
            }
          );
        });
    })
  );
});