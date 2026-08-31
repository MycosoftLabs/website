import { NextResponse } from 'next/server';
import {
  collectSamOpportunitiesSafe,
  resolveSamApiKeyFromEnv,
} from '@/lib/launchpad/collectors/sam';
import { ingestNormalizedOpportunities } from '@/lib/launchpad/radar/ingest';
import {
  launchpadOperatorServiceClient,
  requireLaunchpadOperator,
} from '@/lib/launchpad/operator';

export const dynamic = 'force-dynamic';

export async function POST() {
  const gate = await requireLaunchpadOperator();
  if (gate.error) return gate.error;

  const apiKey = resolveSamApiKeyFromEnv();
  const collected = await collectSamOpportunitiesSafe({ apiKey, limit: 25 });
  if (collected.ok && collected.skipped) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'sam_not_configured',
      message: 'SAM_API_KEY is not set. Radar stays empty — no invented notices.',
    });
  }
  if (collected.ok !== true) {
    const message = 'error' in collected ? collected.error : 'SAM collector failed';
    return NextResponse.json({ ok: false, error: message, code: 'sam_failed' }, { status: 502 });
  }

  const svc = launchpadOperatorServiceClient();
  const ingest = await ingestNormalizedOpportunities(svc, collected.records);
  return NextResponse.json({
    ok: true,
    skipped: false,
    collected: collected.records.length,
    ingest,
  });
}
