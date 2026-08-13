import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

const DISCLAIMER =
  'Individuals do not self-apply for a facility clearance. A company cannot sponsor its own FCL. Launchpad cannot obtain or guarantee clearance. Positive FOCI or export-control answers create a counsel-referral task — AI does not produce a legal classification. SF-86 / e-QIP / NBIS material is prohibited.';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_clearance_readiness')
    .select('data, disclaimer_acknowledged_at, foci_referral_opened, export_referral_opened, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  if (error) return jsonError(500, 'load_failed', 'Could not load clearance readiness');
  return NextResponse.json({
    data: data?.data ?? {},
    disclaimerAcknowledgedAt: data?.disclaimer_acknowledged_at ?? null,
    fociReferralOpened: data?.foci_referral_opened ?? false,
    exportReferralOpened: data?.export_referral_opened ?? false,
    disclaimer: DISCLAIMER,
    excluded: ['sf-86', 'e-QIP', 'NBIS', 'SSN'],
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    acknowledgeDisclaimer?: boolean;
    data?: Record<string, unknown>;
    fociPositive?: boolean;
    exportPositive?: boolean;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const { data: existing } = await ctx.supabase
    .from('launchpad_clearance_readiness')
    .select('data, disclaimer_acknowledged_at')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  if (!parsed.body.acknowledgeDisclaimer && !existing?.disclaimer_acknowledged_at) {
    return jsonError(400, 'disclaimer_required', DISCLAIMER);
  }
  const incoming = parsed.body.data && typeof parsed.body.data === 'object' ? parsed.body.data : {};
  const blocked = Object.keys(incoming).some((k) => /sf-?86|ssn|eqip|nbis|passport/i.test(k));
  if (blocked) return jsonError(400, 'blocked_field', 'SF-86 / identity documents are not stored in Launchpad.');
  const merged = { ...((existing?.data as Record<string, unknown>) ?? {}), ...incoming };
  const foci = Boolean(parsed.body.fociPositive);
  const exp = Boolean(parsed.body.exportPositive);
  const { error } = await ctx.supabase.from('launchpad_clearance_readiness').upsert(
    {
      tenant_id: ctx.tenantId,
      data: merged,
      disclaimer_acknowledged_at: existing?.disclaimer_acknowledged_at ?? new Date().toISOString(),
      foci_referral_opened: foci,
      export_referral_opened: exp,
      updated_by: ctx.user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' },
  );
  if (error) return jsonError(500, 'update_failed', 'Could not save clearance readiness');

  if (foci || exp) {
    await ctx.supabase.from('launchpad_tasks').insert({
      tenant_id: ctx.tenantId,
      title: foci ? 'FOCI counsel referral' : 'Export-control counsel referral',
      detail: 'Positive screening answer. AI does not classify. Route to qualified counsel.',
      kind: 'counsel_referral',
      created_by: ctx.user.id,
    });
  }
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'clearance.readiness.updated',
    entity: 'launchpad_clearance_readiness',
    entityId: ctx.tenantId,
  });
  return NextResponse.json({ ok: true, disclaimer: DISCLAIMER });
}
