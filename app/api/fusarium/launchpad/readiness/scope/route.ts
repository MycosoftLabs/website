import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { PLACEHOLDER } from '@/lib/launchpad/constants';

/**
 * Assessment scope — customer-authored boundary facts + the scope questionnaire.
 *
 * HOME: launchpad_company_profiles.data (jsonb). Scope is a property of the
 * company's environment (where CUI lives, who administers systems, headcount),
 * not of its market capabilities — so it lives on the company profile beside
 * boundary_description / stack_summary, under the `scope` key.
 * launchpad_capability_profiles stays reserved for capability/targeting data.
 *
 * Answers are enum-whitelisted; free text never enters the questionnaire. The
 * derived "likely scope" summary is computed in the page from these answers and
 * is presented as planning guidance only — never an official scoping
 * determination.
 */

export const dynamic = 'force-dynamic';

const EXPECTS_CUI = ['yes', 'no', 'unsure'] as const;
const CUI_LOCATION = ['enclave', 'whole_company', 'undecided', 'none'] as const;
const SYSTEM_ADMIN = ['founder', 'internal_it', 'msp', 'nobody_yet'] as const;
const COMPANY_SIZE = ['1_5', '6_15', '16_50', '51_plus'] as const;
const CLOUD_SERVICES = [
  'email_collaboration', 'file_storage', 'identity_sso', 'code_hosting',
  'accounting_erp', 'chat_comms', 'crm', 'other',
] as const;

const pick = (v: unknown, allowed: readonly string[]): string | null =>
  typeof v === 'string' && allowed.includes(v) ? v : null;

/** Enum-whitelist every answer; anything else is dropped, never stored. */
function sanitizeScope(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    expects_cui: pick(r.expectsCui, EXPECTS_CUI),
    cui_location: pick(r.cuiLocation, CUI_LOCATION),
    remote_employees: typeof r.remoteEmployees === 'boolean' ? r.remoteEmployees : null,
    cloud_services: Array.isArray(r.cloudServices)
      ? (r.cloudServices as unknown[])
          .filter((x): x is string => typeof x === 'string' && (CLOUD_SERVICES as readonly string[]).includes(x))
          .slice(0, CLOUD_SERVICES.length)
      : [],
    system_admin: pick(r.systemAdmin, SYSTEM_ADMIN),
    company_size: pick(r.companySize, COMPANY_SIZE),
    roles_separated: typeof r.rolesSeparated === 'boolean' ? r.rolesSeparated : null,
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data } = await ctx.supabase
    .from('launchpad_company_profiles')
    .select('data, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  const profile = (data?.data as Record<string, unknown>) ?? {};
  return NextResponse.json({
    boundaryDescription: profile.boundary_description ?? PLACEHOLDER,
    stackSummary: profile.stack_summary ?? PLACEHOLDER,
    scope: profile.scope ?? null,
    updatedAt: data?.updated_at ?? null,
    note: 'Scope lives on the company profile. Missing facts render as [CUSTOMER INPUT REQUIRED], never invented.',
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{
    boundaryDescription?: string;
    stackSummary?: string;
    scope?: Record<string, unknown>;
  }>(request);
  // 'in' narrowing: `!parsed.ok` does not discriminate under this repo's
  // non-strict tsconfig, so branch on the property that only errors carry.
  if ('response' in parsed) return parsed.response;

  const scope = parsed.body.scope !== undefined ? sanitizeScope(parsed.body.scope) : undefined;
  if (parsed.body.scope !== undefined && scope === null) {
    return jsonError(400, 'validation_error', 'scope must be an object of questionnaire answers');
  }

  const { data: existing } = await ctx.supabase
    .from('launchpad_company_profiles')
    .select('data')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  const merged = {
    ...((existing?.data as Record<string, unknown>) ?? {}),
    ...(typeof parsed.body.boundaryDescription === 'string'
      ? { boundary_description: parsed.body.boundaryDescription.trim().slice(0, 4000) }
      : {}),
    ...(typeof parsed.body.stackSummary === 'string'
      ? { stack_summary: parsed.body.stackSummary.trim().slice(0, 4000) }
      : {}),
    ...(scope !== undefined ? { scope } : {}),
  };
  const { error } = await ctx.supabase.from('launchpad_company_profiles').upsert(
    { tenant_id: ctx.tenantId, data: merged, updated_by: ctx.user.id, updated_at: new Date().toISOString() },
    { onConflict: 'tenant_id' },
  );
  if (error) return jsonError(500, 'update_failed', 'Could not save scope');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'readiness.scope.updated',
    entity: 'launchpad_company_profiles',
    entityId: ctx.tenantId,
    payload: { fields: Object.keys(parsed.body) },
  });
  return NextResponse.json({ ok: true, data: merged });
}
