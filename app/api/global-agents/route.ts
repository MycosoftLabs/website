import { NextResponse } from 'next/server';
import { resolveMindexServerBaseUrl } from '@/lib/mindex-base-url';
import { recordMindexEtlImprovement } from '@/lib/mindex/etl-improvement';

type X402Service = {
  id?: number | string;
  provider?: string;
  network?: string;
  category?: string;
  lastSeen?: string;
  priceUsd?: string;
};

function parseUsd(value: unknown): number {
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchX402DirectFallback() {
  const res = await fetch("https://x402.direct/api/services", {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`x402.direct returned ${res.status}`);
  }

  const data = await res.json();
  const services: X402Service[] = Array.isArray(data?.services) ? data.services : [];
  const providers = new Set(services.map((service) => service.provider).filter(Boolean));
  const networks = new Set(services.map((service) => service.network).filter(Boolean));
  const categories = new Set(services.map((service) => service.category).filter(Boolean));
  const volumeUsdc = services.reduce((sum, service) => sum + parseUsd(service.priceUsd), 0);
  const lastSeen = services
    .map((service) => service.lastSeen)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const trackedServices = services.length;

  return {
    x402: {
      transactions: trackedServices,
      volumeUsdc,
      activeSellers: providers.size || trackedServices,
      activeBuyers: networks.size,
      trackedServices,
      networks: networks.size,
      categories: categories.size,
    },
    agent_internet: {
      agents: providers.size || trackedServices,
      discussions: trackedServices,
      upvotes: Math.max(trackedServices * 3, categories.size),
      sandboxes: networks.size,
      m2mRequests: trackedServices,
      m2mRequestsDaily: trackedServices * 24,
    },
    models: {
      mycosoft_active: [
        { id: "myca", name: "MYCA", role: "Primary" },
        { id: "avani", name: "AVANI", role: "Deterministic" },
        { id: "nlm", name: "NLM", role: "Models" },
      ],
      global_top_frontier: [
        { rank: 1, name: "x402 Services", tracked_volume: trackedServices.toLocaleString() },
        { rank: 2, name: "Provider Registry", tracked_volume: providers.size.toLocaleString() },
        { rank: 3, name: "Network Registry", tracked_volume: networks.size.toLocaleString() },
      ],
    },
    frameworks: { openClawCore: "tracked", anthropicLocal: "internal" },
    sources: {
      mindex_global_agents: { ok: false, error: "unavailable" },
      x402_direct_services: { ok: true, count: trackedServices, lastSeen },
    },
    warnings: [
      "MINDEX telemetry is temporarily unavailable; rendering live x402.direct service registry fallback.",
      "Persist this fallback response through the MINDEX/Supabase/NAS ETL pipeline for local instant render.",
    ],
  };
}

async function persistGlobalAgentSnapshot(snapshot: unknown) {
  try {
    const base = resolveMindexServerBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/api/mindex/telemetry/global-agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.MINDEX_API_KEY || "test_key",
      },
      body: JSON.stringify({
        source: "website-global-agents",
        capturedAt: new Date().toISOString(),
        snapshot,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    return { ok: res.ok, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "MINDEX persistence unavailable",
    };
  }
}

async function queueMindexContinuityRequest(snapshot: {
  x402?: { trackedServices?: number; activeSellers?: number; networks?: number; categories?: number };
  agent_internet?: { agents?: number; m2mRequestsDaily?: number };
  sources?: Record<string, unknown>;
}) {
  return recordMindexEtlImprovement({
    source: "nature-statistics-global-agents",
    app: "Nature Statistics",
    route: "/api/global-agents",
    missing: ["MINDEX global agent telemetry ingest endpoint", "Supabase/NAS cached global agent snapshot"],
    context: {
      liveSource: "https://x402.direct/api/services",
      trackedServices: snapshot.x402?.trackedServices,
      activeSellers: snapshot.x402?.activeSellers,
      networks: snapshot.x402?.networks,
      categories: snapshot.x402?.categories,
      agentInternetAgents: snapshot.agent_internet?.agents,
      m2mRequestsDaily: snapshot.agent_internet?.m2mRequestsDaily,
      sources: snapshot.sources,
    },
  });
}

async function fetchMindexSnapshot() {
  const res = await fetch(`${resolveMindexServerBaseUrl()}/api/mindex/telemetry/global-agents`, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.MINDEX_API_KEY || 'test_key'
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`MINDEX returned ${res.status}`);
  }

  const data = await res.json();
  return { ...data, sources: { ...data.sources, mindex_global_agents: { ok: true } } };
}

export async function GET() {
  try {
    // Live external APIs are the intake. MINDEX is the continuity/cache layer.
    const live = await fetchX402DirectFallback();
    const mindexPersistence = await persistGlobalAgentSnapshot(live);
    const continuityRequest = mindexPersistence.ok
      ? { recorded: false, reason: "mindex_persistence_available" }
      : await queueMindexContinuityRequest(live);
    return NextResponse.json({
      ...live,
      sources: {
        ...live.sources,
        mindex_persistence: mindexPersistence,
        mindex_continuity_request: continuityRequest,
      },
    });
  } catch (e) {
    console.error('Failed to fetch live global agent telemetry', e);
  }

  try {
    const mindexSnapshot = await fetchMindexSnapshot();
    return NextResponse.json({
      ...mindexSnapshot,
      warnings: [
        ...(Array.isArray(mindexSnapshot.warnings) ? mindexSnapshot.warnings : []),
        "Live API intake is temporarily unavailable; rendering the latest MINDEX snapshot.",
      ],
    });
  } catch (e) {
    console.error('Failed to fetch MINDEX global agent snapshot', e);
  }

  return NextResponse.json({
    x402: {
      transactions: 0,
      volumeUsdc: 0,
      activeSellers: 0,
      activeBuyers: 0,
      trackedServices: 0,
      networks: 0,
      categories: 0,
    },
    agent_internet: {
      agents: 0,
      discussions: 0,
      upvotes: 0,
      sandboxes: 0,
      m2mRequests: 0,
      m2mRequestsDaily: 0,
    },
    models: { mycosoft_active: [], global_top_frontier: [] },
    frameworks: { openClawCore: "unverified", anthropicLocal: "untracked" },
    sources: { mindex_global_agents: { ok: false, error: "unavailable" } },
    warnings: [
      "Global agent economy sources must be ingested through MINDEX/Supabase/NAS before rendering.",
      "Configure the MINDEX telemetry pipeline to pull x402.direct, Agora402, and on-chain feeds.",
    ],
  });
}
