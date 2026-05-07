import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SERVICE_BASES = [
  process.env.MYCOBRAIN_SERVICE_URL,
  process.env.MYCOBRAIN_API_URL,
  process.env.MAS_API_URL,
  process.env.NEXT_PUBLIC_MAS_API_URL,
].filter(Boolean).map(base => base!.replace(/\/$/, ''));

const TELEMETRY_PATHS = [
  '/api/mycobrain/telemetry?limit=50',
  '/mycobrain/telemetry?limit=50',
  '/api/mycobrain/data?limit=50',
  '/mycobrain/data?limit=50',
];

function normalizeRows(payload: any): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.telemetry)) return payload.telemetry;
  return [];
}

export async function GET() {
  for (const base of SERVICE_BASES) {
    for (const path of TELEMETRY_PATHS) {
      try {
        const response = await fetch(`${base}${path}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        });

        if (!response.ok) continue;

        const rows = normalizeRows(await response.json());
        if (rows.length) {
          return NextResponse.json(rows, { headers: { 'x-nlm-data-source': 'service' } });
        }
      } catch {
        // Continue through known real telemetry endpoints.
      }
    }
  }

  return NextResponse.json([], { headers: { 'x-nlm-data-source': 'empty' } });
}
