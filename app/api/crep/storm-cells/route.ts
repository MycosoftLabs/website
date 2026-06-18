import { NextRequest, NextResponse } from "next/server";

/**
 * Active storm cells — live NWS Severe Thunderstorm + Tornado WARNING polygons, used by the
 * lightning layer to flash animated bolts over REAL storms (keyless, authoritative). Returns
 * each warning's polygon + bbox + centroid. Cached ~60s. Fail-safe: ok:false on error.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NWS_HEADERS = {
  Accept: "application/geo+json",
  "User-Agent": "Mycosoft NatureOS Earth Simulator storm-cells (https://mycosoft.com, ops@mycosoft.com)",
};

let cache: { at: number; body: unknown } | null = null;
const TTL_MS = 60_000;

function ringStats(ring: number[][]): { centroid: [number, number]; bbox: [number, number, number, number] } | null {
  if (!Array.isArray(ring) || ring.length === 0) return null;
  let sx = 0, sy = 0, n = 0, minX = 180, minY = 90, maxX = -180, maxY = -90;
  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const x = Number(p[0]), y = Number(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    sx += x; sy += y; n++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (!n) return null;
  return { centroid: [sx / n, sy / n], bbox: [minX, minY, maxX, maxY] };
}

export async function GET(_req: NextRequest) {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.body, { headers: { "Cache-Control": "public, max-age=30" } });
  }
  try {
    const res = await fetch("https://api.weather.gov/alerts/active?status=actual&message_type=alert", {
      headers: NWS_HEADERS, signal: AbortSignal.timeout(7000), cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, cells: [], note: `NWS ${res.status}` }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const data = await res.json();
    const feats: any[] = Array.isArray(data?.features) ? data.features : [];
    const cells: Array<{ event: string; severity: string; centroid: [number, number]; bbox: number[]; polygon: number[][] }> = [];
    for (const f of feats) {
      const event = String(f?.properties?.event || "");
      if (!/(thunderstorm|tornado)/i.test(event) || !/warning/i.test(event)) continue;
      const geom = f?.geometry;
      const polys = geom?.type === "Polygon" ? [geom.coordinates?.[0]] : geom?.type === "MultiPolygon" ? geom.coordinates.map((p: number[][][]) => p?.[0]) : [];
      for (const ring of polys) {
        const st = ringStats(ring);
        if (!st) continue;
        cells.push({ event, severity: String(f?.properties?.severity || ""), centroid: st.centroid, bbox: st.bbox, polygon: ring });
      }
    }
    const body = { ok: true, count: cells.length, cells, updated: new Date().toISOString() };
    cache = { at: Date.now(), body };
    return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (e) {
    return NextResponse.json({ ok: false, cells: [], error: e instanceof Error ? e.message : "NWS unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
