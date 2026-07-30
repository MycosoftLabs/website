/**
 * Network diagnostics BFF — proxies MAS `/api/network/*` (live SoR).
 * Does not run local nmap/ping from the Next.js process.
 *
 * @date July 30, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-auth';
import { masFetch, masBase } from '@/lib/security/soc/mas-bff';

export const dynamic = 'force-dynamic';

const ALLOWED: Record<string, string> = {
  health: '/api/network/health',
  connectivity: '/api/network/connectivity',
  diagnostics: '/api/network/diagnostics',
  latency: '/api/network/latency',
  dns: '/api/network/dns',
  kev: '/api/network/kev',
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  if (!masBase()) {
    return NextResponse.json(
      {
        state: 'unavailable',
        error: 'MAS_API_URL not configured',
        data: null,
        source: 'MAS 188 /api/network/*',
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const action = (searchParams.get('action') || 'diagnostics').toLowerCase();
  const path = ALLOWED[action];
  if (!path) {
    return NextResponse.json(
      { error: 'Unknown action', allowed: Object.keys(ALLOWED) },
      { status: 400 },
    );
  }

  let masPath = path;
  if (action === 'dns') {
    const domains = (searchParams.get('domains') || 'mycosoft.com').split(',')[0].trim();
    const HOSTNAME_RE =
      /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
    if (!HOSTNAME_RE.test(domains)) {
      return NextResponse.json(
        { error: 'Invalid domain', details: 'domains must be a single valid hostname' },
        { status: 400 },
      );
    }
    masPath = `${path}?domains=${encodeURIComponent(domains)}`;
  }

  const outcome = await masFetch(masPath, { timeoutMs: 20000 });
  if (!outcome.ok) {
    return NextResponse.json(
      {
        state: 'unavailable',
        data: null,
        source: `MAS 188 ${path}`,
        reason:
          outcome.status === 0
            ? 'unreachable / timed out'
            : `MAS returned ${outcome.status}`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    state: 'healthy',
    source: `MAS 188 ${path}`,
    collected_at: new Date().toISOString(),
    data: outcome.body,
  });
}
