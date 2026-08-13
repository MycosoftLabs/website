import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_ai_cost_ledger')
    .select(
      'id, provider, model, input_units, output_units, credits_charged, byo_key, actual_cost_cents, reserved_cost_cents, created_at, task',
    )
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return jsonError(500, 'load_failed', 'Could not load AI cost ledger');
  const rows = data ?? [];
  return NextResponse.json({
    entries: rows,
    byoCalls: rows.filter((r) => r.byo_key).length,
    managedCreditsCharged: rows.filter((r) => !r.byo_key).reduce((s, r) => s + (r.credits_charged as number), 0),
    note: rows.length === 0 ? 'No AI actions recorded yet.' : undefined,
  });
}
