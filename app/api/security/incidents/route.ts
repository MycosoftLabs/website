/**
 * Incidents BFF — proxies MAS 188 (the source of record), NOT a website-local DB.
 *
 * Previously this route read/wrote a website-local Postgres incident store and a
 * local hash chain, competing with MAS/MINDEX as a second source of truth. It
 * now proxies the real MAS contracts:
 *   GET   /api/incidents            → list
 *   POST  /api/incidents            → create (attributed to the caller)
 *   PATCH /api/incidents/{id}       → update
 * All methods require admin auth; every mutation carries the actor's identity.
 * The website never fabricates incidents or a "0 == healthy" state.
 *
 * @date July 22, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-auth';
import { masFetch, masBase } from '@/lib/security/soc/mas-bff';

export const dynamic = 'force-dynamic';

/** GET /api/security/incidents — list from MAS, plus real agent liveness. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  if (!masBase()) {
    return NextResponse.json(
      { error: 'MAS not configured', state: 'unavailable', incidents: null, count: null },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const limit = searchParams.get('limit') || '200';
  const q = new URLSearchParams({ limit });
  if (status) q.set('status', status);
  if (severity) q.set('severity', severity);

  // Incident list + agent heartbeat, in parallel. Agent liveness replaces the
  // page's old `active_agents || 8` fabrication with the real registered/fresh
  // counts, so the UI can never invent a runtime agent count.
  const [inc, hb] = await Promise.all([
    masFetch(`/api/incidents?${q.toString()}`),
    masFetch('/api/agents/heartbeat/summary'),
  ]);

  if (!inc.ok) {
    return NextResponse.json(
      { error: 'MAS incidents unavailable', state: 'unavailable', incidents: null, count: null,
        reason: inc.status === 0 ? 'unreachable / timed out' : `MAS returned ${inc.status}` },
      { status: 502 },
    );
  }

  const incidents = Array.isArray(inc.body?.incidents) ? inc.body.incidents : [];
  const agents = hb.ok
    ? {
        registered: hb.body?.total_registered ?? null,
        stale: hb.body?.stale_count ?? null,
        fresh: hb.body?.total_registered != null ? Math.max(0, (hb.body.total_registered ?? 0) - (hb.body.stale_count ?? 0)) : null,
        stale_after_seconds: hb.body?.stale_after_seconds ?? null,
        state: 'healthy' as const,
      }
    : { registered: null, stale: null, fresh: null, stale_after_seconds: null, state: 'unavailable' as const };

  return NextResponse.json({
    incidents,
    count: inc.body?.count ?? incidents.length,
    agents,
    source: 'MAS 188 /api/incidents',
    state: 'healthy',
    collected_at: new Date().toISOString(),
  });
}

/** POST /api/security/incidents — create in MAS, attributed to the caller. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  if (!masBase()) return NextResponse.json({ error: 'MAS not configured' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  if (!body.title || !body.description) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
  }
  const res = await masFetch('/api/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body,
      // Attribute the mutation to the authenticated operator, not a generic 'API'.
      reporter_id: auth.user.email,
      reporter_name: auth.user.email,
    }),
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: 'MAS incident create failed', reason: res.status === 0 ? 'unreachable' : `MAS ${res.status}` },
      { status: 502 },
    );
  }
  return NextResponse.json(res.body ?? { ok: true }, { status: 201 });
}

/** PATCH /api/security/incidents — update an incident in MAS. */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  if (!masBase()) return NextResponse.json({ error: 'MAS not configured' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'Incident ID is required' }, { status: 400 });

  const { id: _omit, ...updates } = body;
  const res = await masFetch(`/api/incidents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...updates, actor: auth.user.email, actor_id: auth.user.email }),
  });
  if (res.status === 404) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  if (!res.ok) {
    return NextResponse.json(
      { error: 'MAS incident update failed', reason: res.status === 0 ? 'unreachable' : `MAS ${res.status}` },
      { status: 502 },
    );
  }
  return NextResponse.json(res.body ?? { ok: true });
}
