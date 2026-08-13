import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson, entitlementDenied } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';

/**
 * Training tracker — link + completion metadata only.
 * Never hosts copyrighted course content (spec §14.5).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.trainingTracker) {
    return entitlementDenied('trainingTracker', derived.planKey, 'Training tracker is not on this plan.');
  }
  const { data, error } = await ctx.supabase
    .from('launchpad_training_assignments')
    .select('id, person_name, person_email, course, assigned_at, completed_at, expires_at, certificate_ref, updated_by')
    .eq('tenant_id', ctx.tenantId)
    .order('assigned_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load training assignments');
  const rows = data ?? [];
  return NextResponse.json({
    assignments: rows,
    note:
      rows.length === 0
        ? 'No training assignments yet. Record official/approved course links and completion metadata — do not paste course content.'
        : 'Course field is a title or URL. Certificate content stays in the customer system.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.trainingTracker) {
    return entitlementDenied('trainingTracker', derived.planKey, 'Training tracker is not on this plan.');
  }
  const parsed = await readJson<{
    personName?: string;
    personEmail?: string;
    course?: string;
    assignedAt?: string;
    completedAt?: string;
    expiresAt?: string;
    certificateRef?: string;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const personName = typeof parsed.body.personName === 'string' ? parsed.body.personName.trim().slice(0, 200) : '';
  const course = typeof parsed.body.course === 'string' ? parsed.body.course.trim().slice(0, 500) : '';
  if (!personName || !course) return jsonError(400, 'validation_error', 'personName and course (title or URL) are required');

  const { data, error } = await ctx.supabase
    .from('launchpad_training_assignments')
    .insert({
      tenant_id: ctx.tenantId,
      person_name: personName,
      person_email: typeof parsed.body.personEmail === 'string' ? parsed.body.personEmail.trim().slice(0, 200) : null,
      course,
      assigned_at: parsed.body.assignedAt || new Date().toISOString(),
      completed_at: parsed.body.completedAt || null,
      expires_at: parsed.body.expiresAt || null,
      certificate_ref: typeof parsed.body.certificateRef === 'string' ? parsed.body.certificateRef.slice(0, 500) : null,
      updated_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record assignment');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'training.assigned',
    entity: 'launchpad_training_assignments',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    id?: string;
    completedAt?: string | null;
    expiresAt?: string | null;
    certificateRef?: string | null;
  }>(request);
  if (!parsed.ok) return parsed.response;
  const id = typeof parsed.body.id === 'string' ? parsed.body.id : '';
  if (!id) return jsonError(400, 'id_required', 'id required');
  const patch: Record<string, unknown> = { updated_by: ctx.user.id };
  if ('completedAt' in parsed.body) patch.completed_at = parsed.body.completedAt;
  if ('expiresAt' in parsed.body) patch.expires_at = parsed.body.expiresAt;
  if ('certificateRef' in parsed.body) patch.certificate_ref = parsed.body.certificateRef;
  const { error } = await ctx.supabase
    .from('launchpad_training_assignments')
    .update(patch)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);
  if (error) return jsonError(500, 'update_failed', 'Could not update assignment');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'training.updated',
    entity: 'launchpad_training_assignments',
    entityId: id,
  });
  return NextResponse.json({ ok: true, id });
}
