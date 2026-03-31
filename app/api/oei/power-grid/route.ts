import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Power Grid API — Proxies HIFLD & EIA ArcGIS Feature Services
 *
 * Data sources:
 *  - Transmission lines: HIFLD (69kV–765kV)
 *  - Substations: HIFLD electric power substations
 *  - Power plants: EIA Form 860 via US Energy Atlas
 *
 * Query params:
 *  - layers: comma-separated list (tx, substations, plants) — default: all
 *  - bbox: west,south,east,north — spatial filter
 *  - min_voltage: minimum kV for transmission lines (default: 0)
 *  - limit: max features per layer (default: 2000, max: 5000)
 */

// ---------------------------------------------------------------------------
// ArcGIS endpoints
// ---------------------------------------------------------------------------

const HIFLD_TX =
  "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_Electric_Power_Transmission_Lines/FeatureServer/0/query";

const HIFLD_SUBS =
  "https://services.arcgis.com/G4S1dGvn7PIgYd6Y/ArcGIS/rest/services/HIFLD_electric_power_substations/FeatureServer/0/query";

const EIA_PLANTS =
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/Power_Plants/FeatureServer/0/query";

const FETCH_TIMEOUT_MS = 30_000;
const MAX_RECORD_COUNT = 2000; // ArcGIS service limit
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.timestamp > CACHE_TTL_MS) {
    if (entry) cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// ArcGIS query helper
// ---------------------------------------------------------------------------

async function queryArcGIS(
  url: string,
  params: Record<string, string>
): Promise<GeoJSON.FeatureCollection> {
  const qs = new URLSearchParams(params).toString();
  const fullUrl = `${url}?${qs}`;

  const cacheKey = fullUrl;
  const cached = getCached(cacheKey);
  if (cached) return cached as GeoJSON.FeatureCollection;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(fullUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`ArcGIS returned ${res.status}`);

    const data = await res.json();
    setCache(cacheKey, data);
    return data as GeoJSON.FeatureCollection;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Layer-specific query builders
// ---------------------------------------------------------------------------

function buildBboxParams(bbox: string): Record<string, string> {
  return {
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326",
    outSR: "4326",
  };
}

async function fetchTransmissionLines(
  bbox?: string,
  minVoltage = 0,
  limit = MAX_RECORD_COUNT
): Promise<{ features: TransmissionLine[]; total: number }> {
  const where =
    minVoltage > 0
      ? `STATUS='IN SERVICE' AND VOLTAGE>=${minVoltage}`
      : "STATUS='IN SERVICE'";

  const params: Record<string, string> = {
    where,
    outFields: "OBJECTID,ID,TYPE,STATUS,OWNER,VOLTAGE,VOLT_CLASS,SUB_1,SUB_2",
    returnGeometry: "true",
    f: "geojson",
    resultRecordCount: String(Math.min(limit, MAX_RECORD_COUNT)),
  };

  if (bbox) Object.assign(params, buildBboxParams(bbox));

  const data = await queryArcGIS(HIFLD_TX, params);
  const features = (data.features || []).map(transformTxLine);
  return { features, total: features.length };
}

async function fetchSubstations(
  bbox?: string,
  limit = MAX_RECORD_COUNT
): Promise<{ features: Substation[]; total: number }> {
  const params: Record<string, string> = {
    where: "STATUS='IN SERVICE'",
    outFields:
      "OBJECTID,ID,NAME,CITY,STATE,TYPE,STATUS,LINES,MAX_VOLT,MIN_VOLT,LATITUDE,LONGITUDE",
    returnGeometry: "true",
    f: "geojson",
    resultRecordCount: String(Math.min(limit, MAX_RECORD_COUNT)),
  };

  if (bbox) Object.assign(params, buildBboxParams(bbox));

  const data = await queryArcGIS(HIFLD_SUBS, params);
  const features = (data.features || []).map(transformSubstation);
  return { features, total: features.length };
}

async function fetchPowerPlants(
  bbox?: string,
  limit = MAX_RECORD_COUNT
): Promise<{ features: PowerPlant[]; total: number }> {
  const params: Record<string, string> = {
    where: "1=1",
    outFields:
      "OBJECTID,Plant_Code,Plant_Name,Utility_Na,PrimSource,Total_MW,Latitude,Longitude,State,County,Sector_Nam",
    returnGeometry: "true",
    f: "geojson",
    resultRecordCount: String(Math.min(limit, MAX_RECORD_COUNT)),
  };

  if (bbox) Object.assign(params, buildBboxParams(bbox));

  const data = await queryArcGIS(EIA_PLANTS, params);
  const features = (data.features || []).map(transformPlant);
  return { features, total: features.length };
}

// ---------------------------------------------------------------------------
// Types & transformers
// ---------------------------------------------------------------------------

interface TransmissionLine {
  id: string;
  type: "transmission_line";
  owner: string | null;
  voltage_kv: number | null;
  volt_class: string | null;
  line_type: string | null;
  status: string | null;
  sub_1: string | null;
  sub_2: string | null;
  path: number[][];
}

interface Substation {
  id: string;
  type: "grid_substation";
  name: string;
  city: string | null;
  state: string | null;
  sub_type: string | null;
  status: string | null;
  lines: number | null;
  max_volt_kv: number | null;
  min_volt_kv: number | null;
  lat: number;
  lng: number;
}

interface PowerPlant {
  id: string;
  type: "grid_power_plant";
  name: string;
  utility: string | null;
  primary_source: string | null;
  total_mw: number | null;
  state: string | null;
  county: string | null;
  sector: string | null;
  lat: number;
  lng: number;
}

function transformTxLine(feat: any): TransmissionLine {
  const p = feat.properties || {};
  const voltage = p.VOLTAGE === -999999 ? null : p.VOLTAGE;
  return {
    id: `tx-${p.ID || p.OBJECTID}`,
    type: "transmission_line",
    owner: p.OWNER || null,
    voltage_kv: voltage,
    volt_class: p.VOLT_CLASS || null,
    line_type: p.TYPE || null,
    status: p.STATUS || null,
    sub_1: p.SUB_1 || null,
    sub_2: p.SUB_2 || null,
    path: feat.geometry?.coordinates || [],
  };
}

function transformSubstation(feat: any): Substation {
  const p = feat.properties || {};
  const coords = feat.geometry?.coordinates || [0, 0];
  return {
    id: `sub-${p.ID || p.OBJECTID}`,
    type: "grid_substation",
    name: p.NAME || "Unknown",
    city: p.CITY || null,
    state: p.STATE || null,
    sub_type: p.TYPE || null,
    status: p.STATUS || null,
    lines: p.LINES || null,
    max_volt_kv: p.MAX_VOLT || null,
    min_volt_kv: p.MIN_VOLT || null,
    lat: p.LATITUDE || coords[1] || 0,
    lng: p.LONGITUDE || coords[0] || 0,
  };
}

function transformPlant(feat: any): PowerPlant {
  const p = feat.properties || {};
  const coords = feat.geometry?.coordinates || [0, 0];
  return {
    id: `pp-${p.Plant_Code || p.OBJECTID}`,
    type: "grid_power_plant",
    name: p.Plant_Name || "Unknown",
    utility: p.Utility_Na || null,
    primary_source: p.PrimSource || null,
    total_mw: p.Total_MW || null,
    state: p.State || null,
    county: p.County || null,
    sector: p.Sector_Nam || null,
    lat: p.Latitude || coords[1] || 0,
    lng: p.Longitude || coords[0] || 0,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const layerParam = searchParams.get("layers") || "tx,substations,plants";
    const layers = layerParam.split(",").map((l) => l.trim());
    const bbox = searchParams.get("bbox") || undefined;
    const minVoltage = parseInt(searchParams.get("min_voltage") || "0", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "2000", 10),
      5000
    );

    const results: Record<string, unknown> = {};
    const promises: Promise<void>[] = [];

    if (layers.includes("tx")) {
      promises.push(
        fetchTransmissionLines(bbox, minVoltage, limit).then((r) => {
          results.transmission_lines = r;
        })
      );
    }

    if (layers.includes("substations")) {
      promises.push(
        fetchSubstations(bbox, limit).then((r) => {
          results.substations = r;
        })
      );
    }

    if (layers.includes("plants")) {
      promises.push(
        fetchPowerPlants(bbox, limit).then((r) => {
          results.power_plants = r;
        })
      );
    }

    await Promise.allSettled(promises);

    return NextResponse.json({
      ...results,
      layers,
      bbox: bbox || null,
      cached: false,
      sources: {
        transmission_lines: "HIFLD — Homeland Infrastructure Foundation-Level Data",
        substations: "HIFLD — Electric Power Substations",
        power_plants: "EIA — U.S. Energy Information Administration (Form 860)",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[power-grid] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
