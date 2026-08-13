import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';

/**
 * Audit trail — read + verify.
 *
 * GET           — most recent events (RLS-scoped).
 * GET ?verify=1 — server-side chain verification via the DB function (the
 *                 hash input includes Postgres's own timestamp rendering, so
 *                 recomputation happens where that text lives).
 */
export async function GET(request: NextRequest) {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  if (request.nextUrl.searchParams.get('verify') === '1') {
    const { data, error } = await ctx.supabase.rpc('launchpad_verify_audit_chain', {
      t: ctx.tenantId,
    });
    if (error) return NextResponse.json({ error: 'Verification failed to run' }, { status: 500 });
    return NextResponse.json({ verification: data });
  }

  const { data, error } = await ctx.supabase
    .from('launchpad_audit_events')
    .select('seq, actor_type, action, entity, entity_id, payload_hash, prev_hash, hash, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('seq', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: 'Could not load audit events' }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}
