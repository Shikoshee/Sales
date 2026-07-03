const CACHE_NAME = "inventra-v3";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./Home Stock.html",
  "./Stock.html",
  "./Sell.html",
  "./sales_report.html",
  "./debts.html",
  "./manage_user.html",
  "./user_stock.html",
  "./admin_dashboard.html",
  "./user_dashboard.html",
  "./manifest.json",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        FILES_TO_CACHE.map(f =>
          cache.add(f).catch(err => console.warn("Could not cache:", f, err))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("supabase.co"))         return;
  if (event.request.url.includes("cdn.jsdelivr.net"))    return;
  if (event.request.url.includes("cdnjs.cloudflare.com")) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache + silently refresh in background
        fetch(event.request).then(res => {
          if (res?.ok)
            caches.open(CACHE_NAME).then(c => c.put(event.request, res));
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then(res => {
        if (res?.ok) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        }
        return res;
      }).catch(() => new Response(`
        <!DOCTYPE html><html><head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Offline – Inventra</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Arial,sans-serif;background:#f4f6f9;display:flex;
               flex-direction:column;align-items:center;justify-content:center;
               min-height:100vh;text-align:center;padding:24px}
          .icon{font-size:72px;margin-bottom:16px}
          h1{color:#0f172a;margin-bottom:8px}
          p{color:#64748b;margin-bottom:24px;line-height:1.6}
          a{background:#2563eb;color:#fff;padding:12px 28px;
            border-radius:10px;text-decoration:none;font-weight:700}
        </style></head><body>
        <div class="icon">📦</div>
        <h1>Inventra</h1>
        <p>You are offline.<br>Previously visited pages are still available.</p>
        <a href="./index.html">Open App</a>
        </body></html>`,
        { status:200, headers:{ "Content-Type":"text/html" } }
      ));
    })
  );
});
