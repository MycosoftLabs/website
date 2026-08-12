import { NextRequest, NextResponse } from 'next/server';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { ingestNormalizedOpportunities } from '@/lib/launchpad/radar/ingest';
import { isLaunchpadEnabled } from '@/lib/launchpad/flags';

/**
 * Contract Radar ingest — bearer LAUNCHPAD_INGEST_TOKEN.
 * validate → service-role upsert (source, source_id) → amendment on hash change → fit-match.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isLaunchpadEnabled()) {
    return NextResponse.json({ error: 'Not found', code: 'launchpad_disabled' }, { status: 404 });
  }

  const token = process.env.LAUNCHPAD_INGEST_TOKEN;
  const auth = request.headers.get('authorization') ?? '';
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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
    return NextResponse.json({ ok: true, accepted: 0, upsertedIds: [], amendments: 0, matchesWritten: 0 });
  }
  if (records.length > 500) {
    return NextResponse.json({ error: 'batch too large (max 500)' }, { status: 413 });
  }

  try {
    const svc = createLaunchpadServiceClient();
    const outcome = await ingestNormalizedOpportunities(svc, records);
    return NextResponse.json({ ok: true, ...outcome });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'ingest failed';
    if (message.includes('service client unavailable') || message.includes('SERVICE_ROLE')) {
      return NextResponse.json({ error: 'service role not configured', detail: message }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
