/**
 * CREP Services Status API
 *
 * Pings all known service endpoints and returns real health status.
 * Used by the Services tab in the CREP right panel.
 *
 * @route GET /api/crep/services
 */

import { NextResponse } from "next/server";

interface ServiceStatus {
  name: string;
  url: string;
  status: "online" | "degraded" | "offline";
  responseTimeMs: number;
  details?: string;
}

const SERVICES = [
  { name: "MINDEX", url: process.env.MINDEX_API_URL || "http://localhost:8000", healthPath: "/api/mindex/health" },
  { name: "MAS Orchestrator", url: process.env.MAS_API_URL || "http://localhost:8001", healthPath: "/health" },
  { name: "n8n Workflows", url: process.env.N8N_URL || "http://localhost:5678", healthPath: "/healthz" },
  { name: "Redis", url: process.env.REDIS_URL || "http://localhost:6379", healthPath: "", ping: true },
  { name: "Qdrant Vector DB", url: process.env.QDRANT_URL || "http://localhost:6333", healthPath: "/healthz" },
  { name: "Earth-2 Weather", url: process.env.EARTH2_URL || "http://localhost:8080", healthPath: "/health" },
  { name: "FlightRadar24", url: "https://data-cloud.flightradar24.com", healthPath: "/zones/fcgi/feed.js?faa=1&bounds=33,-117,34,-116", external: true },
  { name: "NOAA SWPC", url: "https://services.swpc.noaa.gov", healthPath: "/products/noaa-scales.json", external: true },
  { name: "iNaturalist", url: "https://api.inaturalist.org", healthPath: "/v1/observations?per_page=1&quality_grade=research", external: true },
  { name: "NASA GIBS", url: "https://gibs.earthdata.nasa.gov", healthPath: "/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml", external: true },
  { name: "Overpass API", url: "https://overpass-api.de", healthPath: "/api/status", external: true },
  { name: "CelesTrak", url: "https://celestrak.org", healthPath: "/NORAD/elements/gp.php?GROUP=stations&FORMAT=json", external: true },
];

async function pingService(
  svc: typeof SERVICES[number],
): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const url = svc.healthPath ? `${svc.url}${svc.healthPath}` : svc.url;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
    const elapsed = Date.now() - start;

    if (res.ok) {
      return {
        name: svc.name,
        url: svc.url,
        status: elapsed > 3000 ? "degraded" : "online",
        responseTimeMs: elapsed,
        details: `HTTP ${res.status}`,
      };
    }
    return {
      name: svc.name,
      url: svc.url,
      status: "degraded",
      responseTimeMs: elapsed,
      details: `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      name: svc.name,
      url: svc.url,
      status: "offline",
      responseTimeMs: Date.now() - start,
      details: (err as Error).message?.slice(0, 80),
    };
  }
}

// Cache for 30 seconds
let cache: { data: ServiceStatus[]; ts: number } | null = null;
const CACHE_TTL = 30_000;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({
      services: cache.data,
      cached: true,
      timestamp: new Date().toISOString(),
    });
  }

  const results = await Promise.all(SERVICES.map(pingService));

  cache = { data: results, ts: Date.now() };

  return NextResponse.json({
    services: results,
    summary: {
      online: results.filter((s) => s.status === "online").length,
      degraded: results.filter((s) => s.status === "degraded").length,
      offline: results.filter((s) => s.status === "offline").length,
      total: results.length,
    },
    cached: false,
    timestamp: new Date().toISOString(),
  });
}
