import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { entitlementDenied, jsonError, readJson } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';

/**
 * Partner Mesh — OPT-IN capability profile + consent ledger.
 *
 * Two tables, two very different write models:
 *
 *  - launchpad_partner_profiles: one row per tenant (upsert). The profile is
 *    PRIVATE workspace data — saving it shares nothing.
 *  - launchpad_partner_consents: INSERT-ONLY ledger. A grant is a row; a
 *    revocation is a NEW row with revoked_at set at insert time. Existing rows
 *    are never updated or deleted, so the consent history is append-only and
 *    auditable. Current state per scope = the latest row for that scope.
 *
 * No consent row with revoked_at null = nothing flows toward the FUSARIUM
 * ecosystem, period. The profile jsonb is validated field-by-field against
 * whitelists — arbitrary content is never passed through.
 */

export const dynamic = 'force-dynamic';

const DOMAINS = ['robotics', 'sensors', 'software', 'data', 'ai', 'hardware'] as const;
const INTERESTS = [
  'api_integration',
  'data_exchange',
  'hardware_integration',
  'joint_proposals',
  'pilot_deployment',
  'research_collaboration',
] as const;
const SCOPES = ['capability_profile', 'integration_contact'] as const;

function pickStrings(input: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((x): x is string => typeof x === 'string' && allowed.includes(x)))];
}

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.partnerMesh) {
    return entitlementDenied('partnerMesh', derived.planKey, 'Partner Mesh is not on this plan.');
  }

  const [profileRes, consentsRes] = await Promise.all([
    ctx.supabase
      .from('launchpad_partner_profiles')
      .select('data, updated_at')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle(),
    ctx.supabase
      .from('launchpad_partner_consents')
      .select('id, scope, purpose, granted_at, revoked_at')
      .eq('tenant_id', ctx.tenantId)
      .order('granted_at', { ascending: false }),
  ]);
  if (consentsRes.error) return jsonError(500, 'load_failed', 'Could not load Partner Mesh state');
  // A failed profile read must NOT render as profile:null — the client would
  // show an empty form and a later save would overwrite the real profile.
  if (profileRes.error) return jsonError(500, 'profile_load_failed', 'Could not load capability profile');

  const profile = profileRes.data
    ? { ...(profileRes.data.data ?? {}), updated_at: profileRes.data.updated_at }
    : null;
  return NextResponse.json({ profile, consents: consentsRes.data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.partnerMesh) {
    return entitlementDenied('partnerMesh', derived.planKey, 'Partner Mesh is not on this plan.');
  }

  const parsed = await readJson<{
    domains?: unknown;
    description?: unknown;
    trl?: unknown;
    interests?: unknown;
  }>(request);
  if (parsed.ok === false) return parsed.response;

  const domains = pickStrings(parsed.body.domains, DOMAINS);
  const interests = pickStrings(parsed.body.interests, INTERESTS);
  const description =
    typeof parsed.body.description === 'string' ? parsed.body.description.trim().slice(0, 2000) : '';
  const trlNum = Number(parsed.body.trl);
  const trl = Number.isInteger(trlNum) && trlNum >= 1 && trlNum <= 9 ? trlNum : null;

  // Validated fields only — the jsonb never stores raw pass-through content.
  const data = { domains, description, trl, interests };

  const { error } = await ctx.supabase.from('launchpad_partner_profiles').upsert(
    { tenant_id: ctx.tenantId, data, updated_by: ctx.user.id, updated_at: new Date().toISOString() },
    { onConflict: 'tenant_id' },
  );
  if (error) return jsonError(500, 'update_failed', 'Could not save capability profile');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'partner.profile.updated',
    entity: 'launchpad_partner_profiles',
    entityId: ctx.tenantId,
    payload: { domains, interests, trl, descriptionLength: description.length },
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

  const parsed = await readJson<{ action?: string; scope?: string; purpose?: string }>(request);
  if (parsed.ok === false) return parsed.response;

  const action = parsed.body.action === 'grant' || parsed.body.action === 'revoke' ? parsed.body.action : null;
  if (!action) return jsonError(400, 'validation_error', "action must be 'grant' or 'revoke'");
  const scope = (SCOPES as readonly string[]).includes(String(parsed.body.scope))
    ? String(parsed.body.scope)
    : '';
  if (!scope) return jsonError(400, 'validation_error', `scope must be one of: ${SCOPES.join(', ')}`);
  const purpose = typeof parsed.body.purpose === 'string' ? parsed.body.purpose.trim().slice(0, 500) : '';

  // Current state = latest ledger row for the scope (rows are never mutated).
  const { data: latest, error: latestErr } = await ctx.supabase
    .from('launchpad_partner_consents')
    .select('id, revoked_at')
    .eq('tenant_id', ctx.tenantId)
    .eq('scope', scope)
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestErr) return jsonError(500, 'load_failed', 'Could not read consent state');
  const currentlyGranted = Boolean(latest) && !latest!.revoked_at;

  if (action === 'grant') {
    if (currentlyGranted) return jsonError(409, 'already_granted', 'Consent for this scope is already active');
    if (!purpose) return jsonError(400, 'validation_error', 'purpose required to grant consent');

    const { data, error } = await ctx.supabase
      .from('launchpad_partner_consents')
      .insert({ tenant_id: ctx.tenantId, scope, purpose, granted_by: ctx.user.id })
      .select('id')
      .single();
    if (error || !data) return jsonError(500, 'create_failed', 'Could not record consent');

    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'partner.consent.granted',
      entity: 'launchpad_partner_consents',
      entityId: data.id,
      payload: { scope },
    });
    return NextResponse.json({ ok: true, id: data.id, granted: true });
  }

  // Revoke: append a NEW row carrying revoked_at — never an UPDATE/DELETE.
  if (!currentlyGranted) return jsonError(409, 'not_granted', 'No active consent exists for this scope');
  const { data, error } = await ctx.supabase
    .from('launchpad_partner_consents')
    .insert({
      tenant_id: ctx.tenantId,
      scope,
      purpose: purpose || 'Consent revoked by the customer',
      granted_by: ctx.user.id,
      revoked_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record revocation');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'partner.consent.revoked',
    entity: 'launchpad_partner_consents',
    entityId: data.id,
    payload: { scope },
  });
  return NextResponse.json({ ok: true, id: data.id, revoked: true });
}
