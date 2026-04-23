/**
 * CREP Service Worker — Apr 23, 2026
 *
 * Morgan: "crep locally is supper laggy now even slowing my pc down we need
 * to figure out how to cram all of this data into way faster loading
 * rendering not memory eating and not slowing any users pc or memory
 * locking this should be video game worthy".
 *
 * Cache-first for the big static assets the CREP dashboard slurps on page
 * load. Target: second-visit page load reaches interactive in <500 ms
 * because the browser never touches the network for any of these.
 *
 * Scope
 *   /data/crep/**            — baked geojson (NYC iNat 4.5 MB, DC iNat 4.5 MB,
 *                              15-metro × 11-category files ~8 MB total, plus
 *                              eagle-cameras-registry 2 MB, cell-towers-global
 *                              90 MB, transmission-lines-us 76 MB, etc.)
 *   /data/crep/**.pmtiles    — vector-tile pyramids (when Cursor's tile-bake
 *                              pipeline lands, all heavy layers shift to this)
 *   /crep/icons/**           — aircraft / vessel / satellite / helicopter SVG
 *                              sprites
 *   /_next/static/**         — Next.js build-hashed static chunks
 *
 * Anything else passes through untouched (API calls, SSE streams, tiles
 * from CDN, maplibre basemap tiles). We DON'T cache /api/* — live data has
 * to stay live.
 *
 * Versioning
 *   Bump CACHE_VERSION when a baked file format changes. Old caches are
 *   purged in the `activate` event.
 */

const CACHE_VERSION = "crep-v2"
const CACHE_NAME = `mycosoft-${CACHE_VERSION}`

// URL patterns eligible for cache-first strategy.
const STATIC_PREFIXES = [
  "/data/crep/",
  "/crep/icons/",
  "/_next/static/",
  "/assets/",
]

function isCacheable(url) {
  try {
    const u = new URL(url)
    if (u.origin !== self.location.origin) return false
    return STATIC_PREFIXES.some((p) => u.pathname.startsWith(p))
  } catch {
    return false
  }
}

self.addEventListener("install", (event) => {
  // Apr 23, 2026 — removed `skipWaiting()` (was tripping the auto-reload
  // Morgan reported on prod). Without it, a NEW SW waits in the
  // `installed` state until every tab controlled by the OLD SW closes.
  // Tab refresh / navigation naturally picks up the new SW; nothing
  // yanks control out from under an active session mid-click.
  // If we ever need a forced update, it's one `navigator.serviceWorker
  // .getRegistration().update()` call from the app, not automatic.
})

self.addEventListener("activate", (event) => {
  // Apr 23, 2026 — removed `clients.claim()` for the same reason. The
  // new SW only takes over clients that have navigated AFTER it
  // activated. No forced hostile takeover of in-flight requests.
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith("mycosoft-") && n !== CACHE_NAME)
            .map((n) => caches.delete(n)),
        ),
      ),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  if (!isCacheable(req.url)) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(req)
      if (cached) {
        // Background revalidate — fetches fresh copy without blocking.
        // Doesn't run for immutable `_next/static` because the hash in the
        // URL guarantees equivalence.
        if (!req.url.includes("/_next/static/")) {
          event.waitUntil(
            fetch(req)
              .then((res) => {
                if (res && res.ok) cache.put(req, res.clone())
              })
              .catch(() => {}),
          )
        }
        return cached
      }
      try {
        const res = await fetch(req)
        if (res && res.ok) {
          cache.put(req, res.clone()).catch(() => {})
        }
        return res
      } catch (err) {
        // Offline fallback — return whatever we have in cache (even if no
        // match for the exact request), or a minimal JSON error.
        const any = await cache.match(req, { ignoreSearch: true })
        if (any) return any
        return new Response(
          JSON.stringify({ error: "offline", url: req.url }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        )
      }
    })(),
  )
})
