import { NextResponse } from 'next/server';
import { collectOfficialRadarSources } from '@/lib/launchpad/collectors/official';
import { ingestNormalizedOpportunities } from '@/lib/launchpad/radar/ingest';
import {
  launchpadOperatorServiceClient,
  requireLaunchpadOperator,
} from '@/lib/launchpad/operator';

export const dynamic = 'force-dynamic';

export async function POST() {
  const gate = await requireLaunchpadOperator();
  if (gate.error) return gate.error;

  const collected = await collectOfficialRadarSources({ limit: 25 });
  if (collected.records.length === 0) {
    return NextResponse.json({
      ok: true,
      skipped: collected.sources.sam.skipped === true && collected.records.length === 0,
      sources: collected.sources,
      collected: 0,
      message: 'Official sources returned no rows — Radar stays empty. No invented notices.',
    });
  }

  const svc = launchpadOperatorServiceClient();
  const ingest = await ingestNormalizedOpportunities(svc, collected.records);
  return NextResponse.json({
    ok: true,
    skipped: false,
    collected: collected.records.length,
    sources: collected.sources,
    ingest,
  });
}
