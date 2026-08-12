import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import {
  deriveAgentHmacKey,
  getAgentRootSecret,
  mintEnrollmentToken,
  sha256Hex,
} from '@/lib/launchpad/agent/hmac';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { deriveEntitlements, type SubscriptionRow } from '@/lib/launchpad/entitlements';

/**
 * POST /api/fusarium/launchpad/local-agent/enroll
 * owner/admin — mint agent row + credential hash + one-time secrets.
 *
 * LAUNCHPAD_AGENT_ROOT_SECRET is optional break-glass for HMAC body signing.
 * Without it, create a tenant API key with scope=agent for results intake.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;

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
  const root = getAgentRootSecret();

  const { data: row, error } = await ctx.supabase
    .from('launchpad_local_agents')
    .insert({
      tenant_id: ctx.tenantId,
      name,
      platform,
      enrollment_token_hash: enrollmentTokenHash,
      hmac_key_hash: root ? 'pending' : sha256Hex(`enroll-only:${enrollmentToken}`),
      status: 'enrolled',
      created_by: ctx.user.id,
    })
    .select('id, name, platform, status, created_at')
    .single();

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? 'enroll failed' }, { status: 500 });
  }

  let hmacKey: string | null = null;
  if (root) {
    hmacKey = deriveAgentHmacKey(root, row.id);
    await ctx.supabase
      .from('launchpad_local_agents')
      .update({ hmac_key_hash: sha256Hex(hmacKey) })
      .eq('id', row.id)
      .eq('tenant_id', ctx.tenantId);
  }

  // Credential row (hash only). Session cannot insert (no write policy) — service role.
  try {
    const svc = createLaunchpadServiceClient();
    await svc.from('launchpad_agent_credentials').insert({
      tenant_id: ctx.tenantId,
      agent_id: row.id,
      enroll_secret_hash: enrollmentTokenHash,
      status: 'active',
    });
  } catch {
    // Table may not be applied yet; enroll still succeeds with agent row.
  }

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'local_agent.enrolled',
    entity: 'launchpad_local_agents',
    entityId: row.id,
    payload: { name, platform, hmacMode: root ? 'root_derived' : 'api_key_preferred' },
  });

  return NextResponse.json({
    ok: true,
    agent: {
      id: row.id,
      name: row.name,
      platform: row.platform,
      status: row.status,
      created_at: row.created_at,
    },
    enrollment_token: enrollmentToken,
    hmac_key: hmacKey,
    results_auth: hmacKey
      ? {
          preferred: 'hmac',
          alternate: 'Authorization: Bearer lp_… with scope=agent + X-LP-Agent-Id',
        }
      : {
          preferred: 'api_key',
          instruction:
            'Create a tenant API key with scope=agent (POST /api/fusarium/launchpad/keys) and send Authorization: Bearer lp_… with X-LP-Agent-Id on results.',
        },
    warning:
      'Save enrollment_token (and hmac_key if present) now. They are not retrievable later. Raw check detail stays on-device.',
  });
}
