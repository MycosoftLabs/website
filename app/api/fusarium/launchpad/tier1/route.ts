import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { LINKS_BY_SURFACE } from '@/lib/launchpad/official-links';

const KINDS = [
  'training',
  'screening',
  'access_agreement',
  'termination',
  'tabletop',
  'incident_readiness',
  'dibnet',
] as const;

const KIND_ALIASES: Record<string, (typeof KINDS)[number]> = {
  awareness_training: 'training',
  role_training: 'training',
  incident_report: 'incident_readiness',
};

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_tier1_records')
    .select(
      'id, person, category, control_id, status, completed_at, expires_at, artifact_ref, notes, created_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load Tier-1 records');
  const records = data ?? [];
  return NextResponse.json({
    records,
    kinds: KINDS,
    officialLinks: LINKS_BY_SURFACE.tier1,
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
    person?: string;
    controlId?: string;
    kind?: string;
    category?: string;
    completedAt?: string;
    expiresAt?: string;
    artifactRef?: string;
    notes?: string;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  const personName =
    (typeof parsed.body.person === 'string' ? parsed.body.person : parsed.body.personName ?? '').trim().slice(0, 200);
  const controlId = typeof parsed.body.controlId === 'string' ? parsed.body.controlId.trim().slice(0, 40) : '';
  const rawKind = typeof parsed.body.category === 'string' ? parsed.body.category : parsed.body.kind ?? '';
  const kind = (KIND_ALIASES[rawKind] ?? rawKind) as string;
  if (!personName || !controlId || !(KINDS as readonly string[]).includes(kind)) {
    return jsonError(400, 'validation_error', 'person, controlId, and category/kind required');
  }
  const { data, error } = await ctx.supabase
    .from('launchpad_tier1_records')
    .insert({
      tenant_id: ctx.tenantId,
      person: personName,
      control_id: controlId,
      category: kind,
      status: parsed.body.completedAt ? 'done' : 'open',
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
