import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { deriveEntitlements, type SubscriptionRow } from '@/lib/launchpad/entitlements';
import {
  deriveAgentHmacKey,
  getAgentRootSecret,
  mintEnrollmentToken,
  sha256Hex,
} from '@/lib/launchpad/agent/hmac';
import { appendAuditEvent } from '@/lib/launchpad/audit';

/**
 * POST /api/fusarium/launchpad/local-agent/enroll
 * owner/admin — mint agent row + one-time token + HMAC key (shown once).
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;

  const root = getAgentRootSecret();
  if (!root) {
    return NextResponse.json(
      {
        error: 'LAUNCHPAD_AGENT_ROOT_SECRET not configured',
        code: 'agent_root_missing',
      },
      { status: 503 },
    );
  }

  let body: { name?: string; platform?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Local Assurance Agent';
  const platform =
    body.platform === 'windows' || body.platform === 'linux' || body.platform === 'macos'
      ? body.platform
      : null;

  // Cap devices by entitlements
  const { data: sub } = await ctx.supabase
    .from('launchpad_subscriptions')
    .select('plan_key, status, current_period_end, grace_until, founding_pass_expires_at')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  const derived = deriveEntitlements((sub as SubscriptionRow | null) ?? null);
  const cap = derived.entitlements?.localAgentDevices ?? 0;
  if (cap <= 0) {
    return NextResponse.json(
      {
        error: 'Plan does not include Local Assurance Agent devices',
        code: 'entitlement_devices_zero',
        planKey: derived.planKey,
      },
      { status: 403 },
    );
  }

  const { count } = await ctx.supabase
    .from('launchpad_local_agents')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId)
    .in('status', ['enrolled', 'active']);
  if ((count ?? 0) >= cap) {
    return NextResponse.json(
      { error: `Device cap reached (${cap})`, code: 'device_cap', cap },
      { status: 403 },
    );
  }

  const enrollmentToken = mintEnrollmentToken();
  const enrollmentTokenHash = sha256Hex(enrollmentToken);

  // Insert first to get agent id, then set hmac_key_hash from derived key
  const { data: row, error } = await ctx.supabase
    .from('launchpad_local_agents')
    .insert({
      tenant_id: ctx.tenantId,
      name,
      platform,
      enrollment_token_hash: enrollmentTokenHash,
      hmac_key_hash: 'pending',
      status: 'enrolled',
      created_by: ctx.user.id,
    })
    .select('id, name, platform, status, created_at')
    .single();

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? 'enroll failed' }, { status: 500 });
  }

  const hmacKey = deriveAgentHmacKey(root, row.id);
  const hmacKeyHash = sha256Hex(hmacKey);
  await ctx.supabase
    .from('launchpad_local_agents')
    .update({ hmac_key_hash: hmacKeyHash })
    .eq('id', row.id)
    .eq('tenant_id', ctx.tenantId);

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'local_agent.enrolled',
    entity: 'launchpad_local_agents',
    entityId: row.id,
    payload: { name, platform },
  });

  // Optionally warm service path (ensures service role works in env)
  try {
    createLaunchpadServiceClient();
  } catch {
    // enroll itself uses session RLS; service role only needed for results intake
  }

  return NextResponse.json({
    ok: true,
    agent: {
      id: row.id,
      name: row.name,
      platform: row.platform,
      status: row.status,
      created_at: row.created_at,
    },
    /** Shown once — store securely on the device; never logged by the server after this. */
    enrollment_token: enrollmentToken,
    /** HMAC key for X-LP-Signature — shown once; re-derived server-side from root + agent id. */
    hmac_key: hmacKey,
    warning:
      'Save enrollment_token and hmac_key now. They are not retrievable later. Raw check detail stays on-device.',
  });
}
