import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { entitlementDenied, jsonError, readJson } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { EMAIL_RE } from '@/lib/launchpad/validate';

export const dynamic = 'force-dynamic';

const INVITE_SCOPES = ['capability_profile', 'integration_contact', 'shared_opportunity_watch'] as const;

function isPaid(mode: string): boolean {
  return mode === 'full' || mode === 'grace';
}

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!isPaid(derived.mode)) {
    return jsonError(403, 'paid_plan_required', 'A paid Launchpad plan is required to view mesh invites.');
  }
  const svc = createLaunchpadServiceClient();
  const email = ctx.user.email.toLowerCase();
  const { data, error } = await svc
    .from('launchpad_partner_invites')
    .select(
      'id, from_tenant_id, to_tenant_id, to_email, scopes, status, created_at, responded_at',
    )
    .or(
      `from_tenant_id.eq.${ctx.tenantId},to_tenant_id.eq.${ctx.tenantId},to_email.eq.${email}`,
    )
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load Partner Mesh invites');
  return NextResponse.json({
    canInitiate: Boolean(derived.entitlements?.partnerMesh),
    invites: data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  const parsed = await readJson<{
    action?: string;
    inviteId?: string;
    email?: string;
    tenantId?: string;
    scopes?: unknown;
  }>(request);
  if (parsed.ok === false) return parsed.response;

  const action = parsed.body.action;
  const svc = createLaunchpadServiceClient();

  if (action === 'invite') {
    if (!derived.entitlements?.partnerMesh) {
      return entitlementDenied(
        'partnerMesh',
        derived.planKey,
        'Partner Mesh Pro is required to initiate a mesh.',
      );
    }
    const emailRaw = typeof parsed.body.email === 'string' ? parsed.body.email.trim().toLowerCase() : '';
    const toTenantId = typeof parsed.body.tenantId === 'string' ? parsed.body.tenantId.trim() : '';
    if (!toTenantId && (!emailRaw || !EMAIL_RE.test(emailRaw))) {
      return jsonError(400, 'validation_error', 'Invite requires a workspace email or tenant id.');
    }
    if (toTenantId && toTenantId === ctx.tenantId) {
      return jsonError(400, 'validation_error', 'Cannot invite this same workspace.');
    }
    const scopes = Array.isArray(parsed.body.scopes)
      ? parsed.body.scopes.filter((s): s is string => typeof s === 'string' && (INVITE_SCOPES as readonly string[]).includes(s))
      : ['capability_profile', 'integration_contact'];
    let resolvedTenant = toTenantId || null;
    if (!resolvedTenant && emailRaw) {
      const { data: found } = await svc.rpc('launchpad_tenant_ids_for_email', { p_email: emailRaw });
      const row = Array.isArray(found) ? found[0] : found;
      if (row && typeof (row as { tenant_id?: string }).tenant_id === 'string') {
        resolvedTenant = (row as { tenant_id: string }).tenant_id;
      }
    }
    const { data, error } = await svc
      .from('launchpad_partner_invites')
      .insert({
        from_tenant_id: ctx.tenantId,
        to_tenant_id: resolvedTenant,
        to_email: emailRaw || null,
        scopes,
        status: 'pending',
        created_by: ctx.user.id,
      })
      .select('id')
      .single();
    if (error || !data) return jsonError(500, 'create_failed', error?.message || 'Could not create invite');
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'partner.invite.created',
      entity: 'launchpad_partner_invites',
      entityId: data.id,
      payload: { toTenantId: resolvedTenant, toEmail: emailRaw ? 'set' : null, scopes },
    });
    return NextResponse.json({ ok: true, id: data.id, toTenantId: resolvedTenant });
  }

  if (action === 'accept' || action === 'decline') {
    if (!isPaid(derived.mode)) {
      return jsonError(403, 'paid_plan_required', 'A paid Launchpad plan is required to accept a mesh invite.');
    }
    const inviteId = typeof parsed.body.inviteId === 'string' ? parsed.body.inviteId : '';
    if (!inviteId) return jsonError(400, 'validation_error', 'inviteId required');
    const email = ctx.user.email.toLowerCase();
    const { data: invite, error } = await svc
      .from('launchpad_partner_invites')
      .select('id, from_tenant_id, to_tenant_id, to_email, status')
      .eq('id', inviteId)
      .maybeSingle();
    if (error || !invite) return jsonError(404, 'not_found', 'Invite not found');
    if (invite.status !== 'pending') return jsonError(409, 'not_pending', 'Invite is no longer pending');
    const addressed =
      invite.to_tenant_id === ctx.tenantId ||
      (typeof invite.to_email === 'string' && invite.to_email.toLowerCase() === email);
    if (!addressed) return jsonError(403, 'not_invitee', 'This invite is not addressed to this workspace.');
    if (invite.from_tenant_id === ctx.tenantId) {
      return jsonError(400, 'validation_error', 'The initiating workspace cannot accept its own invite.');
    }
    const { error: updErr } = await svc
      .from('launchpad_partner_invites')
      .update({
        status: action === 'accept' ? 'accepted' : 'declined',
        to_tenant_id: ctx.tenantId,
        responded_at: new Date().toISOString(),
      })
      .eq('id', inviteId)
      .eq('status', 'pending');
    if (updErr) return jsonError(500, 'update_failed', 'Could not update invite');
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: action === 'accept' ? 'partner.invite.accepted' : 'partner.invite.declined',
      entity: 'launchpad_partner_invites',
      entityId: inviteId,
      payload: { fromTenantId: invite.from_tenant_id },
    });
    return NextResponse.json({ ok: true, status: action === 'accept' ? 'accepted' : 'declined' });
  }

  return jsonError(400, 'validation_error', "action must be 'invite', 'accept', or 'decline'");
}
