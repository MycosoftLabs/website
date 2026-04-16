/**
 * Military Facilities API Route
 *
 * GET /api/oei/military — Fetch military installations, bases, airfields, ranges
 *
 * Data sources (priority order):
 *   1. MINDEX cache  — /api/mindex/proxy/military (PostGIS + Redis)
 *   2. OpenStreetMap  — Overpass API for military=* and landuse=military
 *   3. Results are ingested back to MINDEX for future cache hits
 *
 * Query params:
 *   - south, north, west, east: bounding box (default: continental US)
 *   - limit: max results (default 2000)
 */

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MilitaryFacility {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string; // base | airfield | range | naval_base | barracks | training_area | checkpoint | danger_area
  operator: string;
  country: string;
  tags: Record<string, string>;
}

interface CacheEntry {
  data: MilitaryFacility[];
  expires: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const QUERY_TIMEOUT_S = 30;

const MINDEX_URL =
  process.env.MINDEX_API_URL ||
  process.env.NEXT_PUBLIC_MINDEX_URL ||
  "http://192.168.0.189:8000";

const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key";

// Default bounding box: continental US
const DEFAULT_BBOX = { south: 24, north: 50, west: -125, east: -66 };

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

function cacheKey(south: number, north: number, west: number, east: number): string {
  // Quantise to ~1 degree to merge nearby requests
  const q = (n: number) => Math.round(n);
  return `mil:${q(south)},${q(north)},${q(west)},${q(east)}`;
}

function getCached(key: string): MilitaryFacility[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: MilitaryFacility[]): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Military type classifier
// ---------------------------------------------------------------------------

function classifyMilitaryType(tags: Record<string, string>): string {
  const mil = (tags.military || "").toLowerCase();
  const landuse = (tags.landuse || "").toLowerCase();

  if (mil === "airfield" || mil === "aerodrome") return "airfield";
  if (mil === "naval_base") return "naval_base";
  if (mil === "range" || mil === "danger_area") return "range";
  if (mil === "barracks") return "barracks";
  if (mil === "training_area") return "training_area";
  if (mil === "checkpoint") return "checkpoint";
  if (mil === "danger_area") return "danger_area";
  if (mil === "base" || mil === "office" || mil === "bunker") return "base";
  if (landuse === "military") return "base";
  // Default
  return mil || "base";
}

// ---------------------------------------------------------------------------
// Source 1: MINDEX cache
// ---------------------------------------------------------------------------

async function fetchFromMindex(
  south: number,
  north: number,
  west: number,
  east: number,
  limit: number,
): Promise<MilitaryFacility[] | null> {
  try {
    const url = `${MINDEX_URL}/api/mindex/earth/map/bbox?layer=military&lat_min=${south}&lat_max=${north}&lng_min=${west}&lng_max=${east}&limit=${limit}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "X-Api-Key": MINDEX_API_KEY,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const items: any[] = json.features || json.data || json.results || [];
    if (items.length === 0) return null;

    return items.map((item) => ({
      id: `mindex-mil-${item.id || item.entity_id || Math.random().toString(36).slice(2)}`,
      name: item.name || item.properties?.name || "Unknown",
      lat: item.lat ?? item.latitude ?? item.geometry?.coordinates?.[1] ?? 0,
      lng: item.lng ?? item.longitude ?? item.geometry?.coordinates?.[0] ?? 0,
      type: item.type || item.properties?.military || "base",
      operator: item.operator || item.properties?.operator || "",
      country: item.country || item.properties?.country || "",
      tags: item.properties || item.tags || {},
    }));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 2: Overpass API
// ---------------------------------------------------------------------------

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function fetchFromOverpass(
  south: number,
  north: number,
  west: number,
  east: number,
): Promise<MilitaryFacility[]> {
  // Limit bbox size to 5 degrees max per side to avoid Overpass 504 timeouts
  const maxSpan = 5;
  const clampedSouth = south;
  const clampedNorth = Math.min(north, south + maxSpan);
  const clampedWest = west;
  const clampedEast = Math.min(east, west + maxSpan);
  const bbox = `${clampedSouth},${clampedWest},${clampedNorth},${clampedEast}`;
  // Skip relations (too heavy) — nodes and ways only, with 500 result limit
  const query = `[out:json][timeout:${QUERY_TIMEOUT_S}][maxsize:5000000];
(
  node["military"](${bbox});
  way["military"](${bbox});
  node["landuse"="military"](${bbox});
  way["landuse"="military"](${bbox});
);
out center 500;`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_S * 1000);

  try {
    const res = await fetch(OVERPASS_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Overpass returned ${res.status}`);

    const json = await res.json();
    const elements: OverpassElement[] = json.elements ?? [];

    return elements
      .map((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (lat == null || lon == null) return null;

        const tags = el.tags ?? {};
        return {
          id: `osm-mil-${el.id}`,
          name: tags.name || tags.official_name || tags.alt_name || tags.military || "Unknown",
          lat,
          lng: lon,
          type: classifyMilitaryType(tags),
          operator: tags.operator || tags["operator:short"] || "",
          country: tags["addr:country"] || tags["is_in:country"] || "",
          tags,
        } as MilitaryFacility;
      })
      .filter(Boolean) as MilitaryFacility[];
  } catch (err) {
    clearTimeout(timeout);
    console.error("[API] Military Overpass error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Source 3: Ingest to MINDEX (fire and forget)
// ---------------------------------------------------------------------------

async function ingestToMindex(facilities: MilitaryFacility[]): Promise<void> {
  if (facilities.length === 0) return;
  try {
    await fetch(`${MINDEX_URL}/api/mindex/ingest/military`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": MINDEX_API_KEY,
      },
      body: JSON.stringify({
        source: "overpass",
        facilities: facilities.slice(0, 500), // cap ingest batch
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Non-critical — silent fail
  }
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateFacilities(facilities: MilitaryFacility[]): MilitaryFacility[] {
  const seen = new Map<string, MilitaryFacility>();
  for (const f of facilities) {
    // Deduplicate by proximity (~500m) + similar name
    const gridKey = `${Math.round(f.lat * 200)}:${Math.round(f.lng * 200)}`;
    const existing = seen.get(gridKey);
    if (!existing) {
      seen.set(gridKey, f);
    } else {
      // Keep the one with more data
      const existingScore = (existing.name !== "Unknown" ? 1 : 0) + (existing.operator ? 1 : 0) + Object.keys(existing.tags).length;
      const newScore = (f.name !== "Unknown" ? 1 : 0) + (f.operator ? 1 : 0) + Object.keys(f.tags).length;
      if (newScore > existingScore) {
        seen.set(gridKey, f);
      }
    }
  }
  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const south = parseFloat(searchParams.get("south") ?? String(DEFAULT_BBOX.south));
    const north = parseFloat(searchParams.get("north") ?? String(DEFAULT_BBOX.north));
    const west = parseFloat(searchParams.get("west") ?? String(DEFAULT_BBOX.west));
    const east = parseFloat(searchParams.get("east") ?? String(DEFAULT_BBOX.east));
    const limit = parseInt(searchParams.get("limit") ?? "2000");

    // Validate
    if ([south, north, west, east].some(isNaN)) {
      return NextResponse.json(
        { error: "Invalid bbox — need numeric south, north, west, east" },
        { status: 400 },
      );
    }

    // Check in-memory cache first
    const key = cacheKey(south, north, west, east);
    const cached = getCached(key);
    if (cached) {
      return NextResponse.json({
        source: "cache",
        timestamp: new Date().toISOString(),
        total: cached.length,
        facilities: cached,
        bbox: { south, north, west, east },
      });
    }

    // Try MINDEX first (fastest if available)
    const mindexData = await fetchFromMindex(south, north, west, east, limit);

    // Always fetch from Overpass for comprehensive coverage
    const overpassData = await fetchFromOverpass(south, north, west, east);

    // Merge and deduplicate
    const allFacilities = [
      ...(mindexData || []),
      ...overpassData,
    ];
    const deduplicated = deduplicateFacilities(allFacilities).slice(0, limit);

    // Cache the result
    setCache(key, deduplicated);

    // Ingest Overpass results to MINDEX in background (fire and forget)
    if (overpassData.length > 0) {
      ingestToMindex(overpassData).catch(() => {});
    }

    return NextResponse.json({
      source: mindexData ? "mindex+overpass" : "overpass",
      timestamp: new Date().toISOString(),
      total: deduplicated.length,
      facilities: deduplicated,
      bbox: { south, north, west, east },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[API] Military route error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
