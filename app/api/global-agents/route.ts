import { NextResponse } from 'next/server';
import { resolveMindexServerBaseUrl } from '@/lib/mindex-base-url';

export async function GET() {
  try {
    // --------------------------------------------------------------------------
    // MYCOSOFT ARCHITECTURE CONSTRAINT:
    // ALL telemetry and external index data MUST be stored, normalized, and 
    // served by the MINDEX API. We no longer pull directly from external APIs 
    // or local static JSON files in the frontend repository.
    // --------------------------------------------------------------------------
    
    // Call the MINDEX internal ETL pipeline which handles normalization and database/registry tracking.
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
    return NextResponse.json({ ...data, sources: { ...data.sources, mindex_global_agents: { ok: true } } });
    
  } catch (e) {
    console.error('Failed to fetch from MINDEX telemetry pipeline', e);
  }

  return NextResponse.json({
    x402: {
      transactions: null,
      volumeUsdc: null,
      activeSellers: null,
      activeBuyers: null,
    },
    agent_internet: {
      agents: null,
      discussions: null,
      upvotes: null,
      sandboxes: null,
      m2mRequests: null,
      m2mRequestsDaily: null,
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
