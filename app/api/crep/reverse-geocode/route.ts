import { NextRequest, NextResponse } from "next/server"

/**
 * CREP reverse-geocode + at-point lookup — Apr 22, 2026
 *
 * Morgan: "the right click whats here search does not work needs to
 * be fixed".
 *
 * Takes a lat/lng and returns:
 *   - Reverse-geocoded address (Nominatim)
 *   - Nearby MINDEX entities (infrastructure, species obs, events) in
 *     a ~1 km bbox around the point
 *   - Admin region / country / timezone when available
 *
 * Result shape:
 *   { address: string|null, country: string|null, admin: string|null,
 *     tz: string|null, nearby: [{ id, type, name, lat, lng, dist_m }] }
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MINDEX_BASE =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_API_URL ||
  "http://192.168.0.189:8000"

function mindexAuthHeaders(): Record<string, string> {
  const tok = process.env.MINDEX_INTERNAL_TOKEN ||
    (process.env.MINDEX_INTERNAL_TOKENS || "").split(",")[0]?.trim() || ""
  if (tok) return { "X-Internal-Token": tok }
  if (process.env.MINDEX_API_KEY) return { "X-API-Key": process.env.MINDEX_API_KEY }
  return {}
}

const DEG_PER_KM = 1 / 111

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // m
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"))
  const lng = Number(req.nextUrl.searchParams.get("lng"))
  const radiusKm = Math.min(5, Math.max(0.25, Number(req.nextUrl.searchParams.get("radius") || 1)))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 })
  }

  // Fire both lookups in parallel so worst-case latency is max(nominatim, mindex)
  const addrPromise = (async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`
      const res = await fetch(url, {
        headers: { "User-Agent": "Mycosoft-CREP/1.0" },
        signal: AbortSignal.timeout(6_000),
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
  })()

  const nearbyPromise = (async () => {
    try {
      const pad = radiusKm * DEG_PER_KM
      const bbox = [lng - pad, lat - pad, lng + pad, lat + pad].join(",")
      // MINDEX earth/bbox — query a handful of most useful entity types.
      const url = `${MINDEX_BASE}/api/v1/earth/bbox?bbox=${bbox}&types=power_plant,substation,cable,tx_line,cell_tower,data_center,camera,species_observation,fire,earthquake,alert&limit=200`
      const res = await fetch(url, {
        headers: { Accept: "application/json", ...mindexAuthHeaders() },
        signal: AbortSignal.timeout(8_000),
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
  })()

  const [addr, nearby] = await Promise.all([addrPromise, nearbyPromise])
  return NextResponse.json({
    lat,
    lng,
    radius_km: radiusKm,
    address: addr?.address ?? null,
    place: addr?.place ?? null,
    admin: addr?.admin ?? null,
    country: addr?.country ?? null,
    nearby,
  })
}
