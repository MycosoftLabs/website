"use client";

/**
 * Run `ensure` once the MapLibre style is ready, then detach.
 *
 * THE BUG THIS FIXES: layer components are gated to mount only AFTER the base <Map>'s
 * "load" event has fired. So `map.once("load", ensure)` inside them NEVER fires (load
 * already happened) — and if `map.isStyleLoaded()` happens to read false at mount, the
 * layer is silently never added. Symptom: the basemap shows but no data layers, and it's
 * intermittent (depends on style-load timing). Here we run immediately if ready, else wait
 * on "idle"/"styledata" (which DO keep firing as the map renders) and run once when ready.
 *
 * `ensure` MUST be idempotent (guard addSource/addLayer with getSource/getLayer) — it can
 * be invoked more than once. Returns a detach fn to call from the effect cleanup.
 */
export function runWhenStyleReady(map: any, ensure: () => void): () => void {
  if (!map) return () => {};
  if (map.isStyleLoaded?.()) {
    ensure();
    return () => {};
  }
  let done = false;
  const handler = () => {
    if (done) return;
    if (map.isStyleLoaded?.()) {
      done = true;
      ensure();
      off();
    }
  };
  const off = () => {
    try {
      map.off("idle", handler);
      map.off("styledata", handler);
    } catch {
      /* map torn down */
    }
  };
  map.on("idle", handler);
  map.on("styledata", handler);
  return off;
}
