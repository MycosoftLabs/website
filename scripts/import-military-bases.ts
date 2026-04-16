/**
 * import-military-bases.ts
 *
 * Downloads military base POLYGON data from OpenStreetMap via the Overpass API
 * in small regional batches (10-degree grid cells) to avoid 504 timeouts.
 *
 * Saves results as GeoJSON to: public/data/military-bases.geojson
 *
 * Run with: npx tsx scripts/import-military-bases.ts
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const QUERY_TIMEOUT_S = 60;
const DELAY_BETWEEN_BATCHES_MS = 30_000; // 30 seconds between queries
const GRID_CELL_SIZE = 10; // degrees per grid cell
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60_000; // 1 minute retry delay

const OUTPUT_DIR = path.resolve(__dirname, "..", "public", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "military-bases.geojson");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeoJSONFeature {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    type: string;
    operator: string;
    country: string;
    military?: string;
    landuse?: string;
    osm_id?: number;
    osm_type?: string;
    [key: string]: any;
  };
  geometry:
    | { type: "Polygon"; coordinates: [number, number][][] }
    | { type: "Point"; coordinates: [number, number] };
}

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  tags?: Record<string, string>;
  members?: any[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyMilitaryType(tags: Record<string, string>): string {
  const mil = (tags.military || "").toLowerCase();
  if (mil === "airfield" || mil === "aerodrome") return "airfield";
  if (mil === "naval_base") return "naval_base";
  if (mil === "range" || mil === "danger_area") return "range";
  if (mil === "barracks") return "barracks";
  if (mil === "training_area") return "training_area";
  if (mil === "checkpoint") return "checkpoint";
  if (mil === "base" || mil === "office" || mil === "bunker") return "base";
  if ((tags.landuse || "").toLowerCase() === "military") return "base";
  return mil || "base";
}

// ---------------------------------------------------------------------------
// Generate grid cells covering the world
// ---------------------------------------------------------------------------

interface GridCell {
  south: number;
  north: number;
  west: number;
  east: number;
  label: string;
}

function generateGridCells(): GridCell[] {
  const cells: GridCell[] = [];
  for (let lat = -90; lat < 90; lat += GRID_CELL_SIZE) {
    for (let lon = -180; lon < 180; lon += GRID_CELL_SIZE) {
      cells.push({
        south: lat,
        north: Math.min(lat + GRID_CELL_SIZE, 90),
        west: lon,
        east: Math.min(lon + GRID_CELL_SIZE, 180),
        label: `[${lat},${lon}]-[${lat + GRID_CELL_SIZE},${lon + GRID_CELL_SIZE}]`,
      });
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Fetch one grid cell from Overpass
// ---------------------------------------------------------------------------

async function fetchCell(cell: GridCell): Promise<GeoJSONFeature[]> {
  const bbox = `${cell.south},${cell.west},${cell.north},${cell.east}`;
  const query = `[out:json][timeout:${QUERY_TIMEOUT_S}][maxsize:25000000];
(
  way["landuse"="military"](${bbox});
  relation["landuse"="military"](${bbox});
  way["military"](${bbox});
);
out geom;`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), (QUERY_TIMEOUT_S + 10) * 1000);

      const res = await fetch(OVERPASS_API, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429 || res.status === 504 || res.status === 503) {
        console.warn(
          `  [RETRY ${attempt}/${MAX_RETRIES}] Cell ${cell.label} returned ${res.status} — waiting ${RETRY_DELAY_MS / 1000}s`,
        );
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`  Cell ${cell.label} error ${res.status}: ${text.slice(0, 200)}`);
        return [];
      }

      const json = await res.json();
      const elements: OverpassElement[] = json.elements ?? [];
      return elementsToFeatures(elements);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.warn(`  [TIMEOUT] Cell ${cell.label} timed out (attempt ${attempt}/${MAX_RETRIES})`);
      } else {
        console.warn(`  [ERROR] Cell ${cell.label}: ${err?.message || err} (attempt ${attempt}/${MAX_RETRIES})`);
      }
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
    }
  }

  console.warn(`  [SKIP] Cell ${cell.label} failed after ${MAX_RETRIES} attempts`);
  return [];
}

// ---------------------------------------------------------------------------
// Convert Overpass elements to GeoJSON features
// ---------------------------------------------------------------------------

function elementsToFeatures(elements: OverpassElement[]): GeoJSONFeature[] {
  const features: GeoJSONFeature[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name =
      tags.name || tags.official_name || tags.alt_name || tags.military || "Unknown";

    // Compute polygon coordinates from geometry array
    let polygon: [number, number][] | undefined;
    let centerLat: number | undefined;
    let centerLon: number | undefined;

    if (el.geometry && Array.isArray(el.geometry) && el.geometry.length > 2) {
      polygon = el.geometry.map((g) => [g.lon, g.lat] as [number, number]);
      // Compute centroid
      const sumLat = el.geometry.reduce((s, g) => s + g.lat, 0);
      const sumLon = el.geometry.reduce((s, g) => s + g.lon, 0);
      centerLat = sumLat / el.geometry.length;
      centerLon = sumLon / el.geometry.length;
    } else if (el.bounds) {
      centerLat = (el.bounds.minlat + el.bounds.maxlat) / 2;
      centerLon = (el.bounds.minlon + el.bounds.maxlon) / 2;
    } else if (el.center) {
      centerLat = el.center.lat;
      centerLon = el.center.lon;
    } else if (el.lat != null && el.lon != null) {
      centerLat = el.lat;
      centerLon = el.lon;
    }

    // For relations with members, try to extract member geometries
    if (el.type === "relation" && el.members && !polygon) {
      const outerCoords: [number, number][] = [];
      for (const member of el.members) {
        if (
          member.role === "outer" &&
          member.geometry &&
          Array.isArray(member.geometry)
        ) {
          for (const g of member.geometry) {
            outerCoords.push([g.lon, g.lat]);
          }
        }
      }
      if (outerCoords.length > 2) {
        polygon = outerCoords;
        if (!centerLat || !centerLon) {
          const sumLat = outerCoords.reduce((s, c) => s + c[1], 0);
          const sumLon = outerCoords.reduce((s, c) => s + c[0], 0);
          centerLat = sumLat / outerCoords.length;
          centerLon = sumLon / outerCoords.length;
        }
      }
    }

    if (centerLat == null || centerLon == null) continue;

    const feature: GeoJSONFeature = {
      type: "Feature",
      properties: {
        id: `osm-mil-${el.id}`,
        name,
        type: classifyMilitaryType(tags),
        operator: tags.operator || tags["operator:short"] || "",
        country: tags["addr:country"] || tags["is_in:country"] || "",
        military: tags.military,
        landuse: tags.landuse,
        osm_id: el.id,
        osm_type: el.type,
      },
      geometry: polygon
        ? { type: "Polygon", coordinates: [polygon] }
        : { type: "Point", coordinates: [centerLon, centerLat] },
    };

    features.push(feature);
  }

  return features;
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateFeatures(features: GeoJSONFeature[]): GeoJSONFeature[] {
  const seen = new Map<string, GeoJSONFeature>();
  for (const f of features) {
    // Use OSM id as primary dedup key
    const osmKey = f.properties.osm_id
      ? `${f.properties.osm_type}-${f.properties.osm_id}`
      : null;
    if (osmKey && seen.has(osmKey)) {
      // Keep the one with polygon geometry
      const existing = seen.get(osmKey)!;
      if (
        f.geometry.type === "Polygon" &&
        existing.geometry.type === "Point"
      ) {
        seen.set(osmKey, f);
      }
      continue;
    }
    const key = osmKey || `${f.properties.name}-${JSON.stringify(f.geometry.coordinates).slice(0, 30)}`;
    seen.set(key, f);
  }
  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Military Base Import Pipeline ===");
  console.log(`Grid cell size: ${GRID_CELL_SIZE} degrees`);
  console.log(`Delay between batches: ${DELAY_BETWEEN_BATCHES_MS / 1000}s`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log("");

  const allCells = generateGridCells();
  console.log(`Total grid cells: ${allCells.length}`);

  // Prioritize cells that are likely to have military bases
  // (populated continents first, ocean cells last)
  const priorityCells = allCells.filter(
    (c) =>
      // North America
      (c.south >= 20 && c.north <= 75 && c.west >= -170 && c.east <= -50) ||
      // Europe
      (c.south >= 35 && c.north <= 72 && c.west >= -15 && c.east <= 45) ||
      // East Asia
      (c.south >= 20 && c.north <= 55 && c.west >= 100 && c.east <= 150) ||
      // Middle East
      (c.south >= 10 && c.north <= 45 && c.west >= 30 && c.east <= 75) ||
      // Australia
      (c.south >= -45 && c.north <= -10 && c.west >= 110 && c.east <= 155) ||
      // South America
      (c.south >= -55 && c.north <= 15 && c.west >= -80 && c.east <= -35) ||
      // Africa
      (c.south >= -35 && c.north <= 37 && c.west >= -20 && c.east <= 52) ||
      // South/Southeast Asia
      (c.south >= -10 && c.north <= 35 && c.west >= 65 && c.east <= 145),
  );
  const remainingCells = allCells.filter((c) => !priorityCells.includes(c));
  const orderedCells = [...priorityCells, ...remainingCells];

  console.log(`Priority cells (land): ${priorityCells.length}`);
  console.log(`Remaining cells (ocean/polar): ${remainingCells.length}`);
  console.log("");

  // Load existing progress (if any) to allow resume
  let allFeatures: GeoJSONFeature[] = [];
  let processedCells = 0;

  // Check for existing partial output
  const progressFile = path.join(OUTPUT_DIR, ".military-import-progress.json");
  let startIndex = 0;
  if (fs.existsSync(progressFile)) {
    try {
      const progress = JSON.parse(fs.readFileSync(progressFile, "utf-8"));
      startIndex = progress.lastCell || 0;
      if (fs.existsSync(OUTPUT_FILE)) {
        const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
        allFeatures = existing.features || [];
        console.log(`Resuming from cell ${startIndex} with ${allFeatures.length} existing features`);
      }
    } catch {
      startIndex = 0;
    }
  }

  for (let i = startIndex; i < orderedCells.length; i++) {
    const cell = orderedCells[i];
    processedCells++;

    console.log(
      `[${i + 1}/${orderedCells.length}] Fetching cell ${cell.label}...`,
    );

    const features = await fetchCell(cell);

    if (features.length > 0) {
      allFeatures.push(...features);
      console.log(
        `  Found ${features.length} features (total: ${allFeatures.length})`,
      );
    } else {
      console.log(`  No features in this cell`);
    }

    // Save progress every 10 cells
    if (processedCells % 10 === 0) {
      const deduplicated = deduplicateFeatures(allFeatures);
      allFeatures = deduplicated;
      saveGeoJSON(deduplicated);
      fs.writeFileSync(
        progressFile,
        JSON.stringify({ lastCell: i + 1, totalFeatures: deduplicated.length }),
      );
      console.log(
        `  [CHECKPOINT] Saved ${deduplicated.length} features after dedup`,
      );
    }

    // Delay between queries to avoid rate limits
    if (i < orderedCells.length - 1) {
      console.log(
        `  Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s before next query...`,
      );
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  // Final dedup and save
  const deduplicated = deduplicateFeatures(allFeatures);
  saveGeoJSON(deduplicated);

  // Clean up progress file
  if (fs.existsSync(progressFile)) {
    fs.unlinkSync(progressFile);
  }

  console.log("");
  console.log("=== Import Complete ===");
  console.log(`Total features: ${deduplicated.length}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  // Stats
  const polygons = deduplicated.filter((f) => f.geometry.type === "Polygon").length;
  const points = deduplicated.filter((f) => f.geometry.type === "Point").length;
  console.log(`  Polygons: ${polygons}`);
  console.log(`  Points: ${points}`);
}

function saveGeoJSON(features: GeoJSONFeature[]) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const geojson = {
    type: "FeatureCollection" as const,
    metadata: {
      source: "overpass-api-import",
      description:
        "Military base perimeters from OpenStreetMap via Overpass API",
      generated: new Date().toISOString(),
      totalFeatures: features.length,
    },
    features,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(geojson, null, 2));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
