import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { capExceeded, jsonError, readJson } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';

const STATUSES = ['draft', 'in_review', 'authorized', 'submitted_by_customer', 'closed'] as const;

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  const limit = derived.entitlements?.proposalWorkspaces ?? 0;
  const { data, error } = await ctx.supabase
    .from('launchpad_proposal_workspaces')
    .select('id, opportunity_id, title, status, created_at, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .order('updated_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load proposals');
  const workspaces = data ?? [];
  return NextResponse.json({
    workspaces,
    limit,
    note:
      workspaces.length === 0
        ? limit === 0
          ? 'This plan includes 0 proposal workspaces. Upgrade to Contractor Ops or above.'
          : 'No proposal workspaces yet. Launchpad never performs binding submission.'
        : 'submitted_by_customer is a customer-recorded fact.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  const limit = derived.entitlements?.proposalWorkspaces ?? 0;
  if (limit <= 0) {
    return capExceeded('proposalWorkspaces', derived.planKey, 0, 0, 'This plan includes 0 proposal workspaces.');
  }
  const { count } = await ctx.supabase
    .from('launchpad_proposal_workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId);
  const used = count ?? 0;
  if (used >= limit) {
    return capExceeded('proposalWorkspaces', derived.planKey, used, limit, `Proposal workspace cap (${limit}) reached.`);
  }
  const parsed = await readJson<{ title?: string; opportunityId?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const title = typeof parsed.body.title === 'string' ? parsed.body.title.trim().slice(0, 300) : '';
  if (!title) return jsonError(400, 'validation_error', 'title required');
  const { data, error } = await ctx.supabase
    .from('launchpad_proposal_workspaces')
    .insert({
      tenant_id: ctx.tenantId,
      title,
      opportunity_id: parsed.body.opportunityId || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not create workspace');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'proposal.created',
    entity: 'launchpad_proposal_workspaces',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{ id?: string; status?: string; title?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const id = typeof parsed.body.id === 'string' ? parsed.body.id : '';
  if (!id) return jsonError(400, 'id_required', 'id required');
  if (parsed.body.status && !(STATUSES as readonly string[]).includes(parsed.body.status)) {
    return jsonError(400, 'validation_error', 'invalid status');
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.body.status) patch.status = parsed.body.status;
  if (typeof parsed.body.title === 'string') patch.title = parsed.body.title.trim().slice(0, 300);
  const { error } = await ctx.supabase
    .from('launchpad_proposal_workspaces')
    .update(patch)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);
  if (error) return jsonError(500, 'update_failed', 'Could not update workspace');
  return NextResponse.json({ ok: true, id });
}
