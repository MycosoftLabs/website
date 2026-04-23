/**
 * DEPRECATED — self-unregistering stub. Apr 23, 2026.
 *
 * Morgan: "why is local refreshing on its own still we cannot ever have
 * that happen when a user is doing something using crep it makes the
 * work go away".
 *
 * The narrow /data/crep/* cache this SW used to provide is now handled
 * by /crep-sw.js (CREP SW v2, full scope: /data/crep/* + /crep/icons/*
 * + /_next/static/*). Running both in parallel at scope "/" meant every
 * deploy registered a new /crep-sw.js that called `skipWaiting()` +
 * `clients.claim()` and stole control from the running /sw-crep-data.js,
 * which occasionally tripped a Next.js chunk resolution failure and
 * triggered the error-boundary's `window.location.reload()`.
 *
 * This file now exists only to cleanly retire the old registration for
 * any browser that still has it installed. On install it drops its own
 * cache and unregisters itself; after that the browser will only see
 * /crep-sw.js and stop flipping controllers.
 */
self.addEventListener("install", () => {
  self.skipWaiting()
})
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      try { await caches.delete("crep-geojson-v1") } catch { /* ignore */ }
      try { await self.registration.unregister() } catch { /* ignore */ }
    })(),
  )
})
// No fetch handler — all requests pass straight through to the network
// (or the newer /crep-sw.js once it's in control).
