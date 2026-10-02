/* KPAI! service worker.
   - Precaches the app shell + the offline game pages and their JS/CSS so Practice / Vs Computer / Pass-and-Play reopen with no signal.
   - Navigations: network first with a 3 s timeout (lie-fi friendly), then cache.
   - Static assets: cache first. API / Supabase calls are never cached.
   - Cache name is versioned; old caches are pruned on activate. */
const VERSION = "v4";
const CACHE = `kpai-${VERSION}`;
const PAGES = ["/", "/play/practice", "/play/computer", "/play/pass", "/play/daily", "/how-to-play", "/tutorial", "/badges"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const assets = new Set(["/manifest.webmanifest", "/icons/icon-192.png"]);
      for (const url of PAGES) {
        try {
          const res = await fetch(url, { cache: "reload" });
          if (!res.ok) continue;
          const html = await res.clone().text();
          await cache.put(url, res);
          // pull the page's own static chunks so it works offline on first visit
          for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s)]+/g)) assets.add(m[0]);
        } catch {}
      }
      await Promise.all([...assets].map((a) => cache.add(a).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("kpai-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/audio/") || url.pathname === "/og.png";
  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      Promise.race([fetch(req), timeout(3000)])
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/") || new Response("Offline", { status: 503 }))),
    );
    return;
  }

  // RSC / data fetches: network first, cached copy if available, else a clean 503 (never HTML for a non-page request)
  event.respondWith(fetch(req).catch(() => caches.match(req).then((hit) => hit || new Response("", { status: 503 }))));
});
