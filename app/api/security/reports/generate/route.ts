import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LOCAL_DEV_ADMIN_COOKIE, isLocalDevAuthEnabled } from '@/lib/auth/local-dev-session';
import { buildSecurityReport, type SecurityReportType } from '@/lib/reports/security-report';
import { buildRemediationPlan, buildControlPacket } from '@/lib/reports/remediation';
import { buildPolicy, buildSupportingDoc, POLICY_KINDS } from '@/lib/reports/policy';
import { activeReportProvider } from '@/lib/reports/llm';
import type { EvidenceControl } from '@/lib/security/posture/policy-evidence';

/**
 * Live control set for the Evidence & Documentation Register — sourced ONLY
 * from the live MAS API (soc_ops.compliance_controls), never the seeded demo
 * store. If MAS is unset / unreachable / empty we return undefined so the report
 * OMITS the section rather than printing seeded statuses (the seeded store
 * contains fabricated reference-framework "compliant" rows — DCSA/SCIF/etc. —
 * which must never appear as posture in a signed CMMC report). Never throws.
 */
async function liveControls(): Promise<EvidenceControl[] | undefined> {
  const base = (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || '').replace(/\/$/, '');
  if (!base) return undefined;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.MAS_API_KEY) headers['X-API-Key'] = process.env.MAS_API_KEY;
    const res = await fetch(`${base}/api/compliance/controls`, { cache: 'no-store', headers });
    if (!res.ok) return undefined;
    const data = await res.json();
    const rows: any[] = Array.isArray(data?.controls) ? data.controls : [];
    // Keep the CMMC_L2 twin only so the count is per-practice (110), not doubled.
    const cmmc = rows.filter((r) => String(r.framework ?? '').toUpperCase().includes('CMMC'));
    const use = cmmc.length ? cmmc : rows;
    if (use.length === 0) return undefined;
    return use.map((r) => {
      const impl = String(r.implementation_state ?? 'planned');
      const status = impl === 'implemented' ? 'compliant' : impl === 'partial' ? 'partial' : impl === 'not_applicable' ? 'not_applicable' : 'non_compliant';
      const id = String(r.control_id ?? '');
      return { id, family: String(r.family ?? ''), status, evidence: r.evidence_uri ? [String(r.evidence_uri)] : [], name: String(r.title ?? id) };
    }).filter((c) => c.id);
  } catch {
    return undefined;
  }
}

export const dynamic = 'force-dynamic';
// Report generation can call an external LLM; allow more time.
export const maxDuration = 60;

const TYPES: SecurityReportType[] = ['cmmc-l2', 'sprs', 'poam', 'supply-chain', 'compliance-snapshot'];
const REMEDIATION_TYPES = ['remediation-plan', 'control-packet'];

async function authorize(): Promise<boolean> {
  try {
    const jar = await cookies();
    if (isLocalDevAuthEnabled() && jar.get(LOCAL_DEV_ADMIN_COOKIE)?.value) return true;
  } catch { /* ignore */ }
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) return true;
  } catch { /* ignore */ }
  return false;
}

// Report engine status + available report types.
export async function GET() {
  const provider = activeReportProvider();
  return NextResponse.json({
    reportTypes: [...TYPES, ...REMEDIATION_TYPES],
    llm: {
      configured: Boolean(provider),
      provider: provider?.provider ?? null,
      model: provider?.model ?? null,
      note: provider
        ? `MYCA reports agent will author narrative with ${provider.provider} (${provider.model}).`
        : 'No report LLM configured. Reports still generate from real data (deterministic narrative). Set PERPLEXITY_API_KEY (preferred), NVIDIA_NIM_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY to enable AI-authored prose.',
    },
  });
}

export async function POST(request: NextRequest) {
  if (!(await authorize())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const reportType = String(body.reportType ?? 'cmmc-l2');
  const format = String(body.format ?? 'json');

  try {
    let result: { html: string; meta: Record<string, unknown> } | null;
    if (reportType === 'remediation-plan') {
      result = await buildRemediationPlan();
    } else if (reportType === 'control-packet') {
      const controlId = String(body.controlId ?? '');
      if (!controlId) return NextResponse.json({ error: 'controlId required' }, { status: 400 });
      result = await buildControlPacket(controlId);
      if (!result) return NextResponse.json({ error: 'unknown controlId' }, { status: 404 });
    } else if (reportType.startsWith('policy:')) {
      result = await buildPolicy(reportType.slice('policy:'.length));
      if (!result) return NextResponse.json({ error: 'unknown policy family' }, { status: 404 });
    } else if (POLICY_KINDS.includes(reportType)) {
      result = await buildSupportingDoc(reportType);
      if (!result) return NextResponse.json({ error: 'unknown document kind' }, { status: 404 });
    } else if (TYPES.includes(reportType as SecurityReportType)) {
      result = await buildSecurityReport(reportType as SecurityReportType, { controls: await liveControls() });
    } else {
      return NextResponse.json({ error: 'unknown reportType' }, { status: 400 });
    }
    if (format === 'html') {
      return new NextResponse(result.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: 'report generation failed', detail: String(e) }, { status: 500 });
  }
}
