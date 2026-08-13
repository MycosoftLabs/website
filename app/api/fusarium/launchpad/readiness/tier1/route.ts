import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';

/**
 * Tier-1 Turnkey — the operator controls no scanner can prove.
 *
 * Backed by launchpad_tier1_records (migration 20260813120000): per-person,
 * per-category records for AT training, PS screening / access agreements /
 * termination, IR tabletops + incident readiness, and DIBNet reporting
 * readiness — each with completion and expiry clocks.
 *
 * HUMAN-ENTERED ONLY. Every row is created and completed by a signed-in
 * customer through requireTenant(); there is no service-role or agent path
 * into this table, and no AI action may create or complete a record. The
 * artifact columns are references + hashes — never content (non-CUI boundary).
 */

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  'training', 'screening', 'access_agreement', 'termination',
  'tabletop', 'incident_readiness', 'dibnet',
] as const;
type Category = (typeof CATEGORIES)[number];

/** Requirements each category may honestly claim to support. First entry is
 * the default when the client does not pick one. */
const CATEGORY_CONTROLS: Record<Category, string[]> = {
  training: ['AT.L2-3.2.1', 'AT.L2-3.2.2', 'AT.L2-3.2.3'],
  screening: ['PS.L2-3.9.1'],
  access_agreement: ['PS.L2-3.9.2'],
  termination: ['PS.L2-3.9.2'],
  tabletop: ['IR.L2-3.6.3'],
  incident_readiness: ['IR.L2-3.6.1', 'IR.L2-3.6.2'],
  dibnet: ['IR.L2-3.6.2'],
};

const STATUSES = ['open', 'done', 'expired'] as const;

const isoOrNull = (v: unknown): string | null => {
  if (typeof v !== 'string' || !v.trim()) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;

  const { data, error } = await ctx.supabase
    .from('launchpad_tier1_records')
    .select('id, control_id, category, person, status, completed_at, expires_at, artifact_ref, notes')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load Tier-1 records');
  return NextResponse.json({ records: data ?? [] });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;

  const parsed = await readJson<{
    category?: string;
    controlId?: string;
    person?: string;
    status?: string;
    completedAt?: string;
    expiresAt?: string;
    artifactRef?: string;
    artifactSha256?: string;
    notes?: string;
  }>(request);
  // 'in' narrowing: `!parsed.ok` does not discriminate under this repo's
  // non-strict tsconfig, so branch on the property that only errors carry.
  if ('response' in parsed) return parsed.response;
  const b = parsed.body;

  const category = (CATEGORIES as readonly string[]).includes(String(b.category))
    ? (String(b.category) as Category)
    : null;
  if (!category) {
    return jsonError(400, 'validation_error', `category must be one of: ${CATEGORIES.join(', ')}`);
  }

  const allowed = CATEGORY_CONTROLS[category];
  const controlId =
    typeof b.controlId === 'string' && allowed.includes(b.controlId.trim())
      ? b.controlId.trim()
      : allowed[0];

  // New records are open or done — 'expired' is derived by the expiry clock,
  // never entered at creation.
  const status = b.status === 'done' ? 'done' : 'open';

  const completedAt = isoOrNull(b.completedAt) ?? (status === 'done' ? new Date().toISOString() : null);
  const expiresAt = isoOrNull(b.expiresAt);

  // Reference + hash only — never artifact content (non-CUI boundary).
  const artifactRef = typeof b.artifactRef === 'string' ? b.artifactRef.trim().slice(0, 500) : null;
  if (artifactRef && artifactRef.length > 400) {
    return jsonError(400, 'validation_error', 'artifactRef must be a short reference, not content');
  }
  const artifactSha256 =
    typeof b.artifactSha256 === 'string' && /^[a-f0-9]{64}$/i.test(b.artifactSha256)
      ? b.artifactSha256.toLowerCase()
      : null;

  const { data, error } = await ctx.supabase
    .from('launchpad_tier1_records')
    .insert({
      tenant_id: ctx.tenantId,
      control_id: controlId,
      category,
      person: typeof b.person === 'string' && b.person.trim() ? b.person.trim().slice(0, 200) : null,
      status,
      completed_at: completedAt,
      expires_at: expiresAt,
      artifact_ref: artifactRef || null,
      artifact_sha256: artifactSha256,
      notes: typeof b.notes === 'string' ? b.notes.slice(0, 2000) : null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record the Tier-1 fact');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'tier1.record.created',
    entity: 'launchpad_tier1_records',
    entityId: data.id,
    payload: { category, controlId, status, personPresent: !!b.person },
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
    person?: string;
    completedAt?: string;
    expiresAt?: string;
    artifactRef?: string;
    artifactSha256?: string;
    notes?: string;
  }>(request);
  if ('response' in parsed) return parsed.response;
  const b = parsed.body;

  const id = typeof b.id === 'string' && UUID_RE.test(b.id) ? b.id : null;
  if (!id) return jsonError(400, 'validation_error', 'id required');

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (b.status !== undefined) {
    if (!(STATUSES as readonly string[]).includes(String(b.status))) {
      return jsonError(400, 'validation_error', `status must be one of: ${STATUSES.join(', ')}`);
    }
    patch.status = b.status;
    // Marking done stamps the completion time unless the caller supplies one.
    if (b.status === 'done' && b.completedAt === undefined) {
      patch.completed_at = new Date().toISOString();
    }
  }
  if (b.person !== undefined) {
    patch.person = typeof b.person === 'string' && b.person.trim() ? b.person.trim().slice(0, 200) : null;
  }
  if (b.completedAt !== undefined) patch.completed_at = isoOrNull(b.completedAt);
  if (b.expiresAt !== undefined) patch.expires_at = isoOrNull(b.expiresAt);
  if (b.artifactRef !== undefined) {
    const ref = typeof b.artifactRef === 'string' ? b.artifactRef.trim().slice(0, 500) : null;
    if (ref && ref.length > 400) {
      return jsonError(400, 'validation_error', 'artifactRef must be a short reference, not content');
    }
    patch.artifact_ref = ref || null;
  }
  if (b.artifactSha256 !== undefined) {
    patch.artifact_sha256 =
      typeof b.artifactSha256 === 'string' && /^[a-f0-9]{64}$/i.test(b.artifactSha256)
        ? b.artifactSha256.toLowerCase()
        : null;
  }
  if (b.notes !== undefined) {
    patch.notes = typeof b.notes === 'string' ? b.notes.slice(0, 2000) : null;
  }

  if (Object.keys(patch).length === 1) {
    return jsonError(400, 'validation_error', 'Nothing to update');
  }

  const { data, error } = await ctx.supabase
    .from('launchpad_tier1_records')
    .update(patch)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return jsonError(500, 'update_failed', 'Could not update the record');
  if (!data) return jsonError(404, 'not_found', 'Record not found in this workspace');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'tier1.record.updated',
    entity: 'launchpad_tier1_records',
    entityId: id,
    payload: { fields: Object.keys(patch).filter((k) => k !== 'updated_at') },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;

  const id = request.nextUrl.searchParams.get('id');
  if (!id || !UUID_RE.test(id)) return jsonError(400, 'validation_error', 'id required');

  const { data, error } = await ctx.supabase
    .from('launchpad_tier1_records')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return jsonError(500, 'delete_failed', 'Could not delete the record');
  if (!data) return jsonError(404, 'not_found', 'Record not found in this workspace');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'tier1.record.deleted',
    entity: 'launchpad_tier1_records',
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
