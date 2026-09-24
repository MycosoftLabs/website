import { NextResponse } from 'next/server';
import { resolveMindexServerBaseUrl } from '@/lib/mindex-base-url';
import { fetchJson, fetchMasNlmConsole, mindexServiceHeaders } from '@/lib/nlm/mas-nlm-live';

export const dynamic = 'force-dynamic';

const MINDEX_BASE_URL = resolveMindexServerBaseUrl();

function withSource(data: unknown[], source: string) {
  return NextResponse.json(data, { headers: { 'x-nlm-data-source': source } });
}

function asEntry(row: Record<string, any>, type: string, index: number) {
  const name =
    row.canonical_name ||
    row.scientific_name ||
    row.name ||
    row.common_name ||
    row.title ||
    row.id ||
    `${type}-${index}`;
  return {
    id: String(row.id || row.taxon_id || row.compound_id || `${type}-${index}`),
    source: String(row.source || 'mindex'),
    type,
    data: row,
    timestamp: row.updated_at || row.created_at || row.timestamp || new Date().toISOString(),
    merkle_root: row.merkle_root || null,
    label: name,
  };
}

function normalizeRows(payload: any): Record<string, any>[] {
  if (Array.isArray(payload)) return payload.filter((row) => row && typeof row === 'object');
  if (!payload || typeof payload !== 'object') return [];
  for (const key of ['items', 'taxa', 'compounds', 'data', 'results', 'rows', 'observations']) {
    if (Array.isArray(payload[key])) {
      return payload[key].filter((row: unknown) => row && typeof row === 'object');
    }
  }
  return [];
}

export async function GET() {
  const consolePayload = await fetchMasNlmConsole();
  const consoleTaxa = Array.isArray(consolePayload?.mindex?.taxa) ? consolePayload.mindex.taxa : [];
  const consoleCompounds = Array.isArray(consolePayload?.mindex?.compounds)
    ? consolePayload.mindex.compounds
    : [];

  if (consoleTaxa.length || consoleCompounds.length) {
    const rows = [
      ...consoleTaxa.map((row, index) => asEntry(row, 'taxon', index)),
      ...consoleCompounds.map((row, index) => asEntry(row, 'compound', index)),
    ];
    return withSource(rows, 'mas-nlm-console');
  }

  if (MINDEX_BASE_URL) {
    const headers = mindexServiceHeaders();
    const taxa = normalizeRows(
      await fetchJson(MINDEX_BASE_URL, [
        '/api/mindex/taxa?limit=50&order=desc&order_by=observations_count',
      ], 8000, headers),
    );
    const compounds = normalizeRows(
      await fetchJson(MINDEX_BASE_URL, ['/api/mindex/compounds?limit=25'], 8000, headers),
    );
    if (taxa.length || compounds.length) {
      const rows = [
        ...taxa.map((row, index) => asEntry(row, 'taxon', index)),
        ...compounds.map((row, index) => asEntry(row, 'compound', index)),
      ];
      return withSource(rows, 'mindex-api');
    }
  }

  return withSource([], 'empty-from-source');
}

/**
 * POST frame commit / NMF proxy — forwards to MINDEX when available.
 * Never invents Merkle roots client-side.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = String(body.type || 'frame')
  const masBase =
    process.env.MAS_API_URL ||
    process.env.NEXT_PUBLIC_MAS_API_URL ||
    'http://192.168.0.188:8001'

  // Prefer MAS Merkle attestation endpoint
  try {
    const res = await fetch(`${masBase.replace(/\/$/, '')}/api/nlm/training/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      return NextResponse.json(await res.json(), { status: 201 })
    }
  } catch {
    // fall through
  }

  if (MINDEX_BASE_URL && type === 'frame_commit') {
    try {
      const headers = {
        ...mindexServiceHeaders(),
        'Content-Type': 'application/json',
      }
      const res = await fetch(`${MINDEX_BASE_URL.replace(/\/$/, '')}/nlm/nmf`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          packet: body,
          source_id: String(body.modelId || body.source_device || 'nlm-ui'),
          anomaly_score: 0,
        }),
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(
          {
            ...data,
            note: 'Persisted NMF to MINDEX; Merkle attestation pending if MAS attest offline',
          },
          { status: 201 }
        )
      }
    } catch {
      // fall through
    }
  }

  return NextResponse.json(
    {
      error: 'Frame commit unavailable',
      detail: 'MAS attest and MINDEX NMF both unreachable. No synthetic Merkle root created.',
      type,
    },
    { status: 503 }
  )
}
