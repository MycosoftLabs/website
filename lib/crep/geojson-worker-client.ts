/**
 * Client helper that talks to public/crep-geojson-worker.js
 *
 * Usage:
 *   import { fetchGeoJsonInWorker } from "@/lib/crep/geojson-worker-client"
 *
 *   const fc = await fetchGeoJsonInWorker("/data/crep/substations.geojson")
 *   if (fc) map.addSource("crep-substations", { type: "geojson", data: fc })
 *
 * Returns `null` on any failure — caller should fall back to whatever
 * synchronous loader it was using before so this stays a pure optimization.
 */

let workerRef: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (fc: any) => void; reject: (err: Error) => void }>()

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null
  if (workerRef) return workerRef
  try {
    workerRef = new Worker("/crep-geojson-worker.js")
    workerRef.addEventListener("message", (ev) => {
      const { id, ok, featureCollection, error, featureCount, bytes, durationMs } = ev.data || {}
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      if (ok) {
        // eslint-disable-next-line no-console
        console.log(
          `[CREP/worker] parsed ${featureCount ?? 0} features (${Math.round((bytes ?? 0) / 1024)} KB) in ${Math.round(durationMs ?? 0)} ms`,
        )
        p.resolve(featureCollection)
      } else {
        p.reject(new Error(error || "worker error"))
      }
    })
    workerRef.addEventListener("error", (e) => {
      // eslint-disable-next-line no-console
      console.warn("[CREP/worker] worker error:", (e as any)?.message)
    })
    return workerRef
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[CREP/worker] Worker construct failed:", (e as Error)?.message)
    return null
  }
}

export async function fetchGeoJsonInWorker(
  url: string,
  opts?: { minFeatureCount?: number; maxBytes?: number; timeoutMs?: number },
): Promise<GeoJSON.FeatureCollection | null> {
  const w = getWorker()
  if (!w) return null
  const id = nextId++
  const timeoutMs = opts?.timeoutMs ?? 30_000
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error("worker timeout"))
      }
    }, timeoutMs)
    try {
      w.postMessage({
        id,
        url,
        minFeatureCount: opts?.minFeatureCount ?? 1,
        maxBytes: opts?.maxBytes,
      })
    } catch (e) {
      clearTimeout(timer)
      pending.delete(id)
      reject(e as Error)
      return
    }
  }).then(
    (fc) => fc as GeoJSON.FeatureCollection,
    () => null,
  )
}
