import { request } from "@playwright/test"

let cachedSkip: boolean | null = null

/**
 * True when POST /api/search/unified returns no weather rows for a canonical probe.
 * Cached per worker. Forecasts need outbound HTTPS to the configured weather provider from the Next server.
 */
export async function shouldSkipWeatherWidgetE2e(): Promise<boolean> {
  if (process.env.E2E_FORCE_WEATHER_MATRIX === "1") return false
  if (cachedSkip !== null) return cachedSkip

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3010"
  const ctx = await request.newContext({ baseURL })
  try {
    const res = await ctx.post("/api/search/unified", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "weather in Tokyo", types: ["weather"], limit: 8 }),
      timeout: 45_000,
    })
    if (!res.ok()) {
      cachedSkip = true
      return true
    }
    const j = (await res.json()) as { results?: { weather?: unknown[] } }
    const raw = j?.results?.weather
    const rows = Array.isArray(raw) ? raw : []
    const n = rows.filter((w) => w && typeof w === "object").length
    cachedSkip = n === 0
    return cachedSkip
  } catch {
    cachedSkip = true
    return true
  } finally {
    await ctx.dispose()
  }
}
