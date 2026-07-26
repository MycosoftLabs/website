import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

// Google Workspace CUI-boundary integrity check — BFF proxy.
//
// Google Workspace is OUTSIDE the CUI boundary by policy (CUI lives only in
// PreVeil), so this is a spillage-detection control: it looks for CUI markings
// that should never be in Workspace.
//
// AUTHORITY: MAS 188 owns the scan (systemd timer + worker, MAS PR #127) and is
// the source of truth. The website is UI/BFF only — it must never run the scan
// itself, and it must never synthesize a result.
//
// HONESTY RULES enforced here:
//   • MAS unreachable/erroring → `unavailable`. This is DISTINCT from
//     `not-configured`: an unreachable MAS means we do not know the boundary
//     state, and claiming "not configured" would assert knowledge we lack.
//   • A clean/green boundary is only ever reported when MAS says a scan
//     actually ran and found nothing. No empty response becomes a clean result.
//   • Hits carry LOCATION METADATA ONLY (owner/container/id/timestamp/marking
//     token). Never file contents or message bodies — the thing being detected
//     is CUI, and it must not transit the website, browser, or repo.
//
// AUTHZ: admin-gated. Next route handlers are public unless explicitly gated,
// and this endpoint enumerates suspected CUI-spillage locations and owners —
// exactly the reconnaissance an unauthenticated caller must not get. It also
// never echoes raw exception text, which would disclose MAS hostnames and
// internal topology; failures are logged server-side and reported generically.

const MAS_PATH = '/api/security/gws-boundary/status';

// Mirrors the marking tokens the MAS worker matches on. Displayed so the
// operator can see what is being looked for; MAS's own list wins when provided.
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

const BOUNDARY_POLICY =
  'No CUI may reside in or transit Google Workspace — it is outside the CUI Assessment Boundary.';

/** Location-only hit metadata. Deliberately has no content/body field. */
interface BoundaryHit {
  source?: string;
  container?: string;
  itemId?: string;
  owner?: string;
  markingToken?: string;
  detectedAt?: string;
}

interface MasBoundaryStatus {
  configured?: boolean;
  status?: string;
  guidance?: string;
  last_run?: string | null;
  scanned_scope?: string[];
  hit_count?: number;
  hits?: BoundaryHit[];
  keywords?: string[];
}

function masBase(): string {
  return (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || '').replace(/\/$/, '');
}

function masHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  const key = process.env.MAS_API_KEY || process.env.MAS_INTERNAL_API_KEY;
  if (key) h['X-API-Key'] = key;
  return h;
}

/** Strip any hit field that isn't location metadata — defence in depth. */
function sanitizeHit(h: BoundaryHit): BoundaryHit {
  return {
    source: h.source,
    container: h.container,
    itemId: h.itemId,
    owner: h.owner,
    markingToken: h.markingToken,
    detectedAt: h.detectedAt,
  };
}

const base = {
  check: 'google-workspace-cui-boundary',
  boundaryPolicy: BOUNDARY_POLICY,
  keywords: CUI_KEYWORDS,
  source: 'MAS 188 gws-boundary worker; CMMC L2 scope guide (Contractor Risk Managed Assets)',
};

/** Unknown-state response — used whenever MAS cannot be consulted. */
function unavailable(guidance: string) {
  return NextResponse.json({
    ...base,
    configured: false,
    status: 'unavailable',
    guidance,
    lastRun: null,
    scope: [],
    hitCount: null,
    hits: [],
  });
}

export async function GET() {
  // Gate first: everything below can disclose suspected-spillage locations.
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const url = masBase();

  if (!url) {
    return unavailable(
      'MAS_API_URL is not configured on this website environment, so the boundary-scan status cannot be read. ' +
        'This is not a statement that the boundary is clean or that scanning is off — the status is unknown.'
    );
  }

  try {
    const res = await fetch(`${url}${MAS_PATH}`, {
      cache: 'no-store',
      headers: masHeaders(),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return unavailable(
        `MAS boundary-scan status returned HTTP ${res.status}. The boundary state is unknown — this is not a clean result.`
      );
    }

    const m = (await res.json()) as MasBoundaryStatus;

    return NextResponse.json({
      ...base,
      // MAS's keyword list wins if it publishes one, so the two can't drift.
      keywords: m.keywords?.length ? m.keywords : CUI_KEYWORDS,
      configured: Boolean(m.configured),
      status: m.status ?? 'unknown',
      guidance: m.guidance ?? 'No guidance returned by the MAS boundary worker.',
      lastRun: m.last_run ?? null,
      scope: m.scanned_scope ?? [],
      hitCount: typeof m.hit_count === 'number' ? m.hit_count : null,
      hits: (m.hits ?? []).map(sanitizeHit),
    });
  } catch (e: any) {
    const timedOut = e?.name === 'TimeoutError' || /timeout/i.test(String(e?.message ?? ''));
    // Detail stays server-side: raw fetch errors carry the MAS host/port and
    // internal topology, which must not be echoed to a caller.
    console.error('[boundary-check] MAS status fetch failed:', e);
    return unavailable(
      timedOut
        ? 'MAS boundary-scan status timed out. The boundary state is unknown — this is not a clean result.'
        : 'Could not reach the MAS boundary-scan status endpoint. The boundary state is unknown — this is not a clean result.'
    );
  }
}
