import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson, entitlementDenied } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { profileFromCompanyData } from '@/lib/launchpad/docs/tenant-profile';
import { RULE_PACK_V1, type AssessmentState } from '@/lib/launchpad/scoring/engine';
import {
  buildReport,
  isReportKey,
  REPORT_CATALOG,
  type BomPartRow,
  type PoamItemRow,
  type ReportData,
  type ScoreSnapshotRow,
} from '@/lib/launchpad/report-builders';

/**
 * Readiness reports — DETERMINISTIC generation, no LLM.
 *
 * GET             — the report catalog + generation history (200 with an empty
 *                   history when the tenant has generated nothing).
 * GET ?id=<uuid>  — one previously generated report with its markdown, for
 *                   re-download.
 * POST {report}   — assemble the named report from the tenant's own recorded
 *                   data, store it as a DRAFT generated document, audit the
 *                   generation, and return the markdown.
 *
 * The markdown itself is stored in payload (format: 'markdown'); rendered_html
 * stays reserved for HTML documents. Every report is headed DRAFT — CUSTOMER
 * REVIEW REQUIRED and never claims a certification or government status.
 */

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const id = request.nextUrl.searchParams.get('id');
  if (id) {
    if (!UUID_RE.test(id)) return jsonError(400, 'validation_error', 'Invalid report id');
    const { data, error } = await ctx.supabase
      .from('launchpad_generated_documents')
      .select('id, title, status, payload, rule_pack_version, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('kind', 'report')
      .eq('id', id)
      .maybeSingle();
    if (error) return jsonError(500, 'load_failed', 'Could not load report');
    if (!data) return jsonError(404, 'not_found', 'Report not found');
    const payload = (data.payload ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      document: {
        id: data.id,
        title: data.title,
        status: data.status,
        created_at: data.created_at,
        report: typeof payload.report === 'string' ? payload.report : null,
        markdown: typeof payload.markdown === 'string' ? payload.markdown : null,
      },
    });
  }

  const { data, error } = await ctx.supabase
    .from('launchpad_generated_documents')
    .select('id, title, status, rule_pack_version, created_at, report_key:payload->>report')
    .eq('tenant_id', ctx.tenantId)
    .eq('kind', 'report')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return jsonError(500, 'load_failed', 'Could not load report history');

  return NextResponse.json({
    catalog: REPORT_CATALOG,
    history: data ?? [],
    note: 'Deterministic assembly from your recorded data — no AI content. Every report is a DRAFT and certifies nothing.',
  });
}

export async function POST(request: NextRequest) {
  const result = await requireTenant({ write: true });
  if (result.error) return result.error;
  const { ctx } = result;

  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.documentFactory) {
    return entitlementDenied('documentFactory', derived.planKey, 'Report generation is not on this plan.');
  }

  const parsed = await readJson<{ report?: unknown }>(request);
  if (parsed.ok === false) return parsed.response;
  const key = typeof parsed.body.report === 'string' ? parsed.body.report.trim().slice(0, 80) : '';
  if (!isReportKey(key)) {
    return jsonError(400, 'validation_error', 'Unknown report', {
      reports: REPORT_CATALOG.map((e) => e.key),
    });
  }

  // Load only what the requested report consumes — always the company profile,
  // the rest per report. A tenant with nothing recorded gets an honest report
  // that says so; nothing is fabricated to fill a table.
  const needsStates = key === 'cmmc_l2_self_assessment_report' || key === 'nist_800_171_summary';
  const needsSnapshot = key === 'sprs_score_report';
  const needsPoam = key === 'poam_export';
  const needsBom = key === 'supply_chain_summary';

  const { data: companyRow, error: cErr } = await ctx.supabase
    .from('launchpad_company_profiles')
    .select('data')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  if (cErr) return jsonError(500, 'load_failed', 'Could not load company profile');
  const profile = profileFromCompanyData((companyRow?.data as Record<string, unknown>) ?? {});

  const states: Record<string, AssessmentState | undefined> = {};
  let evidenceControlIds: string[] = [];
  if (needsStates) {
    const { data: rows, error } = await ctx.supabase
      .from('launchpad_control_states')
      .select('control_id, state')
      .eq('tenant_id', ctx.tenantId);
    if (error) return jsonError(500, 'load_failed', 'Could not load control states');
    for (const r of rows ?? []) states[r.control_id] = r.state as AssessmentState;

    const { data: evidence } = await ctx.supabase
      .from('launchpad_evidence_index')
      .select('control_ids')
      .eq('tenant_id', ctx.tenantId);
    const covered = new Set<string>();
    for (const e of evidence ?? []) for (const id of e.control_ids ?? []) covered.add(id);
    evidenceControlIds = [...covered];
  }

  let latestSnapshot: ScoreSnapshotRow | null = null;
  if (needsSnapshot) {
    const { data, error } = await ctx.supabase
      .from('launchpad_score_snapshots')
      .select('rule_pack_version, score, max_score, implemented_count, not_met_count, na_count, unassessed_count, eligibility, created_at')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return jsonError(500, 'load_failed', 'Could not load score snapshots');
    latestSnapshot = (data as ScoreSnapshotRow | null) ?? null;
  }

  let poamItems: PoamItemRow[] = [];
  if (needsPoam) {
    const { data, error } = await ctx.supabase
      .from('launchpad_poam_items')
      .select('control_id, status, weakness, milestones, opened_at, due_at')
      .eq('tenant_id', ctx.tenantId)
      .in('status', ['open', 'in_progress'])
      .order('due_at', { ascending: true });
    if (error) return jsonError(500, 'load_failed', 'Could not load POA&M items');
    poamItems = (data as PoamItemRow[] | null) ?? [];
  }

  let bomParts: BomPartRow[] = [];
  if (needsBom) {
    const { data, error } = await ctx.supabase
      .from('launchpad_bom_parts')
      .select('assembly, part_number, description, manufacturer, supplier, country_of_origin, origin_confidence, prototype_only, flags')
      .eq('tenant_id', ctx.tenantId)
      .limit(5000);
    if (error) return jsonError(500, 'load_failed', 'Could not load BOM parts');
    bomParts = (data as BomPartRow[] | null) ?? [];
  }

  const reportData: ReportData = { profile, states, evidenceControlIds, latestSnapshot, poamItems, bomParts };
  const built = buildReport(key, reportData);
  const contentHash = createHash('sha256').update(built.markdown).digest('hex');

  const { data: doc, error: iErr } = await ctx.supabase
    .from('launchpad_generated_documents')
    .insert({
      tenant_id: ctx.tenantId,
      kind: 'report',
      title: built.title,
      status: 'draft',
      rule_pack_version: RULE_PACK_V1.version,
      payload: { report: key, format: 'markdown', markdown: built.markdown },
      content_hash: contentHash,
      created_by: ctx.user.id,
    })
    .select('id, created_at')
    .single();
  if (iErr || !doc) return jsonError(500, 'create_failed', 'Could not store the report draft');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'report.generated',
    entity: 'launchpad_generated_documents',
    entityId: doc.id,
    payload: { report: key, contentHash },
  });

  return NextResponse.json({
    ok: true,
    id: doc.id,
    report: key,
    title: built.title,
    markdown: built.markdown,
    created_at: doc.created_at,
  });
}
