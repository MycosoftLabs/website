import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Google Workspace CUI-boundary integrity check (Perplexity doc §8.5).
// Google Workspace is OUTSIDE the CUI boundary by policy; this endpoint reports
// whether an automated scan for CUI-marking keywords is configured and, when it
// is, surfaces hits. It never fabricates results: if creds are absent it says so.

const CUI_KEYWORDS = [
  'CUI',
  'CONTROLLED UNCLASSIFIED',
  'SP-CTI',
  'SP-EXPT',
  'SP-PROPIN',
  'CUI//',
  'ITAR',
  'EXPORT CONTROLLED',
];

const SCOPE = [
  'Gmail (Morgan + RJ mailboxes)',
  'Google Drive (shared + personal)',
  'Google Calendar attachments',
];

function isConfigured(): boolean {
  return Boolean(
    (process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL && process.env.GOOGLE_WORKSPACE_SA_KEY) ||
      process.env.GOOGLE_WORKSPACE_REPORTS_TOKEN
  );
}

export async function GET() {
  const configured = isConfigured();

  const base = {
    check: 'google-workspace-cui-boundary',
    boundaryPolicy: 'No CUI may reside in or transit Google Workspace — it is outside the CUI Assessment Boundary.',
    keywords: CUI_KEYWORDS,
    scope: SCOPE,
    source: 'CMMC L2 scope guide (Contractor Risk Managed Assets); Perplexity doc §8.5',
  };

  if (!configured) {
    return NextResponse.json({
      ...base,
      configured: false,
      status: 'not-configured',
      guidance:
        'Automated scanning is not configured. To enable: create a Google Workspace service account with domain-wide delegation for the Admin SDK Reports API + Drive read scope, then set GOOGLE_WORKSPACE_ADMIN_EMAIL + GOOGLE_WORKSPACE_SA_KEY (or GOOGLE_WORKSPACE_REPORTS_TOKEN) in the prod env. Until then, perform the boundary review manually on a documented cadence and record it as evidence.',
      lastRun: null,
      hits: [],
    });
  }

  // Configured: the actual Admin SDK / Drive scan is wired in a follow-up slice.
  // We return a structured "configured but scan pending" response rather than
  // inventing hits — honesty over a fake green check.
  return NextResponse.json({
    ...base,
    configured: true,
    status: 'configured-scan-pending',
    guidance:
      'Credentials detected. The Admin SDK Reports API / Drive keyword scan executes in the boundary-scan worker (not yet wired in this route). No results are shown until the worker runs — this endpoint will not report a clean boundary it has not actually verified.',
    lastRun: null,
    hits: [],
  });
}
