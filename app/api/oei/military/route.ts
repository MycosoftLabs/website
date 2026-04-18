/**
 * Military Facilities API Route
 *
 * GET /api/oei/military — Fetch military installations, bases, airfields, ranges
 *
 * Data sources (priority order):
 *   1. Static GeoJSON — public/data/military-bases.geojson (pre-built via import script)
 *      Falls back to public/data/military-bases-seed.geojson if main file missing
 *   2. MINDEX cache  — /api/mindex/proxy/military (PostGIS + Redis)
 *   3. OpenStreetMap  — Overpass API for military=* and landuse=military
 *   4. Results are ingested back to MINDEX for future cache hits
 *
 * The static file is the PRIMARY source — instant, no external API call.
 * Overpass is only used as a fallback when no static file exists.
 *
 * Query params:
 *   - south, north, west, east: bounding box (default: continental US)
 *   - limit: max results (default 2000)
 */

import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

import { env } from "@/lib/env";

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
  polygon?: [number, number][]; // Perimeter boundary coordinates [lng, lat][] if available
  tags: Record<string, string>;
  properties?: Record<string, any>;
}

interface CacheEntry {
  data: MilitaryFacility[];
  expires: number;
}

interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const QUERY_TIMEOUT_S = 30;

function mindexAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/json",
    ...extra,
  };
  const internal = env.mindexInternalToken?.trim();
  if (internal) {
    h["X-Internal-Token"] = internal;
  }
  if (env.mindexApiKey) {
    h["X-API-Key"] = env.mindexApiKey;
  }
  return h;
}

function mindexBaseUrl(): string {
  return env.mindexApiBaseUrl.replace(/\/$/, "");
}

// Default bounding box: continental US
const DEFAULT_BBOX = { south: 24, north: 50, west: -125, east: -66 };

// Static GeoJSON file paths
const STATIC_FILE_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "military-bases.geojson",
);
const SEED_FILE_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "military-bases-seed.geojson",
);

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
// Static GeoJSON file cache (loaded once, held in memory)
// ---------------------------------------------------------------------------

let staticGeoJSON: GeoJSONCollection | null = null;
let staticGeoJSONLoaded = false;

function loadStaticGeoJSON(): GeoJSONCollection | null {
  if (staticGeoJSONLoaded) return staticGeoJSON;
  staticGeoJSONLoaded = true;

  // Try full import file first, then seed file
  for (const filePath of [STATIC_FILE_PATH, SEED_FILE_PATH]) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw) as GeoJSONCollection;
        if (
          parsed.type === "FeatureCollection" &&
          Array.isArray(parsed.features) &&
          parsed.features.length > 0
        ) {
          staticGeoJSON = parsed;
          console.log(
            `[API/Military] Loaded static GeoJSON from ${path.basename(filePath)}: ${parsed.features.length} features`,
          );
          return staticGeoJSON;
        }
      }
    } catch (err) {
      console.warn(
        `[API/Military] Failed to load ${path.basename(filePath)}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log("[API/Military] No static GeoJSON file found — will fall back to Overpass");
  return null;
}

// ---------------------------------------------------------------------------
// Bbox filtering for static GeoJSON features
// ---------------------------------------------------------------------------

function computeFeatureCentroid(
  geometry: GeoJSONFeature["geometry"],
): [number, number] | null {
  if (geometry.type === "Point") {
    return geometry.coordinates as [number, number];
  }
  if (geometry.type === "Polygon") {
    const ring = geometry.coordinates[0] as [number, number][];
    if (!ring || ring.length === 0) return null;
    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of ring) {
      sumLng += lng;
      sumLat += lat;
    }
    return [sumLng / ring.length, sumLat / ring.length];
  }
  if (geometry.type === "MultiPolygon") {
    // Use first polygon centroid
    const firstPoly = geometry.coordinates[0];
    if (!firstPoly || !firstPoly[0]) return null;
    const ring = firstPoly[0] as [number, number][];
    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of ring) {
      sumLng += lng;
      sumLat += lat;
    }
    return [sumLng / ring.length, sumLat / ring.length];
  }
  return null;
}

function computeFeatureBounds(
  geometry: GeoJSONFeature["geometry"],
): { minLng: number; maxLng: number; minLat: number; maxLat: number } | null {
  let coords: [number, number][] = [];

  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates as [number, number];
    return { minLng: lng, maxLng: lng, minLat: lat, maxLat: lat };
  }
  if (geometry.type === "Polygon") {
    coords = (geometry.coordinates[0] || []) as [number, number][];
  }
  if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      coords.push(...((poly[0] || []) as [number, number][]));
    }
  }

  if (coords.length === 0) return null;

  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, maxLng, minLat, maxLat };
}

function bboxIntersects(
  featureBounds: { minLng: number; maxLng: number; minLat: number; maxLat: number },
  south: number,
  north: number,
  west: number,
  east: number,
): boolean {
  return !(
    featureBounds.maxLat < south ||
    featureBounds.minLat > north ||
    featureBounds.maxLng < west ||
    featureBounds.minLng > east
  );
}

function filterStaticFeatures(
  geojson: GeoJSONCollection,
  south: number,
  north: number,
  west: number,
  east: number,
  limit: number,
): MilitaryFacility[] {
  const facilities: MilitaryFacility[] = [];

  for (const feature of geojson.features) {
    if (facilities.length >= limit) break;

    // Check if feature intersects bbox
    const bounds = computeFeatureBounds(feature.geometry);
    if (bounds && !bboxIntersects(bounds, south, north, west, east)) {
      continue;
    }

    // Compute centroid for lat/lng
    const centroid = computeFeatureCentroid(feature.geometry);
    if (!centroid) continue;

    const [lng, lat] = centroid;
    const props = feature.properties || {};

    // Extract polygon coordinates for perimeter rendering
    let polygon: [number, number][] | undefined;
    if (feature.geometry.type === "Polygon") {
      polygon = feature.geometry.coordinates[0] as [number, number][];
    } else if (feature.geometry.type === "MultiPolygon") {
      // Use the largest ring from the first polygon
      polygon = (feature.geometry.coordinates[0]?.[0] || []) as [number, number][];
    }

    facilities.push({
      id: props.id || `static-mil-${Math.random().toString(36).slice(2)}`,
      name: props.name || "Unknown",
      lat,
      lng,
      type: props.type || props.military || "base",
      operator: props.operator || "",
      country: props.country || "",
      polygon: polygon && polygon.length > 2 ? polygon : undefined,
      tags: props,
      properties: {
        ...props,
        source: "static-geojson",
      },
    });
  }

  return facilities;
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
    const url = `${mindexBaseUrl()}/api/mindex/earth/map/bbox?layer=military&lat_min=${south}&lat_max=${north}&lng_min=${west}&lng_max=${east}&limit=${limit}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: mindexAuthHeaders(),
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
// Source 2: Overpass API (fallback only — used when no static file exists)
// ---------------------------------------------------------------------------

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[]; // Full polygon coords from `out geom`
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
  const clampedNorth = Math.min(north, south + maxSpan);
  const clampedEast = Math.min(east, west + maxSpan);
  const bbox = `${south},${west},${clampedNorth},${clampedEast}`;
  // Use `out geom` to get FULL POLYGON GEOMETRY for base perimeters
  // Nodes get point coords, ways get full coordinate arrays for polygon boundaries
  const query = `[out:json][timeout:${QUERY_TIMEOUT_S}][maxsize:10000000];
(
  node["military"](${bbox});
  way["military"](${bbox});
  node["landuse"="military"](${bbox});
  way["landuse"="military"](${bbox});
);
out geom 500;`;

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
        // For ways with geometry, compute center from coords if no center given
        let centerLat = lat;
        let centerLon = lon;
        let polygon: [number, number][] | undefined;
        if (el.geometry && Array.isArray(el.geometry) && el.geometry.length > 2) {
          // Extract polygon perimeter coordinates [lng, lat] for GeoJSON
          polygon = el.geometry.map((g: any) => [g.lon, g.lat]);
          if (!centerLat || !centerLon) {
            // Compute centroid from polygon
            const sumLat = el.geometry.reduce((s: number, g: any) => s + g.lat, 0);
            const sumLon = el.geometry.reduce((s: number, g: any) => s + g.lon, 0);
            centerLat = sumLat / el.geometry.length;
            centerLon = sumLon / el.geometry.length;
          }
        }
        if (centerLat == null || centerLon == null) return null;

        const tags = el.tags ?? {};
        return {
          id: `osm-mil-${el.id}`,
          name: tags.name || tags.official_name || tags.alt_name || tags.military || "Unknown",
          lat: centerLat,
          lng: centerLon,
          type: classifyMilitaryType(tags),
          operator: tags.operator || tags["operator:short"] || "",
          country: tags["addr:country"] || tags["is_in:country"] || "",
          polygon, // Full perimeter coordinates if available
          tags,
          properties: {
            ...tags,
            osm_id: el.id,
            osm_type: el.type,
            military: tags.military,
            landuse: tags.landuse,
            access: tags.access,
            website: tags.website || tags["contact:website"],
            phone: tags.phone || tags["contact:phone"],
            wikidata: tags.wikidata,
            wikipedia: tags.wikipedia,
          },
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
  if (!env.mindexInternalToken?.trim() && !env.mindexApiKey) {
    return;
  }
  const ts = new Date().toISOString();
  const entities = facilities.slice(0, 500).map((f) => ({
    source: "overpass",
    source_id: f.id,
    name: f.name,
    entity_type: f.type,
    lat: f.lat,
    lng: f.lng,
    occurred_at: ts,
    properties: {
      operator: f.operator,
      country: f.country,
      branch: f.tags?.branch ?? f.tags?.military ?? "",
      tags: f.tags,
      ...(f.properties ?? {}),
    },
  }));
  try {
    await fetch(`${mindexBaseUrl()}/api/mindex/earth/ingest`, {
      method: "POST",
      headers: mindexAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ layer: "military", entities }),
      signal: AbortSignal.timeout(15000),
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
      // Keep the one with more data (prefer polygon over point)
      const existingScore =
        (existing.name !== "Unknown" ? 1 : 0) +
        (existing.operator ? 1 : 0) +
        (existing.polygon ? 5 : 0) +
        Object.keys(existing.tags).length;
      const newScore =
        (f.name !== "Unknown" ? 1 : 0) +
        (f.operator ? 1 : 0) +
        (f.polygon ? 5 : 0) +
        Object.keys(f.tags).length;
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

    // -----------------------------------------------------------------------
    // PRIMARY SOURCE: Static GeoJSON file (instant, no API call)
    // -----------------------------------------------------------------------
    const staticData = loadStaticGeoJSON();
    if (staticData && staticData.features.length > 0) {
      const facilities = filterStaticFeatures(
        staticData,
        south,
        north,
        west,
        east,
        limit,
      );

      // Cache the result
      setCache(key, facilities);

      return NextResponse.json({
        source: "static-geojson",
        timestamp: new Date().toISOString(),
        total: facilities.length,
        facilities,
        bbox: { south, north, west, east },
      });
    }

    // -----------------------------------------------------------------------
    // FALLBACK: MINDEX + Overpass (only if no static file)
    // -----------------------------------------------------------------------

    // Try MINDEX first (fastest if available)
    const mindexData = await fetchFromMindex(south, north, west, east, limit);

    // Fetch from Overpass for comprehensive coverage
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
