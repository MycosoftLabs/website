import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { requireTenantOrHarnessRead } from '@/lib/launchpad/agent/harness-auth';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { CMMC_L2_CONTROLS } from '@/lib/security/reference/cmmc-l2-reference';
import type { AssessmentState } from '@/lib/launchpad/scoring/engine';

/**
 * The tenant's 110-requirement register.
 *
 * GET   — full corpus (reference fields) joined with the tenant's recorded states.
 * PATCH — record a state for one control. Customer-owned: state_source is
 *         hard-set to 'customer' here; the DB enum rejects anything else.
 */

const VALID_STATES: AssessmentState[] = ['implemented', 'partial', 'not_implemented', 'not_applicable'];

export async function GET(request: NextRequest) {
  const result = await requireTenantOrHarnessRead(request);
  if (result.error) return result.error;
  const { ctx } = result;

  const { data, error } = await ctx.supabase
    .from('launchpad_control_states')
    .select('control_id, state, state_source, narrative, marked_at')
    .eq('tenant_id', ctx.tenantId);
  if (error) {
    return NextResponse.json({ error: 'Could not load control states' }, { status: 500 });
  }

  const stateById = new Map((data ?? []).map((r) => [r.control_id, r]));
  const controls = CMMC_L2_CONTROLS.map((c) => {
    const s = stateById.get(c.controlId);
    return {
      controlId: c.controlId,
      family: c.family,
      familyName: c.familyName,
      title: c.title,
      weight: c.weightMax,
      isNa: c.isNa,
      dual: c.dual,
      poamEligibility: c.poamEligibility,
      // reference guidance is served on demand by the detail route to keep this light
      state: (s?.state as AssessmentState | undefined) ?? null,
      stateSource: s?.state_source ?? null,
      narrative: s?.narrative ?? null,
      markedAt: s?.marked_at ?? null,
    };
  });

  return NextResponse.json({
    controls,
    assessedCount: (data ?? []).length,
    total: CMMC_L2_CONTROLS.length,
  });
}

export async function PATCH(request: NextRequest) {
  const result = await requireTenant({ write: true });
  if (result.error) return result.error;
  const { ctx } = result;

  let body: { controlId?: string; state?: string; narrative?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const controlId = String(body.controlId ?? '');
  if (!CMMC_L2_CONTROLS.some((c) => c.controlId === controlId)) {
    return NextResponse.json({ error: 'Unknown control id' }, { status: 400 });
  }
  const state = body.state as AssessmentState;
  if (!VALID_STATES.includes(state)) {
    return NextResponse.json({ error: `state must be one of ${VALID_STATES.join(', ')}` }, { status: 400 });
  }
  const narrative =
    typeof body.narrative === 'string' ? body.narrative.slice(0, 8000) : undefined;

  const { error } = await ctx.supabase.from('launchpad_control_states').upsert(
    {
      tenant_id: ctx.tenantId,
      control_id: controlId,
      state,
      state_source: 'customer', // never client-supplied; enum forbids 'ai' entirely
      ...(narrative !== undefined ? { narrative } : {}),
      marked_by: ctx.user.id,
      marked_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,control_id' },
  );
  if (error) {
    return NextResponse.json({ error: 'Could not record state' }, { status: 500 });
  }

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'control.state.changed',
    entity: 'launchpad_control_states',
    entityId: controlId,
    payload: { state, hasNarrative: narrative !== undefined },
  });

  return NextResponse.json({ ok: true });
}
