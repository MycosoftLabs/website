import { NextRequest, NextResponse } from 'next/server';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { ingestNormalizedOpportunities } from '@/lib/launchpad/radar/ingest';
import { isLaunchpadEnabled } from '@/lib/launchpad/flags';
import { authorizeIngestBearer } from '@/lib/launchpad/api-keys';
import { collectOfficialRadarSources } from '@/lib/launchpad/collectors/official';
import { buildTenantRadarPrompt } from '@/lib/launchpad/radar/company-prompt';

/**
 * Run official collectors (SAM + SBIR.gov + Grants.gov) and ingest.
 * Auth: ingest bearer (LAUNCHPAD_INGEST_BEARER or lp_ API key).
 * When the bearer is a tenant lp_ key, SAM is scoped with that workspace's
 * company/capability prompt so ingest is not a generic global pull.
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
    svc = null;
  }
  const auth = await authorizeIngestBearer(svc, request.headers.get('authorization'));
  if (auth.ok === false) {
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

  let companyPrompt: Awaited<ReturnType<typeof buildTenantRadarPrompt>> | null = null;
  if (auth.mode === 'api_key' && auth.key?.tenantId) {
    companyPrompt = await buildTenantRadarPrompt(svc, auth.key.tenantId);
  }

  const collected = await collectOfficialRadarSources({
    limit: 25,
    keyword: companyPrompt?.keyword ?? null,
  });
  if (collected.records.length === 0) {
    return NextResponse.json({
      ok: true,
      collected: 0,
      sources: collected.sources,
      ingest: { accepted: 0 },
      companyPrompt: companyPrompt
        ? { summary: companyPrompt.summary, keyword: companyPrompt.keyword, tenantId: companyPrompt.tenantId }
        : null,
    });
  }
  const ingest = await ingestNormalizedOpportunities(svc, collected.records);
  return NextResponse.json({
    ok: true,
    collected: collected.records.length,
    sources: collected.sources,
    ingest,
    authMode: auth.mode,
    companyPrompt: companyPrompt
      ? { summary: companyPrompt.summary, keyword: companyPrompt.keyword, tenantId: companyPrompt.tenantId }
      : null,
  });
}
