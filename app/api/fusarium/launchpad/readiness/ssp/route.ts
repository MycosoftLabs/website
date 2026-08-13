import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, entitlementDenied } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { profileFromCompanyData } from '@/lib/launchpad/docs/tenant-profile';
import {
  composeSspSkeleton,
  sspFamilyCompleteness,
  type SspControlState,
} from '@/lib/launchpad/docs/policy-factory';
import { RULE_PACK_V1 } from '@/lib/launchpad/scoring/engine';

/**
 * SSP (System Security Plan) draft skeleton — deterministic, NO LLM call.
 *
 * GET  — list the tenant's SSP drafts + per-family completeness (register
 *        states + evidence-index counts). `?id=` returns one stored draft's
 *        markdown for download.
 * POST — assemble a new DRAFT skeleton from the company profile, the control
 *        register, and evidence-index counts; persist it (status 'draft' —
 *        the factory can never set anything else); return the markdown.
 *
 * The markdown is the stored artifact: it lives in rendered_html (the
 * document body column), content_hash is the sha256 of that markdown, and
 * payload carries the generation metadata. Statuses inside the document are
 * phrased "customer-marked …" — never MET, never certified/compliant.
 */

export const dynamic = 'force-dynamic';

/** Evidence-index counts per control id (metadata rows only — no content). */
function evidenceCounts(rows: Array<{ control_ids: string[] | null }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const id of row.control_ids ?? []) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export async function GET(request: NextRequest) {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const id = request.nextUrl.searchParams.get('id');
  if (id) {
    if (!/^[0-9a-fA-F-]{1,64}$/.test(id)) {
      return jsonError(400, 'validation_error', 'Invalid document id');
    }
    const { data, error } = await ctx.supabase
      .from('launchpad_generated_documents')
      .select('id, title, status, rendered_html, content_hash, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('kind', 'ssp')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return jsonError(404, 'not_found', 'Not found');
    return NextResponse.json({
      document: {
        id: data.id,
        title: data.title,
        status: data.status,
        markdown: data.rendered_html ?? '',
        content_hash: data.content_hash,
        created_at: data.created_at,
      },
    });
  }

  const [{ data: docs, error }, { data: stateRows }, { data: evidenceRows }] = await Promise.all([
    ctx.supabase
      .from('launchpad_generated_documents')
      .select('id, kind, title, status, template_version, content_hash, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('kind', 'ssp')
      .order('created_at', { ascending: false }),
    ctx.supabase
      .from('launchpad_control_states')
      .select('control_id, state')
      .eq('tenant_id', ctx.tenantId),
    ctx.supabase
      .from('launchpad_evidence_index')
      .select('control_ids')
      .eq('tenant_id', ctx.tenantId),
  ]);
  if (error) return jsonError(500, 'load_failed', 'Could not load SSP drafts');

  const states: Record<string, SspControlState> = {};
  for (const row of stateRows ?? []) states[row.control_id] = row.state as SspControlState;
  const families = sspFamilyCompleteness(states, evidenceCounts(evidenceRows ?? []));

  const documents = docs ?? [];
  return NextResponse.json({
    documents,
    families,
    rulePackVersion: RULE_PACK_V1.version,
    note:
      documents.length === 0
        ? 'No SSP drafts yet. Generate assembles a DRAFT skeleton from your recorded facts — approval is a separate human action.'
        : 'All rows start as draft. The factory never sets approved.',
  });
}

export async function POST() {
  const result = await requireTenant({ write: true });
  if (result.error) return result.error;
  const { ctx } = result;

  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.documentFactory) {
    return entitlementDenied('documentFactory', derived.planKey, 'Document factory is not on this plan.');
  }

  // Tenant facts come from the company profile, the register, and the
  // evidence index — and ONLY from there. No invention, no model.
  const [companyRes, statesRes, evidenceRes] = await Promise.all([
    ctx.supabase
      .from('launchpad_company_profiles')
      .select('data')
      .eq('tenant_id', ctx.tenantId)
      .maybeSingle(),
    ctx.supabase
      .from('launchpad_control_states')
      .select('control_id, state')
      .eq('tenant_id', ctx.tenantId),
    ctx.supabase
      .from('launchpad_evidence_index')
      .select('control_ids')
      .eq('tenant_id', ctx.tenantId),
  ]);

  // Fail closed: a failed source load must never compose an SSP from empty
  // data and store it as if real. No document row, no audit event.
  const failedSource = companyRes.error
    ? 'company_profile'
    : statesRes.error
      ? 'control_states'
      : evidenceRes.error
        ? 'evidence_index'
        : null;
  if (failedSource) {
    return jsonError(500, 'ssp_source_load_failed', 'Could not load SSP source data', {
      source: failedSource,
    });
  }

  const companyRow = companyRes.data;
  const stateRows = statesRes.data;
  const evidenceRows = evidenceRes.data;

  const profile = profileFromCompanyData((companyRow?.data as Record<string, unknown>) ?? {});
  const states: Record<string, SspControlState> = {};
  for (const row of stateRows ?? []) states[row.control_id] = row.state as SspControlState;

  const skeleton = composeSspSkeleton(
    profile,
    states,
    evidenceCounts(evidenceRows ?? []),
    RULE_PACK_V1.version,
  );

  const contentHash = createHash('sha256').update(skeleton.markdown).digest('hex');
  const { data: doc, error } = await ctx.supabase
    .from('launchpad_generated_documents')
    .insert({
      tenant_id: ctx.tenantId,
      kind: 'ssp',
      title: skeleton.meta.title,
      status: 'draft', // the factory can never set anything else
      rule_pack_version: RULE_PACK_V1.version,
      template_version: skeleton.meta.templateVersion,
      payload: { ...skeleton.meta, families: skeleton.families },
      rendered_html: skeleton.markdown,
      content_hash: contentHash,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !doc) return jsonError(500, 'create_failed', 'Could not persist SSP draft');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'document.ssp.generated',
    entity: 'launchpad_generated_documents',
    entityId: doc.id,
    payload: { contentHash, templateVersion: skeleton.meta.templateVersion },
  });

  return NextResponse.json({ ok: true, id: doc.id, meta: skeleton.meta, markdown: skeleton.markdown });
}
