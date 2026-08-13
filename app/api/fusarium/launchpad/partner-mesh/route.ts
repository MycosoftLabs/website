import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { entitlementDenied, jsonError, readJson } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.partnerMesh) {
    return entitlementDenied('partnerMesh', derived.planKey, 'Partner Mesh is not on this plan.');
  }
  const [{ data: profile }, { data: consents }] = await Promise.all([
    ctx.supabase.from('launchpad_partner_profiles').select('data, updated_at').eq('tenant_id', ctx.tenantId).maybeSingle(),
    ctx.supabase
      .from('launchpad_partner_consents')
      .select('id, scope, purpose, granted_at, revoked_at, granted_by')
      .eq('tenant_id', ctx.tenantId)
      .order('granted_at', { ascending: false }),
  ]);
  const activeConsents = (consents ?? []).filter((c) => !c.revoked_at);
  return NextResponse.json({
    profile: profile?.data ?? {},
    consents: consents ?? [],
    meshEnabled: activeConsents.length > 0,
    note: 'No tenant data flows toward Partner Mesh until a separate affirmative, scoped consent exists.',
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.partnerMesh) {
    return entitlementDenied('partnerMesh', derived.planKey, 'Partner Mesh is not on this plan.');
  }
  const parsed = await readJson<{ data?: Record<string, unknown> }>(request);
  if (!parsed.ok) return parsed.response;
  const data = parsed.body.data && typeof parsed.body.data === 'object' ? parsed.body.data : {};
  const { error } = await ctx.supabase.from('launchpad_partner_profiles').upsert(
    { tenant_id: ctx.tenantId, data, updated_by: ctx.user.id, updated_at: new Date().toISOString() },
    { onConflict: 'tenant_id' },
  );
  if (error) return jsonError(500, 'update_failed', 'Could not save partner profile');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'partner.profile.updated',
    entity: 'launchpad_partner_profiles',
    entityId: ctx.tenantId,
  });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.partnerMesh) {
    return entitlementDenied('partnerMesh', derived.planKey, 'Partner Mesh is not on this plan.');
  }
  const parsed = await readJson<{ scope?: string; purpose?: string; revokeId?: string }>(request);
  if (!parsed.ok) return parsed.response;
  if (parsed.body.revokeId) {
    const { error } = await ctx.supabase
      .from('launchpad_partner_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('tenant_id', ctx.tenantId)
      .eq('id', parsed.body.revokeId);
    if (error) return jsonError(500, 'revoke_failed', 'Could not revoke consent');
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'partner.consent.revoked',
      entity: 'launchpad_partner_consents',
      entityId: parsed.body.revokeId,
    });
    return NextResponse.json({ ok: true, revoked: true });
  }
  const scope = typeof parsed.body.scope === 'string' ? parsed.body.scope.trim().slice(0, 200) : '';
  const purpose = typeof parsed.body.purpose === 'string' ? parsed.body.purpose.trim().slice(0, 500) : '';
  if (!scope || !purpose) return jsonError(400, 'validation_error', 'scope and purpose required for consent');
  const { data, error } = await ctx.supabase
    .from('launchpad_partner_consents')
    .insert({
      tenant_id: ctx.tenantId,
      scope,
      purpose,
      granted_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record consent');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'partner.consent.granted',
    entity: 'launchpad_partner_consents',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
