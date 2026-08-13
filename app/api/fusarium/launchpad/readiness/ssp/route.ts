import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, entitlementDenied } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { profileFromCompanyData } from '@/lib/launchpad/docs/tenant-profile';
import { buildTenantSsp } from '@/lib/launchpad/docs/ssp-factory';
import { RULE_PACK_V1 } from '@/lib/launchpad/scoring/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_generated_documents')
    .select('id, kind, title, status, created_at, content_hash')
    .eq('tenant_id', ctx.tenantId)
    .eq('kind', 'ssp')
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load SSP drafts');
  const documents = data ?? [];
  return NextResponse.json({
    documents,
    note:
      documents.length === 0
        ? 'No SSP drafts yet. POST generates a DRAFT outline from the company profile. Approval is a separate human action.'
        : 'All rows start as draft. The factory never sets approved.',
  });
}

export async function POST() {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.documentFactory) {
    return entitlementDenied('documentFactory', derived.planKey, 'Document factory is not on this plan.');
  }
  const { data: companyRow } = await ctx.supabase
    .from('launchpad_company_profiles')
    .select('data')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  const profile = profileFromCompanyData((companyRow?.data as Record<string, unknown>) ?? {});
  const { data: states } = await ctx.supabase
    .from('launchpad_control_states')
    .select('state')
    .eq('tenant_id', ctx.tenantId);
  const summary = { implemented: 0, partial: 0, notImplemented: 0, na: 0 };
  for (const s of states ?? []) {
    if (s.state === 'implemented') summary.implemented += 1;
    else if (s.state === 'partial') summary.partial += 1;
    else if (s.state === 'not_applicable') summary.na += 1;
    else summary.notImplemented += 1;
  }
  const draft = await buildTenantSsp(profile, summary);
  const contentHash = createHash('sha256').update(draft.html).digest('hex');
  const { data: doc, error } = await ctx.supabase
    .from('launchpad_generated_documents')
    .insert({
      tenant_id: ctx.tenantId,
      kind: 'ssp',
      title: draft.meta.title,
      status: 'draft',
      rule_pack_version: RULE_PACK_V1.version,
      template_version: draft.meta.templateVersion,
      payload: draft.meta,
      rendered_html: draft.html,
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
    payload: { contentHash },
  });
  return NextResponse.json({ ok: true, id: doc.id, meta: draft.meta });
}
