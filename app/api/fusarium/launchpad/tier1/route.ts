import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

const KINDS = [
  'awareness_training',
  'role_training',
  'screening',
  'access_agreement',
  'termination',
  'incident_report',
  'tabletop',
] as const;

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_tier1_records')
    .select(
      'id, person_name, person_email, control_id, kind, completed_at, expires_at, artifact_ref, notes, created_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load Tier-1 records');
  const records = data ?? [];
  return NextResponse.json({
    records,
    kinds: KINDS,
    note:
      records.length === 0
        ? 'No Tier-1 records yet. These are customer-recorded operator facts (AT/PS/IR). AI cannot mark them implemented.'
        : 'State changes are customer-recorded only.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    personName?: string;
    personEmail?: string;
    controlId?: string;
    kind?: string;
    completedAt?: string;
    expiresAt?: string;
    artifactRef?: string;
    notes?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const personName = typeof parsed.body.personName === 'string' ? parsed.body.personName.trim().slice(0, 200) : '';
  const controlId = typeof parsed.body.controlId === 'string' ? parsed.body.controlId.trim().slice(0, 40) : '';
  const kind = typeof parsed.body.kind === 'string' ? parsed.body.kind : '';
  if (!personName || !controlId || !(KINDS as readonly string[]).includes(kind)) {
    return jsonError(400, 'validation_error', 'personName, controlId, and kind required');
  }
  const { data, error } = await ctx.supabase
    .from('launchpad_tier1_records')
    .insert({
      tenant_id: ctx.tenantId,
      person_name: personName,
      person_email: parsed.body.personEmail ?? null,
      control_id: controlId,
      kind,
      completed_at: parsed.body.completedAt || null,
      expires_at: parsed.body.expiresAt || null,
      artifact_ref: parsed.body.artifactRef ?? null,
      notes: parsed.body.notes ?? null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record Tier-1 fact');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'tier1.recorded',
    entity: 'launchpad_tier1_records',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
