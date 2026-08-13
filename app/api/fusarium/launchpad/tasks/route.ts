import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

const STATUSES = ['open', 'in_progress', 'done', 'dropped'] as const;

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_tasks')
    .select('id, title, detail, kind, control_id, status, due_at, assignee, created_by, created_at, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .order('due_at', { ascending: true, nullsFirst: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load tasks');
  const tasks = data ?? [];
  return NextResponse.json({
    tasks,
    blockers: tasks.filter((t) => t.status === 'open' || t.status === 'in_progress'),
    note: tasks.length === 0 ? 'No tasks yet. Blockers and deadlines will appear here and on the dashboard TaskRail.' : undefined,
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    title?: string;
    detail?: string;
    kind?: string;
    controlId?: string;
    dueAt?: string;
    assignee?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const title = typeof parsed.body.title === 'string' ? parsed.body.title.trim().slice(0, 300) : '';
  if (!title) return jsonError(400, 'validation_error', 'title required');
  const { data, error } = await ctx.supabase
    .from('launchpad_tasks')
    .insert({
      tenant_id: ctx.tenantId,
      title,
      detail: typeof parsed.body.detail === 'string' ? parsed.body.detail.slice(0, 4000) : null,
      kind: typeof parsed.body.kind === 'string' ? parsed.body.kind.slice(0, 80) : 'general',
      control_id: typeof parsed.body.controlId === 'string' ? parsed.body.controlId : null,
      due_at: parsed.body.dueAt || null,
      assignee: parsed.body.assignee || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not create task');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'task.created',
    entity: 'launchpad_tasks',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{ id?: string; status?: string; title?: string; dueAt?: string | null }>(request);
  if (!parsed.ok) return parsed.response;
  const id = typeof parsed.body.id === 'string' ? parsed.body.id : '';
  if (!id) return jsonError(400, 'id_required', 'id required');
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.body.status) {
    if (!(STATUSES as readonly string[]).includes(parsed.body.status)) {
      return jsonError(400, 'validation_error', 'invalid status');
    }
    patch.status = parsed.body.status;
  }
  if (typeof parsed.body.title === 'string') patch.title = parsed.body.title.trim().slice(0, 300);
  if ('dueAt' in parsed.body) patch.due_at = parsed.body.dueAt;
  const { error } = await ctx.supabase.from('launchpad_tasks').update(patch).eq('tenant_id', ctx.tenantId).eq('id', id);
  if (error) return jsonError(500, 'update_failed', 'Could not update task');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'task.updated',
    entity: 'launchpad_tasks',
    entityId: id,
  });
  return NextResponse.json({ ok: true, id });
}
