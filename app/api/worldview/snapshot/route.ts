/**
 * WorldView snapshot aggregator — Apr 21, 2026
 *
 * Morgan: "check on how worldview api needs to be updated to get all of
 * this new live data from crep/mindex pipline".
 *
 * One-shot JSON aggregator that stitches CREP's live entity pumps +
 * project-specific data + MINDEX middleware status into a single
 * response consumable by MYCA voice, PersonaPlex, external dashboards,
 * or any third-party system that needs CREP state without polling
 * 15 endpoints.
 *
 * Fans out to:
 *   • /api/oei/flightradar24   — live aircraft count
 *   • /api/oei/aisstream       — live vessel count
 *   • /api/oei/satellites      — live satellite count
 *   • /api/oei/buoys           — NDBC buoy count
 *   • /api/oei/military        — military facility count
 *   • /api/crep/mojave         — Project Goffs full payload
 *   • /api/crep/tijuana-estuary — Project Oyster full payload
 *   • /api/eagle/sources       — Eagle Eye camera source count
 *   • MINDEX /health           — infra reachability
 *   • MAS 8001 /health         — middleware reachability
 *   • Earth-2 legion GET /health (EARTH2_API_URL, default 249:8220)
 *
 * Query params:
 *   ?project=oyster|goffs|global  (default global)
 *
 * Edge cache 30 s — fresh enough for situational awareness, lowers
 * origin load when many consumers pull simultaneously.
 *
 * @route GET /api/worldview/snapshot?project=...
 */

import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"
import { resolveInternalBaseUrl } from "@/lib/internal-base-url"
import { resolveEarth2ApiBaseUrl, VOICE_ENDPOINTS } from "@/lib/config/api-urls"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MINDEX_URL = resolveMindexServerBaseUrl()
const MAS_URL = resolveMasServerBaseUrl()
const EARTH2_BASE = resolveEarth2ApiBaseUrl()

// Safe-fetch helper: returns null on error, never throws.
async function safeJson(url: string, timeoutMs = 8000): Promise<any | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

async function headReachable(url: string, timeoutMs = 3000): Promise<{ ok: boolean; ms: number }> {
  const t0 = Date.now()
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    return { ok: r.ok, ms: Date.now() - t0 }
  } catch { return { ok: false, ms: Date.now() - t0 } }
}

export async function GET(req: NextRequest) {
  const started = Date.now()
  const project = (req.nextUrl.searchParams.get("project") || "global").toLowerCase()

  const origin = resolveInternalBaseUrl(new URL(req.url).origin)

  // Fan-out all fetches in parallel
  const [
    aircraft, vessels, satellites, buoys, military,
    oyster, goffs, eagleSources, h2s,
    mindexHealth, masHealth, earth2Health,
  ] = await Promise.all([
    safeJson(`${origin}/api/oei/flightradar24`, 10_000),
    safeJson(`${origin}/api/oei/aisstream`, 10_000),
    safeJson(`${origin}/api/oei/satellites?category=active&mode=registry`, 10_000),
    safeJson(`${origin}/api/oei/buoys`, 10_000),
    safeJson(`${origin}/api/oei/military`, 10_000),
    (project === "oyster" || project === "global") ? safeJson(`${origin}/api/crep/tijuana-estuary`, 15_000) : Promise.resolve(null),
    (project === "goffs"  || project === "global") ? safeJson(`${origin}/api/crep/mojave`, 15_000) : Promise.resolve(null),
    safeJson(`${origin}/api/eagle/sources?limit=5000`, 15_000),
    safeJson(`${origin}/api/crep/sdapcd/h2s`, 10_000),
    headReachable(`${MINDEX_URL}/health`),
    headReachable(`${MAS_URL}/health`),
    headReachable(`${EARTH2_BASE}/health`),
  ])

  // Normalize entity counts — different connectors return different shapes
  const aircraftCount = aircraft?.aircraft?.length ?? aircraft?.total ?? 0
  const vesselCount   = vessels?.vessels?.length   ?? vessels?.total   ?? 0
  const satCount      = satellites?.satellites?.length ?? satellites?.total ?? 0
  const buoyCount     = buoys?.buoys?.length       ?? buoys?.total     ?? 0
  const milCount      = military?.facilities?.length ?? military?.total ?? 0
  const eagleCount    = eagleSources?.total ?? eagleSources?.sources?.length ?? 0

  const oysterSummary = oyster ? {
    anchor: oyster.oyster || null,
    cameras: oyster.cameras?.length ?? 0,
    cameras_with_stream: (oyster.cameras || []).filter((c: any) => c.has_stream).length,
    broadcast: oyster.broadcast?.length ?? 0,
    cell_towers: oyster.cell_towers?.length ?? 0,
    power: oyster.power?.length ?? 0,
    rails: oyster.rails?.length ?? 0,
    caves: oyster.caves?.length ?? 0,
    government: oyster.government?.length ?? 0,
    tourism: oyster.tourism?.length ?? 0,
    sensors: oyster.sensors?.length ?? 0,
    sensor_breakdown: (oyster.sensors || []).reduce((acc: Record<string, number>, s: any) => {
      acc[s.kind || "other"] = (acc[s.kind || "other"] || 0) + 1
      return acc
    }, {}),
    pfm_plume_active: !!oyster.plume?.core,
    pfm_flow_m3s: oyster.plume?.current_flow_m3s ?? null,
    emit_plumes: oyster.emit_plumes?.length ?? 0,
    inat_observations: oyster.inat_observations?.length ?? 0,
    sources_used: oyster.sources_used ?? [],
  } : null

  const goffsSummary = goffs ? {
    anchor: goffs.goffs || null,
    preserve_unit: goffs.preserve?.unit_code || null,
    wilderness_pois: goffs.wilderness_pois?.length ?? 0,
    climate_stations: goffs.climate_stations?.length ?? 0,
    climate_live_observations: (goffs.climate_stations || []).filter((s: any) => s.observation).length,
    cameras: goffs.cameras?.length ?? 0,
    broadcast: goffs.broadcast?.length ?? 0,
    cell_towers: goffs.cell_towers?.length ?? 0,
    power: goffs.power?.length ?? 0,
    rails: goffs.rails?.length ?? 0,
    caves: goffs.caves?.length ?? 0,
    government: goffs.government?.length ?? 0,
    tourism: goffs.tourism?.length ?? 0,
    sensors: goffs.sensors?.length ?? 0,
    inat_observations: goffs.inat_observations?.length ?? 0,
  } : null

  const body = {
    generated_at: new Date().toISOString(),
    latency_ms: Date.now() - started,
    project,

    live_entities: {
      aircraft: aircraftCount,
      vessels: vesselCount,
      satellites: satCount,
      buoys: buoyCount,
      military_facilities: milCount,
      eagle_video_sources: eagleCount,
    },

    projects: {
      oyster: oysterSummary,
      goffs:  goffsSummary,
    },

    // Apr 22, 2026 — SDAPCD TJ River Valley H₂S, sourced from UCSD
    // airborne.ucsd.edu (PNG charts only, proxied + cached server-side
    // via /api/crep/sdapcd/h2s/chart?id=...). "stations" array has
    // latest numeric ppb when a structured upstream (OpenAQ / AirNow)
    // returns it; "charts" lists the 6 live PNG endpoints any consumer
    // can <img src=...>.
    tjrv_h2s: h2s ? {
      source: h2s.source,
      station_count: Array.isArray(h2s.stations) ? h2s.stations.length : 0,
      chart_count: Array.isArray(h2s.charts) ? h2s.charts.length : 0,
      stations: h2s.stations || [],
      charts: h2s.charts || [],
      timestamp: h2s.timestamp,
    } : null,

    middleware: {
      mindex: {
        url: MINDEX_URL,
        reachable: mindexHealth.ok,
        latency_ms: mindexHealth.ms,
      },
      mas: {
        url: MAS_URL,
        reachable: masHealth.ok,
        latency_ms: masHealth.ms,
      },
      earth2_api: {
        url: EARTH2_BASE,
        reachable: earth2Health.ok,
        latency_ms: earth2Health.ms,
        note: "Override with EARTH2_API_URL; Earth-2 legion defaults GPU_EARTH2_IP:8220.",
      },
      personaplex_voice: {
        url: VOICE_ENDPOINTS.CREP_BRIDGE_WS,
        // PersonaPlex WS can't be HEAD-probed from here — consumer-side
        // breaker state is the real indicator.
        reachable: null,
        note: "Probed client-side only; set CREP_BRIDGE_WS for runtime URL (avoids build-time inlining).",
      },
      shinobi: {
        url: process.env.SHINOBI_URL || "http://192.168.0.188:8080",
        reachable: null,
        note: "Shinobi monitor list pulled via /api/eagle/connectors/shinobi when keys are configured.",
      },
    },

    usage: {
      consumers: [
        "MYCA voice bridge (PersonaPlex) — situational awareness snapshot",
        "External dashboards (single-poll alternative to 10+ endpoints)",
        "Ops monitoring / health-check aggregator",
      ],
      auth: "None (public snapshot)",
      recommended_poll_interval_s: 30,
    },
  }

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  })
}
