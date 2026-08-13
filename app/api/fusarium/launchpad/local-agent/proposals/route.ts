import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { capText, jsonError, readJson, UUID_RE } from '@/lib/launchpad/http';
import { scanTextForBoundary } from '@/lib/launchpad/boundary/dlp';

/**
 * Approval inbox. Humans accept or reject. An accepted proposal never
 * auto-flips a control to implemented — state_source has no 'ai' value.
 */

export const dynamic = 'force-dynamic';

const ROLES = ['readiness', 'evidence', 'document', 'systems_check', 'radar'] as const;

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_agent_proposals')
    .select(
      'id, device_id, agent_role, title, summary, proposed_action, status, review_note, reviewed_at, applied_at, created_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return jsonError(500, 'load_failed', 'Could not load proposals');
  const rows = data ?? [];
  return NextResponse.json({
    proposals: rows,
    note:
      rows.length === 0
        ? 'No proposals. The local MYCA harness posts sanitized suggestions here. Accepting a proposal does not mark a control implemented.'
        : 'Accept/reject is a human action. Controls stay customer-marked only.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    agentRole?: string;
    title?: string;
    summary?: string;
    proposedAction?: Record<string, unknown>;
    deviceId?: string;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  const agentRole = capText(parsed.body.agentRole, 40);
  const title = capText(parsed.body.title, 200);
  const summary = capText(parsed.body.summary, 4000);
  if (!(ROLES as readonly string[]).includes(agentRole) || !title || !summary) {
    return jsonError(400, 'validation_error', 'agentRole, title, and summary required');
  }
  const dlp = scanTextForBoundary(`${title}\n${summary}\n${JSON.stringify(parsed.body.proposedAction ?? {})}`);
  if (dlp.blocked) return jsonError(400, 'boundary_blocked', 'Proposal failed the data-boundary scan.');
  const deviceId =
    typeof parsed.body.deviceId === 'string' && UUID_RE.test(parsed.body.deviceId)
      ? parsed.body.deviceId
      : null;
  const { data, error } = await ctx.supabase
    .from('launchpad_agent_proposals')
    .insert({
      tenant_id: ctx.tenantId,
      device_id: deviceId,
      agent_role: agentRole,
      title,
      summary,
      proposed_action: parsed.body.proposedAction && typeof parsed.body.proposedAction === 'object'
        ? parsed.body.proposedAction
        : {},
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record proposal');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'agent.proposal.created',
    entity: 'launchpad_agent_proposals',
    entityId: data.id,
    payload: { agentRole },
  });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    id?: string;
    status?: string;
    reviewNote?: string;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  const id = typeof parsed.body.id === 'string' && UUID_RE.test(parsed.body.id) ? parsed.body.id : '';
  const status = parsed.body.status === 'accepted' || parsed.body.status === 'rejected' ? parsed.body.status : '';
  if (!id || !status) return jsonError(400, 'validation_error', 'id and status (accepted|rejected) required');
  const { data, error } = await ctx.supabase
    .from('launchpad_agent_proposals')
    .update({
      status,
      review_note: capText(parsed.body.reviewNote, 2000) || null,
      reviewed_by: ctx.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) return jsonError(500, 'update_failed', 'Could not review proposal');
  if (!data) return jsonError(404, 'not_found', 'Pending proposal not found in this workspace');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: status === 'accepted' ? 'agent.proposal.accepted' : 'agent.proposal.rejected',
    entity: 'launchpad_agent_proposals',
    entityId: data.id,
  });
  return NextResponse.json({
    ok: true,
    id: data.id,
    status,
    note:
      status === 'accepted'
        ? 'Recorded as a human decision. This does not flip any control to implemented.'
        : 'Rejected. No control state changed.',
  });
}
