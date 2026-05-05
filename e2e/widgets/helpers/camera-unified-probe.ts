import { request } from "@playwright/test"

let cachedSkip: boolean | null = null

/**
 * True when POST /api/search/unified returns no camera rows for the canonical matrix query.
 * Cached for the worker so multiple specs share one probe.
 *
 * Cameras require MINDEX `eagle_video` (internal token) and/or outbound HTTPS to a public Overpass instance.
 */
export async function shouldSkipCameraWidgetE2e(): Promise<boolean> {
  if (process.env.E2E_FORCE_CAMERA_MATRIX === "1") return false
  if (cachedSkip !== null) return cachedSkip

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3010"
  const ctx = await request.newContext({ baseURL })
  try {
    const res = await ctx.post("/api/search/unified", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "traffic cameras Paris", types: ["cameras"], limit: 6 }),
      timeout: 40_000,
    })
    if (!res.ok()) {
      cachedSkip = true
      return true
    }
    const j = (await res.json()) as { results?: { cameras?: unknown[] } }
    const raw = j?.results?.cameras
    const rows = Array.isArray(raw) ? raw : []
    const n = rows.filter((c) => {
      if (!c || typeof c !== "object") return false
      const o = c as { lat?: unknown; lng?: unknown; title?: unknown; id?: unknown }
      if (!Number.isFinite(Number(o.lat)) || !Number.isFinite(Number(o.lng))) return false
      const title = String(o.title ?? "").trim()
      const id = String(o.id ?? "").trim()
      return title.length > 0 || id.length > 0
    }).length
    cachedSkip = n === 0
    return cachedSkip
  } catch {
    cachedSkip = true
    return true
  } finally {
    await ctx.dispose()
  }
}
