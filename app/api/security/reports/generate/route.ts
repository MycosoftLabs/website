import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LOCAL_DEV_ADMIN_COOKIE, isLocalDevAuthEnabled } from '@/lib/auth/local-dev-session';
import { buildSecurityReport, type SecurityReportType } from '@/lib/reports/security-report';
import { activeReportProvider } from '@/lib/reports/llm';

export const dynamic = 'force-dynamic';
// Report generation can call an external LLM; allow more time.
export const maxDuration = 60;

const TYPES: SecurityReportType[] = ['cmmc-l2', 'sprs', 'poam', 'supply-chain', 'compliance-snapshot'];

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
    reportTypes: TYPES,
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
  const reportType = String(body.reportType ?? 'cmmc-l2') as SecurityReportType;
  if (!TYPES.includes(reportType)) return NextResponse.json({ error: 'unknown reportType' }, { status: 400 });

  try {
    const { html, meta } = await buildSecurityReport(reportType);
    const format = String(body.format ?? 'json');
    if (format === 'html') {
      return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return NextResponse.json({ html, meta });
  } catch (e) {
    return NextResponse.json({ error: 'report generation failed', detail: String(e) }, { status: 500 });
  }
}
