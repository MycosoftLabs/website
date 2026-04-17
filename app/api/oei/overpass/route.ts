import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: unknown;
  expires: number;
}

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
// Infrastructure locations change on timescale of months-years, not seconds.
// Architectural rule (Morgan, 2026-04-17): permanent infra LOCATIONS cache
// aggressively. The widgets that show STATE (e.g. is this plant online?) are
// separate endpoints. 24h TTL prevents hammering Overpass and keeps map paint
// instant for repeat viewports.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const QUERY_TIMEOUT = 25; // seconds
const MAX_CONCURRENT = 2;

// Overpass QL fragments keyed by infrastructure type
const QUERY_MAP: Record<string, string> = {
  power_plant: 'nwr["power"="plant"]',
  factory: 'nwr["man_made"="works"]',
  mine: 'nwr["landuse"="quarry"]',
  oil_gas: 'nwr["man_made"="petroleum_well"]',
  pipeline: 'way["man_made"="pipeline"]',
  power_line: 'way["power"="line"]',
  solar_farm: 'nwr["power"="plant"]["plant:source"="solar"]',
  wind_farm: 'nwr["power"="plant"]["plant:source"="wind"]',
  water_treatment: 'nwr["man_made"="wastewater_plant"]',
  refinery: 'nwr["man_made"="works"]["product"="petroleum"]',
  cell_tower: 'nwr["man_made"="mast"]["tower:type"="communication"]',
  data_center: 'nwr["building"="data_centre"]',
  military_base:
    'nwr["military"~"barracks|base|airfield|naval_base|range|training_area"]',
  hospital: 'nwr["amenity"="hospital"]',
  pharmacy: 'nwr["amenity"="pharmacy"]',
  fire_station: 'nwr["amenity"="fire_station"]',
  police: 'nwr["amenity"="police"]',
  school: 'nwr["amenity"="school"]',
  university: 'nwr["amenity"="university"]',
  substation: 'nwr["power"="substation"]',
};

// ---------------------------------------------------------------------------
// Server-side cache & concurrency semaphore
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

let activeRequests = 0;

function cacheKey(type: string, bbox: string): string {
  return `${type}::${bbox}`;
}

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Overpass fetch helper
// ---------------------------------------------------------------------------

async function fetchOverpass(
  type: string,
  bbox: string
): Promise<{ features: Record<string, unknown>[]; cached: boolean }> {
  const key = cacheKey(type, bbox);
  const cached = getCached(key);
  if (cached) {
    return { features: cached as Record<string, unknown>[], cached: true };
  }

  // Rate-limit: wait until a slot is available
  while (activeRequests >= MAX_CONCURRENT) {
    await new Promise((r) => setTimeout(r, 200));
  }
  activeRequests++;

  try {
    const overpassQL = QUERY_MAP[type];
    if (!overpassQL) {
      throw new Error(`Unknown infrastructure type: ${type}`);
    }

    const query = `[out:json][timeout:${QUERY_TIMEOUT}][bbox:${bbox}];\n(${overpassQL});\nout center body qt;`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      QUERY_TIMEOUT * 1000
    );

    const res = await fetch(OVERPASS_API, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Overpass API returned ${res.status}`);
    }

    const json = await res.json();
    const elements: OverpassElement[] = json.elements ?? [];

    const features = elements.map((el) => ({
      id: el.id,
      lat: el.lat ?? el.center?.lat ?? 0,
      lon: el.lon ?? el.center?.lon ?? 0,
      type,
      properties: el.tags ?? {},
    }));

    setCache(key, features);
    return { features, cached: false };
  } finally {
    activeRequests--;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const bbox = searchParams.get("bbox");
    const singleType = searchParams.get("type");
    const multiTypes = searchParams.get("types");

    if (!bbox) {
      return NextResponse.json(
        { error: "Missing required parameter: bbox (south,west,north,east)" },
        { status: 400 }
      );
    }

    // Validate bbox format
    const bboxParts = bbox.split(",");
    if (
      bboxParts.length !== 4 ||
      bboxParts.some((p) => isNaN(Number(p)))
    ) {
      return NextResponse.json(
        { error: "Invalid bbox format. Expected: south,west,north,east" },
        { status: 400 }
      );
    }

    // Determine which types to query
    const types: string[] = [];
    if (multiTypes) {
      types.push(
        ...multiTypes.split(",").map((t) => t.trim()).filter(Boolean)
      );
    } else if (singleType) {
      types.push(singleType);
    } else {
      return NextResponse.json(
        { error: "Missing required parameter: type or types" },
        { status: 400 }
      );
    }

    // Validate all requested types
    const invalid = types.filter((t) => !QUERY_MAP[t]);
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: `Unknown infrastructure type(s): ${invalid.join(", ")}`,
          supported: Object.keys(QUERY_MAP),
        },
        { status: 400 }
      );
    }

    // Fetch sequentially to respect rate limits
    const allFeatures: Record<string, unknown>[] = [];
    let anyCached = false;

    for (const t of types) {
      const result = await fetchOverpass(t, bbox);
      allFeatures.push(...result.features);
      if (result.cached) anyCached = true;
    }

    // Infrastructure locations don't change frequently. Cache at every
    // layer — browser, Cloudflare, Next data cache — to kill repeat fetches.
    // s-maxage=86400 (CDN 24h), max-age=3600 (browser 1h), stale-while-revalidate
    // keeps old data visible while a background refresh runs.
    const cacheHeaders = {
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      Vary: "Accept-Encoding",
    };

    // If single type, return typed response; otherwise aggregate
    if (types.length === 1) {
      return NextResponse.json(
        {
          type: types[0],
          features: allFeatures,
          total: allFeatures.length,
          cached: anyCached,
          bbox,
        },
        { headers: cacheHeaders },
      );
    }

    return NextResponse.json(
      {
        type: "multi",
        types,
        features: allFeatures,
        total: allFeatures.length,
        cached: anyCached,
        bbox,
      },
      { headers: cacheHeaders },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
