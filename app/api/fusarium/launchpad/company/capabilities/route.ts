import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

const FIELDS = [
  'capabilities',
  'target_agencies',
  'naics',
  'psc',
  'exclusions',
  'set_asides',
  'facility_notes',
] as const;

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_capability_profiles')
    .select('data, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  if (error) return jsonError(500, 'load_failed', 'Could not load capability profile');
  return NextResponse.json({
    data: data?.data ?? {},
    updatedAt: data?.updated_at ?? null,
    fields: FIELDS,
    note: 'Used for radar fit matching. Empty until the customer records capabilities — no mock NAICS.',
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.body)) {
    if (!(FIELDS as readonly string[]).includes(k)) continue;
    if (typeof v === 'string') clean[k] = v.trim().slice(0, 4000);
    else if (Array.isArray(v)) clean[k] = v.filter((x) => typeof x === 'string').slice(0, 50);
  }
  const { data: existing } = await ctx.supabase
    .from('launchpad_capability_profiles')
    .select('data')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  const merged = { ...((existing?.data as Record<string, unknown>) ?? {}), ...clean };
  const { error } = await ctx.supabase.from('launchpad_capability_profiles').upsert(
    { tenant_id: ctx.tenantId, data: merged, updated_by: ctx.user.id, updated_at: new Date().toISOString() },
    { onConflict: 'tenant_id' },
  );
  if (error) return jsonError(500, 'update_failed', 'Could not save capability profile');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'capability.profile.updated',
    entity: 'launchpad_capability_profiles',
    entityId: ctx.tenantId,
    payload: { fields: Object.keys(clean) },
  });
  return NextResponse.json({ ok: true, data: merged });
}
