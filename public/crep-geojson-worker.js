/**
 * CREP GeoJSON Web Worker — Apr 23, 2026
 *
 * Morgan: "crep locally is supper laggy". Parsing 76k-substation / 52k-txlines
 * / 27k-EIA geojson on the main thread blocks paints for 200-500 ms apiece.
 * Offloading JSON.parse + shape validation into a worker frees the main
 * thread to keep maplibre-gl + React responsive during the initial data load.
 *
 * Protocol (postMessage)
 *   client → worker: { id, url, minFeatureCount?, maxBytes? }
 *   worker → client: { id, ok: true,  featureCollection, bytes, durationMs }
 *                 OR { id, ok: false, error, bytes?, durationMs }
 *
 * The worker fetches the URL itself (saves a second network round-trip for
 * transferring the body back and forth as a string), parses, optionally
 * drops empty features / geometries, and ships the full FeatureCollection
 * back. Posting the FC across the thread boundary is the only real cost
 * (~30 ms for a 4 MB geojson); the parse + validation stay off the main
 * thread entirely.
 */

self.addEventListener("message", async (event) => {
  const { id, url, minFeatureCount = 1, maxBytes = 500 * 1024 * 1024 } = event.data || {}
  if (!id || !url) {
    self.postMessage({ id, ok: false, error: "missing id or url" })
    return
  }
  const start = performance.now()
  try {
    const res = await fetch(url, { cache: "force-cache" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const cl = Number(res.headers.get("content-length") || 0)
    if (cl > maxBytes) throw new Error(`size ${cl}B exceeds cap ${maxBytes}B`)
    const text = await res.text()
    if (text.length > maxBytes) throw new Error(`body ${text.length}B exceeds cap ${maxBytes}B`)
    const json = JSON.parse(text)
    if (!json || json.type !== "FeatureCollection" || !Array.isArray(json.features)) {
      throw new Error("not a FeatureCollection")
    }
    // Cheap in-worker cleanup: drop features with no geometry
    const validFeatures = []
    for (const f of json.features) {
      if (!f || !f.geometry) continue
      if (f.geometry.type === "Point") {
        const c = f.geometry.coordinates
        if (!Array.isArray(c) || c.length < 2 || !isFinite(c[0]) || !isFinite(c[1])) continue
      }
      validFeatures.push(f)
    }
    if (validFeatures.length < minFeatureCount) {
      throw new Error(`only ${validFeatures.length} valid features (< ${minFeatureCount})`)
    }
    const out = { type: "FeatureCollection", features: validFeatures }
    const durationMs = performance.now() - start
    self.postMessage({
      id,
      ok: true,
      featureCollection: out,
      bytes: text.length,
      featureCount: validFeatures.length,
      durationMs,
    })
  } catch (err) {
    const durationMs = performance.now() - start
    self.postMessage({
      id,
      ok: false,
      error: (err && err.message) || "worker-failed",
      durationMs,
    })
  }
})
