import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MINDEX = (process.env.MINDEX_API_URL || "http://192.168.0.189:8000").replace(/\/$/, "")
const INAT = "https://api.inaturalist.org/v1/taxa"

async function probeJson(url: string, ms = 2500): Promise<{ ok: boolean; body: unknown }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" })
    const body = await res.json().catch(() => null)
    return { ok: res.ok, body }
  } catch {
    return { ok: false, body: null }
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") || "").trim()
  const kind = request.nextUrl.searchParams.get("kind") || "plant"
  if (!q) {
    return NextResponse.json({
      live: false,
      query: "",
      mindex: { bind: "UNBOUND", hits: [], detail: "empty query" },
      inaturalist: { bind: "UNBOUND", hits: [], detail: "empty query" },
      mineral: { bind: "UNBOUND", hits: [], detail: "empty query" },
      label: "unknown / not in MINDEX",
      invented: false,
    })
  }

  const mindexHealth = await probeJson(`${MINDEX}/api/mindex/health`)
  const encoded = encodeURIComponent(q)
  const mindexSearch = mindexHealth.ok
    ? await probeJson(`${MINDEX}/api/mindex/search?q=${encoded}&limit=5`)
    : { ok: false, body: null }

  const inatKey = process.env.INATURALIST_API_KEY
  const inatUrl = `${INAT}?q=${encoded}&per_page=5`
  const inat = kind === "mineral" ? { ok: false, body: null } : await probeJson(inatUrl)

  const mineral =
    kind === "rock" || kind === "mineral"
      ? await probeJson(`${MINDEX}/api/mindex/compounds?q=${encoded}&limit=5`)
      : { ok: false, body: null }

  const mindexHits = extractNames(mindexSearch.body)
  const inatHits = extractInat(inat.body)
  const mineralHits = extractNames(mineral.body)
  const name = mindexHits[0] || inatHits[0] || mineralHits[0] || null

  return NextResponse.json({
    live: false,
    forecast_p: null,
    query: q,
    kind,
    mindex: {
      bind: mindexHealth.ok ? "BOUND" : "UNBOUND",
      hits: mindexHits,
      detail: mindexHealth.ok ? MINDEX : "189 /api/mindex/health not reachable",
    },
    inaturalist: {
      bind: inat.ok ? "BOUND" : "UNBOUND",
      hits: inatHits,
      detail: inat.ok ? "api.inaturalist.org" : "iNaturalist not reached",
      key_present: Boolean(inatKey),
    },
    mineral: {
      bind: mineral.ok && mineralHits.length ? "BOUND" : "UNBOUND",
      hits: mineralHits,
      detail: mineral.ok ? "MINDEX compounds" : "no mineral hit",
    },
    label: name ?? "unknown / not in MINDEX",
    invented: false,
  })
}

function extractNames(body: unknown): string[] {
  if (!body || typeof body !== "object") return []
  const rec = body as Record<string, unknown>
  const lists = [rec.results, rec.taxa, rec.items, rec.compounds, rec.data]
  for (const list of lists) {
    if (!Array.isArray(list)) continue
    return list
      .map((item) => {
        if (!item || typeof item !== "object") return ""
        const row = item as Record<string, unknown>
        return String(row.scientific_name || row.name || row.taxon || row.canonical || "")
      })
      .filter(Boolean)
      .slice(0, 5)
  }
  return []
}

function extractInat(body: unknown): string[] {
  if (!body || typeof body !== "object") return []
  const results = (body as { results?: Array<{ name?: string; preferred_common_name?: string }> }).results
  if (!Array.isArray(results)) return []
  return results
    .map((row) => row.name || row.preferred_common_name || "")
    .filter(Boolean)
    .slice(0, 5)
}
