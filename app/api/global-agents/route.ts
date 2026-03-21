import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // --------------------------------------------------------------------------
    // MYCOSOFT ARCHITECTURE CONSTRAINT:
    // ALL telemetry and external index data MUST be stored, normalized, and 
    // served by the MINDEX API. We no longer pull directly from external APIs 
    // or local static JSON files in the frontend repository.
    // --------------------------------------------------------------------------
    
    // Call the MINDEX internal ETL pipeline which handles normalization and database/registry tracking.
    const res = await fetch('http://127.0.0.1:8000/api/mindex/telemetry/global-agents', {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.MINDEX_API_KEY || 'test_key' 
      },
      next: { revalidate: 60 } // Cache locally for 1 minute
    });
    
    if (!res.ok) {
        throw new Error(`MINDEX returned ${res.status}`);
    }
    
    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (e) {
    console.error('Failed to fetch from MINDEX telemetry pipeline', e);
    // Fallback empty structure avoiding mock data
    return NextResponse.json({
        x402: { transactions: 0, volumeUsdc: 0, activeSellers: 0, activeBuyers: 0 },
        models: { mycosoft_active: [], global_top_frontier: [] },
        frameworks: { openClawCore: "Decentralized", anthropicLocal: "Untracked" }
    });
  }
}
