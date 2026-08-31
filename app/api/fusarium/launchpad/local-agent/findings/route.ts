import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

/** Sanitized Local Agent findings only — no raw logs/pcaps. */
export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_local_check_results')
    .select('id, agent_id, check_id, check_version, result, summary, detail_hash, mapped_controls, observed_at, received_at')
    .eq('tenant_id', ctx.tenantId)
    .order('received_at', { ascending: false })
    .limit(200);
  if (error) return jsonError(500, 'load_failed', 'Could not load findings');
  return NextResponse.json({
    findings: data ?? [],
    note:
      (data ?? []).length === 0
        ? 'No sanitized findings yet. Enroll a Local Agent. Raw logs and PCAPs never leave the device.'
        : 'Cloud stores result + one-sentence summary + detail hash only.',
  });
}
