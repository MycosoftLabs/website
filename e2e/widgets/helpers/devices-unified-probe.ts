import { request } from "@playwright/test"

let cachedSkip: boolean | null = null

/**
 * True when POST /api/search/unified returns no device rows for a canonical probe query.
 * Cached per worker. Devices require MAS device registry / MycoBrain heartbeats on the LAN under test.
 */
export async function shouldSkipDevicesWidgetE2e(): Promise<boolean> {
  if (process.env.E2E_FORCE_DEVICES_MATRIX === "1") return false
  if (cachedSkip !== null) return cachedSkip

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3010"
  const ctx = await request.newContext({ baseURL })
  try {
    const res = await ctx.post("/api/search/unified", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "network devices status", types: ["devices"], limit: 12 }),
      timeout: 40_000,
    })
    if (!res.ok()) {
      cachedSkip = true
      return true
    }
    const j = (await res.json()) as { results?: { devices?: unknown[] } }
    const raw = j?.results?.devices
    const rows = Array.isArray(raw) ? raw : []
    const n = rows.filter((d) => d && typeof d === "object").length
    cachedSkip = n === 0
    return cachedSkip
  } catch {
    cachedSkip = true
    return true
  } finally {
    await ctx.dispose()
  }
}
