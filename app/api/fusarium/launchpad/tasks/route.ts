import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { requireTenantOrHarnessRead } from '@/lib/launchpad/agent/harness-auth';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

const STATUSES = ['open', 'in_progress', 'done', 'dropped'] as const;
const KINDS = ['readiness', 'registration', 'enclave', 'advisory', 'formation', 'general'] as const;

/** YYYY-MM-DD or ISO 8601 timestamp. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Non-empty values must be date-shaped strings; null/undefined/'' pass (absent or clearing). */
function isBadDate(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  return typeof value !== 'string' || !DATE_RE.test(value);
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const gate = await requireTenantOrHarnessRead(request);
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
  if (parsed.ok === false) return parsed.response;
  const title = typeof parsed.body.title === 'string' ? parsed.body.title.trim().slice(0, 300) : '';
  if (!title) return jsonError(400, 'validation_error', 'title required');
  if (isBadDate(parsed.body.dueAt)) {
    return jsonError(400, 'validation_error', 'dueAt must be YYYY-MM-DD or ISO 8601');
  }
  if (parsed.body.assignee && (typeof parsed.body.assignee !== 'string' || !UUID_RE.test(parsed.body.assignee))) {
    return jsonError(400, 'validation_error', 'assignee must be a user id (UUID) or null');
  }
  const kind =
    typeof parsed.body.kind === 'string' && (KINDS as readonly string[]).includes(parsed.body.kind)
      ? parsed.body.kind
      : 'general';
  const controlId = typeof parsed.body.controlId === 'string' ? parsed.body.controlId.trim().slice(0, 40) : '';
  const { data, error } = await ctx.supabase
    .from('launchpad_tasks')
    .insert({
      tenant_id: ctx.tenantId,
      title,
      detail: typeof parsed.body.detail === 'string' ? parsed.body.detail.slice(0, 4000) : null,
      kind,
      control_id: controlId || null,
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
  if (parsed.ok === false) return parsed.response;
  const id = typeof parsed.body.id === 'string' ? parsed.body.id : '';
  if (!id) return jsonError(400, 'id_required', 'id required');
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.body.status) {
    if (!(STATUSES as readonly string[]).includes(parsed.body.status)) {
      return jsonError(400, 'validation_error', 'invalid status');
    }
    patch.status = parsed.body.status;
  }
  if (typeof parsed.body.title === 'string') {
    const title = parsed.body.title.trim().slice(0, 300);
    if (!title) return jsonError(400, 'validation_error', 'title cannot be empty');
    patch.title = title;
  }
  if ('dueAt' in parsed.body) {
    if (isBadDate(parsed.body.dueAt)) {
      return jsonError(400, 'validation_error', 'dueAt must be YYYY-MM-DD or ISO 8601');
    }
    patch.due_at = parsed.body.dueAt;
  }
  const { data: updated, error } = await ctx.supabase
    .from('launchpad_tasks')
    .update(patch)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return jsonError(500, 'update_failed', 'Could not update task');
  if (!updated) return jsonError(404, 'not_found', 'Task not found');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'task.updated',
    entity: 'launchpad_tasks',
    entityId: id,
  });
  return NextResponse.json({ ok: true, id });
}
