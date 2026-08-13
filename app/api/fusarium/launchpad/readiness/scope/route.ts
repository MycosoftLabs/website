import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { PLACEHOLDER } from '@/lib/launchpad/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data } = await ctx.supabase
    .from('launchpad_company_profiles')
    .select('data, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  const profile = (data?.data as Record<string, unknown>) ?? {};
  return NextResponse.json({
    boundaryDescription: profile.boundary_description ?? PLACEHOLDER,
    stackSummary: profile.stack_summary ?? PLACEHOLDER,
    updatedAt: data?.updated_at ?? null,
    note: 'Scope lives on the company profile. Missing facts render as [CUSTOMER INPUT REQUIRED], never invented.',
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{ boundaryDescription?: string; stackSummary?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const { data: existing } = await ctx.supabase
    .from('launchpad_company_profiles')
    .select('data')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  const merged = {
    ...((existing?.data as Record<string, unknown>) ?? {}),
    ...(typeof parsed.body.boundaryDescription === 'string'
      ? { boundary_description: parsed.body.boundaryDescription.trim().slice(0, 4000) }
      : {}),
    ...(typeof parsed.body.stackSummary === 'string'
      ? { stack_summary: parsed.body.stackSummary.trim().slice(0, 4000) }
      : {}),
  };
  const { error } = await ctx.supabase.from('launchpad_company_profiles').upsert(
    { tenant_id: ctx.tenantId, data: merged, updated_by: ctx.user.id, updated_at: new Date().toISOString() },
    { onConflict: 'tenant_id' },
  );
  if (error) return jsonError(500, 'update_failed', 'Could not save scope');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'readiness.scope.updated',
    entity: 'launchpad_company_profiles',
    entityId: ctx.tenantId,
  });
  return NextResponse.json({ ok: true, data: merged });
}
