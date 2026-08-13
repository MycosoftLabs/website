import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  return NextResponse.json({
    booking: 'request_form',
    catalogLookupKeys: [
      'fus_launchpad_advisory_15',
      'fus_launchpad_advisory_30',
      'fus_launchpad_advisory_60',
      'fus_launchpad_advisory_90',
    ],
    note: 'Calendar integration is not wired. POST stores a request task for a human to schedule.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{ minutes?: number; topic?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const topic = typeof parsed.body.topic === 'string' ? parsed.body.topic.trim().slice(0, 500) : 'Advisory request';
  const { data, error } = await ctx.supabase
    .from('launchpad_tasks')
    .insert({
      tenant_id: ctx.tenantId,
      title: `Advisory request (${parsed.body.minutes ?? 30} min)`,
      detail: topic,
      kind: 'advisory',
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record advisory request');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'advisory.requested',
    entity: 'launchpad_tasks',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id, booking: 'request_form' });
}
