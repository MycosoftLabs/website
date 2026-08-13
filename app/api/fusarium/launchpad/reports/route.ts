import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { entitlementDenied, jsonError, readJson } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { profileFromCompanyData } from '@/lib/launchpad/docs/tenant-profile';
import { buildTenantReport, isReportType, REPORT_TYPES } from '@/lib/launchpad/reports/tenant-reports';
import { RULE_PACK_V1 } from '@/lib/launchpad/scoring/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_generated_documents')
    .select('id, kind, title, status, created_at')
    .eq('tenant_id', ctx.tenantId)
    .eq('kind', 'report')
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load reports');
  return NextResponse.json({
    reports: data ?? [],
    types: REPORT_TYPES,
    note: 'Reports are DRAFT. Human approval is a separate PATCH on /documents. No mock compliance scores.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.documentFactory) {
    return entitlementDenied('documentFactory', derived.planKey, 'Document factory is not on this plan.');
  }
  const parsed = await readJson<{ type?: string }>(request);
  if (parsed.ok === false) return parsed.response;
  const type = typeof parsed.body.type === 'string' ? parsed.body.type : '';
  if (!isReportType(type)) return jsonError(400, 'validation_error', 'Unknown report type', { types: REPORT_TYPES });

  const [{ data: companyRow }, { data: latestScore }, { count: poamOpen }, { count: bomLines }] = await Promise.all([
    ctx.supabase.from('launchpad_company_profiles').select('data').eq('tenant_id', ctx.tenantId).maybeSingle(),
    ctx.supabase
      .from('launchpad_score_snapshots')
      .select('score, max_score, implemented_count')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    ctx.supabase
      .from('launchpad_poam_items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'open'),
    ctx.supabase.from('launchpad_bom_parts').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenantId),
  ]);
  const profile = profileFromCompanyData((companyRow?.data as Record<string, unknown>) ?? {});
  const built = buildTenantReport(type, profile, {
    implementedCount: latestScore?.implemented_count as number | undefined,
    score: latestScore?.score as number | undefined,
    maxScore: latestScore?.max_score as number | undefined,
    poamOpen: poamOpen ?? 0,
    bomLines: bomLines ?? 0,
  });
  const contentHash = createHash('sha256').update(built.html).digest('hex');
  const { data: doc, error } = await ctx.supabase
    .from('launchpad_generated_documents')
    .insert({
      tenant_id: ctx.tenantId,
      kind: 'report',
      title: built.title,
      status: 'draft',
      rule_pack_version: RULE_PACK_V1.version,
      payload: { type },
      rendered_html: built.html,
      content_hash: contentHash,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !doc) return jsonError(500, 'create_failed', 'Could not persist report draft');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'document.report.generated',
    entity: 'launchpad_generated_documents',
    entityId: doc.id,
    payload: { type, contentHash },
  });
  return NextResponse.json({ ok: true, id: doc.id, type, title: built.title });
}
