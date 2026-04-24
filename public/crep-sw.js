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

// Apr 23, 2026 — bumped to v3. Dropped `/_next/static/` from the cache
// scope. Reason: that prefix is already hash-versioned by Next.js, and
// in dev mode the bundle filenames are reused across recompiles —
// which meant the SW would happily serve the OLD compiled header.tsx
// bundle (referencing an old `Brain` import) to the browser AFTER the
// dev server had compiled a fresh version. That burned 30+ minutes
// of debugging today and would have been invisible to any user who
// hit the site with a stale SW. Let the browser HTTP cache + Next's
// own hashing handle `_next/static/`; the SW only cares about the
// big geojson / icon / asset payloads.
// Bumping to v3 also forces the activate event to purge v2 on next
// load, so everyone gets fresh `_next/static/` fetches.
const CACHE_VERSION = "crep-v3"
const CACHE_NAME = `mycosoft-${CACHE_VERSION}`

// URL patterns eligible for cache-first strategy. Next.js bundles
// intentionally NOT in this list — they're hash-versioned and the SW
// caching them blocks dev iterations + traps users on old bundles.
const STATIC_PREFIXES = [
  "/data/crep/",
  "/crep/icons/",
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
  // Apr 23, 2026 RE-ENABLE skipWaiting — Morgan reported "Not Secure" +
  // massive lag persisting after prod deploy because the OLD v2 SW was
  // still active and serving its cached `/_next/static/` chunks (built
  // before the ws:// mixed-content fix). v2 won't go away until every
  // tab controlled by it closes, which on an active session never
  // happens. Force v3 to take over immediately so users get the new
  // CSP-safe bundles without having to manually clear data.
  //
  // The original reason skipWaiting was removed ("trips auto-reload
  // mid-session") only matters if successive SW versions keep shipping.
  // We're on a single-version jump from v2 → v3 for a critical security
  // fix; that's the exact case skipWaiting exists for.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1. Delete every non-v3 cache by name.
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((n) => n.startsWith("mycosoft-") && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
      // 2. Belt-and-suspenders: also delete any `/_next/static/` entries
      //    that might have lingered if a stale cache name was reused.
      //    Those chunks are the ones that had the old ws://localhost:8999
      //    reference baked in from before the PR #137 SSL fix.
      try {
        const currentCache = await caches.open(CACHE_NAME)
        const keys = await currentCache.keys()
        await Promise.all(
          keys
            .filter((req) => req.url.includes("/_next/static/"))
            .map((req) => currentCache.delete(req))
        )
      } catch {
        /* ignore — cache might be empty */
      }
      // 3. Claim all active clients so this v3 takes over immediately.
      await self.clients.claim()
    })()
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
