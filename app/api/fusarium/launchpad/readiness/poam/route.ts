import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';

/** GET — the tenant's POA&M items (derived by score computation; read-only here). */
export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const { data, error } = await ctx.supabase
    .from('launchpad_poam_items')
    .select('id, control_id, status, weakness, opened_at, due_at, closed_at')
    .eq('tenant_id', ctx.tenantId)
    .order('due_at', { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: 'Could not load POA&M items' }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}
