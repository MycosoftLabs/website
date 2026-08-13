import { NextRequest, NextResponse } from 'next/server';
import { requireTenantOrHarnessRead } from '@/lib/launchpad/agent/harness-auth';
import { jsonError } from '@/lib/launchpad/http';
import { rankOpportunities } from '@/lib/launchpad/radar/rank';
import { resolveSamApiKeyFromEnv } from '@/lib/launchpad/collectors/sam';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const gate = await requireTenantOrHarnessRead(request);
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const [{ data: opps, error: oErr }, { data: caps }] = await Promise.all([
    ctx.supabase
      .from('launchpad_opportunities')
      .select('id, title, agency, naics, psc, set_asides, due_at, official_url')
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(200),
    ctx.supabase.from('launchpad_capability_profiles').select('data').eq('tenant_id', ctx.tenantId).maybeSingle(),
  ]);
  if (oErr) return jsonError(500, 'load_failed', 'Could not load opportunities');
  const rows = opps ?? [];
  const data = (caps?.data as Record<string, unknown> | undefined) ?? {};
  const ranked = rankOpportunities(rows, {
    naics: Array.isArray(data.naics) ? (data.naics as string[]) : [],
    psc: Array.isArray(data.psc) ? (data.psc as string[]) : [],
    setAsides: Array.isArray(data.set_asides) ? (data.set_asides as string[]) : [],
  });
  const samConfigured = Boolean(resolveSamApiKeyFromEnv());
  return NextResponse.json({
    ranked,
    samConfigured,
    note:
      rows.length === 0
        ? samConfigured
          ? 'No opportunities ingested yet. Rank stays empty rather than inventing awards.'
          : 'SAM not configured / no federal source connected. No mock awards.'
        : 'Fit is NAICS/PSC overlap only — not a bid recommendation.',
  });
}
