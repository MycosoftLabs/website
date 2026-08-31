import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';

/**
 * Local Assurance Agent — device list (read-only).
 *
 * Lists the tenant's enrolled agents from launchpad_local_agents. This route
 * deliberately selects ONLY presentation-safe columns: the enrollment token
 * hash and HMAC key hash never leave the database through this path, and no
 * plaintext credential exists anywhere to leak (the schema stores hashes only).
 *
 * Enrollment and result intake live in the existing Cursor-owned routes
 * (local-agent/enroll, local-agent/results) — this endpoint reads, period.
 * 200 with an empty array when the tenant has nothing; never 404 for no rows.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const { data, error } = await ctx.supabase
    .from('launchpad_local_agents')
    .select('id, name, platform, status, last_seen_at, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load devices' }, { status: 500 });

  return NextResponse.json({
    devices: data ?? [],
    note:
      'Run the Local MYCA harness from services/launchpad-myca-harness. Raw check output never leaves the device; cloud receives sanitized results and hashes only.',
  });
}
