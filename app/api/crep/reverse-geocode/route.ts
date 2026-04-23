import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

/**
 * CREP reverse-geocode + at-point lookup — Apr 22, 2026 v2 (Apr 23 timeout fix)
 *
 * Morgan: "check search here just pops up and says ... Lookup failed:
 * signal timed out".
 *
 * Root cause of v1 timeouts:
 *   - Server-side timeouts totalled 6s (nominatim) + 8s (mindex) parallel,
 *     so worst case should have been ~8s.
 *   - But Node `fetch` hangs beyond the AbortSignal timeout when the
 *     target is firewalled / dropped. A MINDEX_API_URL pointing at an
 *     unreachable host would spin for 30s+ of TCP syn before resolving.
 *   - Plus Next.js middleware cost (Supabase getUser() on /api/crep/*)
 *     adds 1-3 s before the route handler even runs.
 *   - Client timeout was 15 s; server sometimes took longer.
 *
 * v2 fixes:
 *   - Uses resolveMindexServerBaseUrl() so localhost misconfigs auto-
 *     repair to the LAN VM URL.
 *   - Hard server-side deadline: 5 s each lookup, 8 s total.
 *   - Always returns 200 with as much as we have (lat/lng + whatever
 *     source returned first). Never hangs past the deadline.
 *   - Client timeout tightened to 10 s (matches server cap).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MINDEX_BASE = resolveMindexServerBaseUrl()

function mindexAuthHeaders(): Record<string, string> {
  const tok = process.env.MINDEX_INTERNAL_TOKEN ||
    (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0]?.trim() || ""
  if (tok) return { "X-Internal-Token": tok }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

const DEG_PER_KM = 1 / 111

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Race a promise against a hard deadline. Returns the fallback if the
 * promise doesn't settle in time. Never throws.
 */
function withDeadline<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"))
  const lng = Number(req.nextUrl.searchParams.get("lng"))
  const radiusKm = Math.min(5, Math.max(0.25, Number(req.nextUrl.searchParams.get("radius") || 1)))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 })
  }

  const t0 = Date.now()

  // Nominatim — 4s hard deadline
  const addrPromise = withDeadline((async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`
      const res = await fetch(url, {
        headers: { "User-Agent": "Mycosoft-CREP/1.0 (https://mycosoft.com)" },
        signal: AbortSignal.timeout(3_500),
      })
      if (!res.ok) return null
      const j = await res.json()
      return {
        address: j.display_name || null,
        country: j.address?.country || null,
        admin: j.address?.state || j.address?.region || null,
        place: j.address?.city || j.address?.town || j.address?.village || j.address?.hamlet || null,
      }
    } catch { return null }
  })(), 4_000, null as any)

  // MINDEX — 5s hard deadline; return [] on any failure.
  const nearbyPromise = withDeadline((async () => {
    try {
      const pad = radiusKm * DEG_PER_KM
      const bbox = [lng - pad, lat - pad, lng + pad, lat + pad].join(",")
      const url = `${MINDEX_BASE}/api/v1/earth/bbox?bbox=${bbox}&types=power_plant,substation,cable,tx_line,cell_tower,data_center,camera,species_observation,fire,earthquake,alert&limit=200`
      const res = await fetch(url, {
        headers: { Accept: "application/json", ...mindexAuthHeaders() },
        signal: AbortSignal.timeout(4_500),
      })
      if (!res.ok) return []
      const j = await res.json()
      const rows: any[] = j?.entities || j?.data || []
      const nearby = rows
        .map((r) => {
          const rlat = Number(r.lat ?? r.latitude ?? r.location?.lat)
          const rlng = Number(r.lng ?? r.lon ?? r.longitude ?? r.location?.lng)
          if (!Number.isFinite(rlat) || !Number.isFinite(rlng)) return null
          return {
            id: r.id || r.entity_id || `${r.type}-${rlat.toFixed(4)},${rlng.toFixed(4)}`,
            type: r.type || r.entity_type || "entity",
            name: r.name || r.label || r.entity_name || r.properties?.name || null,
            lat: rlat,
            lng: rlng,
            dist_m: haversine(lat, lng, rlat, rlng),
            voltage: r.voltage || r.properties?.voltage || null,
            operator: r.operator || r.properties?.operator || null,
          }
        })
        .filter(Boolean) as Array<{
          id: string; type: string; name: string | null; lat: number; lng: number; dist_m: number;
          voltage: string | null; operator: string | null;
        }>
      nearby.sort((a, b) => a.dist_m - b.dist_m)
      return nearby.slice(0, 30)
    } catch { return [] }
  })(), 5_000, [] as any[])

  const [addr, nearby] = await Promise.all([addrPromise, nearbyPromise])

  return NextResponse.json({
    lat,
    lng,
    radius_km: radiusKm,
    address: addr?.address ?? null,
    place: addr?.place ?? null,
    admin: addr?.admin ?? null,
    country: addr?.country ?? null,
    nearby: Array.isArray(nearby) ? nearby : [],
    // Diagnostics for the widget — surfaces which sources were reached
    sources: {
      nominatim: addr ? "ok" : "timeout",
      mindex: Array.isArray(nearby) && nearby.length ? "ok" : (nearby as any)?.length === 0 ? "empty" : "timeout",
      mindex_url: MINDEX_BASE,
    },
    latency_ms: Date.now() - t0,
  })
}
