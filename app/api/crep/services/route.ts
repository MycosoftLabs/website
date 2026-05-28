/**
 * CREP Services Status API
 *
 * Pings all known service endpoints and returns real health status.
 * Used by the Services tab in the CREP right panel.
 *
 * @route GET /api/crep/services
 */

import { NextResponse } from "next/server"
import net from "node:net"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ServiceStatus {
  name: string;
  url: string;
  status: "online" | "degraded" | "offline";
  responseTimeMs: number;
  details?: string;
}

interface ServiceProbe {
  name: string;
  url: string;
  healthPath: string;
  external?: boolean;
  tcp?: boolean;
  method?: "GET" | "HEAD";
  accept?: string;
  timeoutMs?: number;
}

const SERVICES = [
  { name: "MINDEX", url: resolveMindexServerBaseUrl(), healthPath: "/health" },
  { name: "MAS Orchestrator", url: resolveMasServerBaseUrl(), healthPath: "/health" },
  { name: "n8n Workflows", url: process.env.N8N_URL || "http://localhost:5678", healthPath: "/healthz" },
  { name: "Redis", url: process.env.REDIS_URL || "redis://localhost:6379", healthPath: "", tcp: true },
  { name: "Postgres", url: process.env.DATABASE_URL || process.env.POSTGRES_URL || "postgres://localhost:5432", healthPath: "", tcp: true },
  { name: "Qdrant Vector DB", url: process.env.QDRANT_URL || "http://localhost:6333", healthPath: "/healthz" },
  { name: "FlightRadar24", url: "https://data-cloud.flightradar24.com", healthPath: "/zones/fcgi/feed.js?faa=1&bounds=33,-117,34,-116", external: true },
  { name: "NOAA SWPC", url: "https://services.swpc.noaa.gov", healthPath: "/products/noaa-scales.json", external: true },
  { name: "iNaturalist", url: "https://api.inaturalist.org", healthPath: "/v1/observations?per_page=1&quality_grade=research", external: true },
  { name: "NASA GIBS", url: "https://gibs.earthdata.nasa.gov", healthPath: "/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml", external: true, method: "HEAD", accept: "text/xml", timeoutMs: 10000 },
  { name: "Overpass API", url: "https://overpass.kumi.systems", healthPath: "/api/status", external: true, accept: "text/plain", timeoutMs: 10000 },
  { name: "CelesTrak", url: "https://celestrak.org", healthPath: "/NORAD/elements/gp.php?GROUP=stations&FORMAT=json", external: true, timeoutMs: 12000 },
] satisfies ServiceProbe[];

function tcpProbe(url: string, timeoutMs = 3000): Promise<ServiceStatus> {
  const start = Date.now();
  return new Promise((resolve) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      resolve({
        name: "tcp",
        url,
        status: "degraded",
        responseTimeMs: 0,
        details: "Invalid TCP URL",
      });
      return;
    }

    const socket = net.createConnection({
      host: parsed.hostname || "localhost",
      port: Number(parsed.port || (parsed.protocol.startsWith("postgres") ? 5432 : 6379)),
    });

    const finish = (status: ServiceStatus["status"], details: string) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve({
        name: "tcp",
        url,
        status,
        responseTimeMs: Date.now() - start,
        details,
      });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish("online", "TCP connection accepted"));
    socket.once("timeout", () => finish("degraded", "TCP connection timed out"));
    socket.once("error", (err) => finish("offline", err.message.slice(0, 80)));
  });
}

async function pingService(
  svc: ServiceProbe,
): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    if (svc.tcp) {
      const status = await tcpProbe(svc.url, svc.timeoutMs);
      return { ...status, name: svc.name };
    }

    const url = svc.healthPath ? `${svc.url}${svc.healthPath}` : svc.url;
    const res = await fetch(url, {
      method: svc.method || "GET",
      signal: AbortSignal.timeout(svc.timeoutMs || (svc.external ? 10000 : 5000)),
      headers: { Accept: svc.accept || "application/json, text/plain, */*" },
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
