import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError, readJson } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_radar_alerts')
    .select('id, opportunity_id, kind, title, body, read_at, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return jsonError(500, 'load_failed', 'Could not load alerts');
  return NextResponse.json({
    alerts: data ?? [],
    note:
      (data ?? []).length === 0
        ? 'No alerts. Alerts are created from real watches/amendments, never from mock SAM data.'
        : undefined,
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{ id?: string }>(request);
  if (parsed.ok === false) return parsed.response;
  const id = typeof parsed.body.id === 'string' ? parsed.body.id : '';
  if (!id) return jsonError(400, 'id_required', 'id required');
  const { data, error } = await ctx.supabase
    .from('launchpad_radar_alerts')
    .update({ read_at: new Date().toISOString() })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return jsonError(500, 'update_failed', 'Could not mark alert read');
  if (!data) return jsonError(404, 'not_found', 'Alert not found in this workspace');
  return NextResponse.json({ ok: true, id: data.id });
}
