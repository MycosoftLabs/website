import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { id } = await params;
  const { data, error } = await ctx.supabase
    .from('launchpad_proposal_workspaces')
    .select('id, opportunity_id, title, status, compliance_matrix, sections, created_at, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return jsonError(404, 'not_found', 'Proposal workspace not found');
  return NextResponse.json({
    workspace: data,
    note: 'Launchpad never performs binding submission. submitted_by_customer is customer-recorded.',
  });
}
