import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { enrichOpportunityIfNeeded } from '@/lib/launchpad/radar/enrich';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true, ai: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    opportunityId?: string;
    title?: string;
    agency?: string | null;
    officialUrl?: string;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  const opportunityId = typeof parsed.body.opportunityId === 'string' ? parsed.body.opportunityId.trim() : '';
  const title = typeof parsed.body.title === 'string' ? parsed.body.title.trim() : '';
  const officialUrl = typeof parsed.body.officialUrl === 'string' ? parsed.body.officialUrl.trim() : '';
  if (!opportunityId || !title || !officialUrl) {
    return jsonError(400, 'validation_error', 'opportunityId, title, and officialUrl are required');
  }
  const agency = typeof parsed.body.agency === 'string' ? parsed.body.agency : null;
  const result = await enrichOpportunityIfNeeded({
    supabase: createLaunchpadServiceClient(),
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    opportunityId,
    title,
    agency,
    officialUrl,
  });
  if (result.error && !result.text) {
    return jsonError(402, 'enrich_failed', result.error);
  }
  return NextResponse.json({
    ok: true,
    summary: result.text,
    cached: result.cached,
    creditsCharged: result.creditsCharged,
  });
}
