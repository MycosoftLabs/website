import { NextRequest, NextResponse } from 'next/server';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { ingestNormalizedOpportunities } from '@/lib/launchpad/radar/ingest';
import { isLaunchpadEnabled } from '@/lib/launchpad/flags';
import { authorizeIngestBearer } from '@/lib/launchpad/api-keys';

/**
 * Contract Radar ingest.
 * Preferred: Authorization: Bearer lp_… (launchpad_api_keys scope=ingest).
 * Break-glass (deprecated): Bearer LAUNCHPAD_INGEST_TOKEN platform env.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isLaunchpadEnabled()) {
    return NextResponse.json({ error: 'Not found', code: 'launchpad_disabled' }, { status: 404 });
  }

  let svc: ReturnType<typeof createLaunchpadServiceClient> | null = null;
  try {
    svc = createLaunchpadServiceClient();
  } catch {
    // Service role may still be missing for break-glass-only path; authorizeIngestBearer handles it.
    svc = null;
  }

  const auth = await authorizeIngestBearer(svc, request.headers.get('authorization'));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
  }

  if (!svc) {
    try {
      svc = createLaunchpadServiceClient();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'service role not configured';
      return NextResponse.json({ error: 'service role not configured', detail: message }, { status: 503 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const records = (body as { records?: unknown })?.records;
  if (!Array.isArray(records)) {
    return NextResponse.json(
      { error: 'body must be { records: NormalizedOpportunity[] }' },
      { status: 400 },
    );
  }
  if (records.length === 0) {
    return NextResponse.json({
      ok: true,
      accepted: 0,
      upsertedIds: [],
      amendments: 0,
      matchesWritten: 0,
      authMode: auth.mode,
    });
  }
  if (records.length > 500) {
    return NextResponse.json({ error: 'batch too large (max 500)' }, { status: 413 });
  }

  try {
    const outcome = await ingestNormalizedOpportunities(svc, records);
    return NextResponse.json({
      ok: true,
      ...outcome,
      authMode: auth.mode,
      ...(auth.mode === 'api_key' ? { keyPrefix: auth.key.keyPrefix } : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'ingest failed';
    if (message.includes('service client unavailable') || message.includes('SERVICE_ROLE')) {
      return NextResponse.json({ error: 'service role not configured', detail: message }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
