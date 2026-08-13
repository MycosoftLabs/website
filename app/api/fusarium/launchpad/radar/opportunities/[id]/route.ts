import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { id } = await params;
  const { data, error } = await ctx.supabase
    .from('launchpad_opportunities')
    .select(
      'id, source, source_id, title, agency, subagency, instrument, notice_type, posted_at, due_at, questions_due_at, timezone, set_asides, naics, psc, official_url, ingested_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return jsonError(404, 'not_found', 'Opportunity not found. No mock federal records.');
  const [{ data: amendments }, { data: match }] = await Promise.all([
    ctx.supabase
      .from('launchpad_opportunity_amendments')
      .select('id, amendment_no, detected_at')
      .eq('opportunity_id', id)
      .order('amendment_no'),
    ctx.supabase
      .from('launchpad_opportunity_matches')
      .select('id, fit_score, status, disqualifiers')
      .eq('tenant_id', ctx.tenantId)
      .eq('opportunity_id', id)
      .maybeSingle(),
  ]);
  return NextResponse.json({
    opportunity: data,
    amendments: amendments ?? [],
    match: match ?? null,
    note: 'Deep research is credit-gated and requires an above-threshold fit score. Enrichment is central — not per-tenant.',
  });
}
