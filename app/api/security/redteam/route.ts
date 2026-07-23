/**
 * Red Team API — proxies to MAS `/api/redteam/*` (no local mocks or nmap from Next).
 *
 * @date May 03, 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

// No localhost fallback — a localhost default silently presents a dev service as
// the production red-team/MAS authority (audit P0: authority boundary leak).
const MAS_API_URL = (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || '').replace(/\/$/, '');
const MAS_API_KEY = process.env.MAS_API_KEY || process.env.MYCA_POSTURE_API_KEY || '';

function masHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (MAS_API_KEY) h['X-API-Key'] = MAS_API_KEY;
  return h;
}

async function masFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${MAS_API_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, { ...init, headers: { ...masHeaders(), ...(init?.headers as Record<string, string>) }, cache: 'no-store' });
}

/**
 * GET ?action=health|simulations|simulation|attack-vectors|soc-runs|soc-findings
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'health';

  try {
    switch (action) {
      case 'health': {
        const res = await masFetch('/api/redteam/health');
        const body = await res.json().catch(() => ({}));
        return NextResponse.json(body, { status: res.status });
      }
      case 'soc-runs': {
        const lim = searchParams.get('limit') || '40';
        const res = await masFetch(`/api/redteam/soc-runs?limit=${encodeURIComponent(lim)}`);
        const body = await res.json().catch(() => ({}));
        return NextResponse.json(body, { status: res.status });
      }
      case 'soc-findings': {
        const lim = searchParams.get('limit') || '100';
        const runId = searchParams.get('run_id');
        const q = new URLSearchParams({ limit: lim });
        if (runId) q.set('run_id', runId);
        const res = await masFetch(`/api/redteam/soc-findings?${q.toString()}`);
        const body = await res.json().catch(() => ({}));
        return NextResponse.json(body, { status: res.status });
      }
      case 'simulations': {
        const res = await masFetch('/api/redteam/simulations');
        const body = await res.json().catch(() => ({}));
        return NextResponse.json(body, { status: res.status });
      }
      case 'simulation': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'Simulation ID required' }, { status: 400 });
        }
        const res = await masFetch(`/api/redteam/simulation/${encodeURIComponent(id)}`);
        const body = await res.json().catch(() => ({}));
        return NextResponse.json(body, { status: res.status });
      }
      case 'attack-vectors': {
        const res = await masFetch('/api/redteam/attack-vectors');
        const body = await res.json().catch(() => ({}));
        return NextResponse.json(body, { status: res.status });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    console.error('[redteam proxy GET]', e);
    return NextResponse.json(
      { error: 'mas_unreachable', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}

/**
 * POST body: { action, authorization_code?, ... }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, authorization_code: authCode, ...data } = body as Record<string, unknown> & {
      action?: string;
      authorization_code?: string;
    };

    const q = (code: string) =>
      `?authorization_code=${encodeURIComponent(code)}`;

    switch (action) {
      case 'authorize': {
        const res = await masFetch('/api/redteam/authorize', { method: 'POST' });
        const out = await res.json().catch(() => ({}));
        return NextResponse.json(out, { status: res.status });
      }

      case 'credential-test': {
        if (!authCode) {
          return NextResponse.json({ error: 'Authorization code required' }, { status: 403 });
        }
        const payload = {
          target_system: (data.target_system as string) || 'localhost',
          test_type: (data.test_type as string) || 'policy',
          wordlist: data.wordlist as string | undefined,
          max_attempts: typeof data.max_attempts === 'number' ? data.max_attempts : 10,
          delay_seconds: typeof data.delay_seconds === 'number' ? data.delay_seconds : 1.0,
        };
        const res = await masFetch(`/api/redteam/credential-test${q(authCode)}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const out = await res.json().catch(() => ({}));
        return NextResponse.json(out, { status: res.status });
      }

      case 'phishing-sim': {
        if (!authCode) {
          return NextResponse.json({ error: 'Authorization code required' }, { status: 403 });
        }
        const payload = {
          target_group: (data.target_group as string) || 'internal-test',
          template: (data.template as string) || 'generic',
          landing_page: (data.landing_page as string) || 'default',
          track_credentials: Boolean(data.track_credentials),
          duration_hours: typeof data.duration_hours === 'number' ? data.duration_hours : 24,
        };
        const res = await masFetch(`/api/redteam/phishing-sim${q(authCode)}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const out = await res.json().catch(() => ({}));
        return NextResponse.json(out, { status: res.status });
      }

      case 'pivot-test': {
        if (!authCode) {
          return NextResponse.json({ error: 'Authorization code required' }, { status: 403 });
        }
        const payload = {
          source_network: (data.source_network as string) || '192.168.0.0/24',
          target_network: (data.target_network as string) || '192.168.0.187',
          protocols: Array.isArray(data.protocols) ? data.protocols : ['icmp', 'tcp'],
          ports: Array.isArray(data.ports) ? data.ports : undefined,
          test_depth: (data.test_depth as string) || 'shallow',
        };
        const res = await masFetch(`/api/redteam/pivot-test${q(authCode)}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const out = await res.json().catch(() => ({}));
        return NextResponse.json(out, { status: res.status });
      }

      case 'exfil-test': {
        if (!authCode) {
          return NextResponse.json({ error: 'Authorization code required' }, { status: 403 });
        }
        const payload = {
          data_type: (data.data_type as string) || 'synthetic',
          exfil_method: (data.exfil_method as string) || 'http',
          data_size_kb: typeof data.data_size_kb === 'number' ? data.data_size_kb : 100,
          target_endpoint: data.target_endpoint as string | undefined,
        };
        const res = await masFetch(`/api/redteam/exfil-test${q(authCode)}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const out = await res.json().catch(() => ({}));
        return NextResponse.json(out, { status: res.status });
      }

      case 'cancel': {
        const simulationId = data.simulation_id as string | undefined;
        if (!simulationId) {
          return NextResponse.json({ error: 'simulation_id required' }, { status: 400 });
        }
        const res = await masFetch(`/api/redteam/simulation/${encodeURIComponent(simulationId)}/cancel`, {
          method: 'POST',
        });
        const out = await res.json().catch(() => ({}));
        return NextResponse.json(out, { status: res.status });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    console.error('[redteam proxy POST]', e);
    return NextResponse.json(
      { error: 'mas_unreachable', detail: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
