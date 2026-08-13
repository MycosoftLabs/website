import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';

/**
 * Company profile — the tenant facts that feed matching and the document
 * factory. Non-CUI, non-restricted facts ONLY: EIN, bank details, ownership
 * and clearance specifics are deliberately not accepted (restricted-class
 * data per data_classification_policy.yaml; the field list is a whitelist).
 */

const FIELDS = [
  'legal_name', 'entity_type', 'entity_state', 'site', 'website',
  'uei', 'cage', 'sam_status', 'naics', 'headcount',
  'capability_summary', 'boundary_description', 'stack_summary', 'target_agencies',
] as const;

const BLOCKED_FIELD_HINTS = ['ein', 'ssn', 'bank', 'routing', 'password', 'secret', 'clearance_level'];

export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const { data, error } = await ctx.supabase
    .from('launchpad_company_profiles')
    .select('data, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
  return NextResponse.json({ data: data?.data ?? {}, updatedAt: data?.updated_at ?? null, fields: FIELDS });
}

export async function PATCH(request: NextRequest) {
  const result = await requireTenant({ write: true });
  if (result.error) return result.error;
  const { ctx } = result;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist enforcement: unknown keys are rejected loudly, and anything that
  // smells like a restricted identifier is refused by name.
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    const key = k.toLowerCase();
    if (BLOCKED_FIELD_HINTS.some((h) => key.includes(h))) {
      return NextResponse.json(
        { error: `Field "${k}" is a restricted identifier and is not stored in Launchpad. Keep it in your own systems.` },
        { status: 400 },
      );
    }
    if (!(FIELDS as readonly string[]).includes(k)) continue; // silently drop unknown keys
    if (k === 'headcount') {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n <= 100000) clean[k] = Math.floor(n);
      continue;
    }
    if (typeof v === 'string') clean[k] = v.trim().slice(0, 2000);
  }

  // Merge over the existing document so partial saves never wipe fields.
  const { data: existing } = await ctx.supabase
    .from('launchpad_company_profiles')
    .select('data')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  const merged = { ...((existing?.data as Record<string, unknown>) ?? {}), ...clean };

  const { error } = await ctx.supabase.from('launchpad_company_profiles').upsert(
    {
      tenant_id: ctx.tenantId,
      data: merged,
      updated_by: ctx.user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' },
  );
  if (error) return NextResponse.json({ error: 'Could not save profile' }, { status: 500 });

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'company.profile.updated',
    entity: 'launchpad_company_profiles',
    entityId: ctx.tenantId,
    payload: { fields: Object.keys(clean) },
  });

  return NextResponse.json({ ok: true, data: merged });
}
