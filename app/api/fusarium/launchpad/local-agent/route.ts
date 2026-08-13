import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';

/** List enrolled agents. Binary/installers are WP-3 remaining. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  const { data, error } = await ctx.supabase
    .from('launchpad_local_agents')
    .select('id, name, platform, status, last_seen_at, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load agents');
  const agents = data ?? [];
  return NextResponse.json({
    agents,
    deviceCap: derived.entitlements?.localAgentDevices ?? 0,
    enroll: 'POST /api/fusarium/launchpad/local-agent/enroll',
    results: 'POST /api/fusarium/launchpad/local-agent/results (sanitized only)',
    note:
      'The Local Assurance Agent binary/installers are not in this backend pass. Red-team and network scanners stay on-prem; cloud never receives raw telemetry. An agent_check result never flips a control to implemented by itself.',
  });
}
