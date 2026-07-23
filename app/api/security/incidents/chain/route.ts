/**
 * Incident Chain BFF — proxies MAS 188 per-incident chains.
 *
 * MAS is the source of record and exposes a per-incident chain
 * (`GET /api/incidents/{id}/chain`). It does NOT (yet) expose a single global
 * verified ledger with a Merkle anchor, so this route composes a global view by
 * fanning out over the current incidents, and reports chain verification as
 * `unknown` rather than fabricating `integrity_verified: true`.
 *
 * TODO(MAS contract): a global chain/ledger endpoint with a verified Merkle root
 * would let us report true integrity state instead of `unknown`.
 *
 * @date July 22, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-auth';
import { masFetch, masBase } from '@/lib/security/soc/mas-bff';

export const dynamic = 'force-dynamic';

const FANOUT_CAP = 50; // bound the per-incident chain fan-out

type ChainEntry = Record<string, unknown>;

async function composeGlobalChain(limit: number): Promise<{ entries: ChainEntry[]; incidents: number; truncated: boolean }> {
  const list = await masFetch('/api/incidents?limit=500');
  const incidents: Array<{ id?: string }> = Array.isArray(list.body?.incidents) ? list.body.incidents : [];
  const ids = incidents.map((i) => i.id).filter((x): x is string => !!x);
  const truncated = ids.length > FANOUT_CAP;
  const chains = await Promise.all(
    ids.slice(0, FANOUT_CAP).map(async (id) => {
      const c = await masFetch(`/api/incidents/${encodeURIComponent(id)}/chain`);
      const raw = c.ok ? c.body : null;
      const arr: ChainEntry[] = Array.isArray(raw?.chain) ? raw.chain : Array.isArray(raw?.entries) ? raw.entries : [];
      return arr.map((e) => ({ ...e, incident_id: (e as { incident_id?: string }).incident_id ?? id }));
    }),
  );
  const entries = chains.flat().sort((a, b) => {
    const sa = Number((a as { sequence_number?: number }).sequence_number ?? 0);
    const sb = Number((b as { sequence_number?: number }).sequence_number ?? 0);
    if (sa !== sb) return sb - sa;
    const ta = new Date(String((a as { created_at?: string }).created_at ?? 0)).getTime();
    const tb = new Date(String((b as { created_at?: string }).created_at ?? 0)).getTime();
    return tb - ta;
  });
  return { entries: entries.slice(0, limit), incidents: ids.length, truncated };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  if (!masBase()) {
    return NextResponse.json({ error: 'MAS not configured', state: 'unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'entries';
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const incidentId = searchParams.get('incident_id') || undefined;

  try {
    // A specific incident's chain proxies MAS directly.
    if (incidentId) {
      const c = await masFetch(`/api/incidents/${encodeURIComponent(incidentId)}/chain`);
      if (!c.ok) {
        return NextResponse.json(
          { error: 'MAS chain unavailable', state: 'unavailable', entries: [], reason: c.status === 0 ? 'unreachable' : `MAS ${c.status}` },
          { status: 502 },
        );
      }
      const arr: ChainEntry[] = Array.isArray(c.body?.chain) ? c.body.chain : Array.isArray(c.body?.entries) ? c.body.entries : [];
      return NextResponse.json({ entries: arr, count: arr.length, source: `MAS 188 /api/incidents/${incidentId}/chain`, state: 'healthy' });
    }

    switch (action) {
      case 'entries': {
        const { entries, incidents, truncated } = await composeGlobalChain(limit);
        return NextResponse.json({
          entries,
          count: entries.length,
          incidents_scanned: incidents,
          truncated,
          source: 'MAS 188 per-incident chains (composed)',
          state: 'healthy',
          collected_at: new Date().toISOString(),
        });
      }
      case 'verify': {
        // MAS has no global verify contract. Report honestly rather than assert
        // integrity. An empty ledger is NOT "verified".
        const { incidents } = await composeGlobalChain(1);
        return NextResponse.json({
          verified: null,
          state: 'unknown',
          incidents_scanned: incidents,
          reason: 'MAS exposes per-incident chains only; no global verified-root contract yet',
          source: 'MAS 188',
        });
      }
      case 'stats': {
        const { entries, incidents } = await composeGlobalChain(1000);
        const hourAgo = Date.now() - 3600000;
        return NextResponse.json({
          chain: {
            total_entries: entries.length,
            entries_last_hour: entries.filter((e) => new Date(String((e as { created_at?: string }).created_at ?? 0)).getTime() > hourAgo).length,
            latest_hash: (entries[0] as { event_hash?: string })?.event_hash ?? '',
            latest_sequence: (entries[0] as { sequence_number?: number })?.sequence_number ?? 0,
            last_merkle_anchor: null,
            integrity_verified: null, // never fabricated — see verify action
            incidents_scanned: incidents,
          },
          source: 'MAS 188 per-incident chains (composed)',
          state: 'healthy',
        });
      }
      default:
        return NextResponse.json({ error: 'Invalid action. Use: entries, verify, stats' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Chain BFF] error:', error);
    return NextResponse.json({ error: 'Failed to process chain request', state: 'unavailable' }, { status: 502 });
  }
}
