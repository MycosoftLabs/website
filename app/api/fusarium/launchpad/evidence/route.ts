import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { CMMC_L2_CONTROLS } from '@/lib/security/reference/cmmc-l2-reference';

/**
 * Evidence index — metadata + hash ONLY.
 *
 * There is no upload endpoint anywhere in Launchpad and the table has no
 * content column: the UI hashes files client-side (Web Crypto) and only the
 * digest + metadata arrive here. Content stays in the customer-controlled
 * authoritative system.
 */

const EVIDENCE_TYPES = ['policy','configuration','log','screenshot','ticket','training','interview','test_result','other'];
const VALID_IDS = new Set(CMMC_L2_CONTROLS.map((c) => c.controlId));

export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const { data, error } = await ctx.supabase
    .from('launchpad_evidence_index')
    .select('id, title, control_ids, evidence_type, authoritative_system, authoritative_ref, sha256, size_bytes, captured_at, valid_through, review_status, notes, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load evidence index' }, { status: 500 });
  return NextResponse.json({ records: data ?? [] });
}

export async function POST(request: NextRequest) {
  const result = await requireTenant({ write: true });
  if (result.error) return result.error;
  const { ctx } = result;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 300) : '';
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const controlIds = Array.isArray(body.controlIds)
    ? (body.controlIds as unknown[]).filter((x): x is string => typeof x === 'string' && VALID_IDS.has(x))
    : [];
  const evidenceType = EVIDENCE_TYPES.includes(String(body.evidenceType)) ? String(body.evidenceType) : 'other';
  const sha256 = typeof body.sha256 === 'string' && /^[a-f0-9]{64}$/i.test(body.sha256) ? body.sha256.toLowerCase() : null;

  // Refuse anything that smells like content rather than a reference.
  const ref = typeof body.authoritativeRef === 'string' ? body.authoritativeRef.trim().slice(0, 500) : null;
  if (ref && ref.length > 400) {
    return NextResponse.json({ error: 'authoritativeRef must be a short reference, not content' }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from('launchpad_evidence_index')
    .insert({
      tenant_id: ctx.tenantId,
      title,
      control_ids: controlIds,
      evidence_type: evidenceType,
      authoritative_system: typeof body.authoritativeSystem === 'string' ? body.authoritativeSystem.slice(0, 200) : null,
      authoritative_ref: ref,
      sha256,
      size_bytes: typeof body.sizeBytes === 'number' && body.sizeBytes >= 0 ? Math.floor(body.sizeBytes) : null,
      captured_at: typeof body.capturedAt === 'string' ? body.capturedAt : null,
      valid_through: typeof body.validThrough === 'string' ? body.validThrough : null,
      notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null,
      recorded_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return NextResponse.json({ error: 'Could not record evidence' }, { status: 500 });

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'evidence.indexed',
    entity: 'launchpad_evidence_index',
    entityId: data.id,
    payload: { title, controlIds, sha256Present: !!sha256 },
  });

  return NextResponse.json({ ok: true, id: data.id });
}
