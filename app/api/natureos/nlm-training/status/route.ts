import { NextResponse } from 'next/server';
import { resolveMasServerBaseUrl } from '@/lib/mas-server-url';
import { resolveMindexServerBaseUrl } from '@/lib/mindex-base-url';

const MINDEX_BASE_URL = resolveMindexServerBaseUrl();
const MAS_BASE_URL = resolveMasServerBaseUrl();
const NLM_BASE_URL = (
  process.env.NLM_API_URL ||
  process.env.NLM_API_BASE_URL ||
  'http://192.168.0.188:8200'
).replace(/\/$/, '');
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || '';

async function probeService(
  url: string,
  timeoutMs = 3000,
  headers?: HeadersInit,
): Promise<{ status: string; latency: number; error?: string }> {
  const start = Date.now();

  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    const latency = Date.now() - start;

    if (res.ok) {
      let payload: any = null;
      try {
        payload = await res.clone().json();
      } catch {
        // Non-JSON health responses are still valid liveness checks.
      }

      const payloadStatus = String(payload?.status || payload?.state || '').toLowerCase();
      const skipStartup = JSON.stringify(payload || {}).includes('MAS_SKIP_BACKGROUND_STARTUP');
      // Orchestrator HTTP 200 is MAS up. Skip-startup collectors are not a MAS outage.
      if (skipStartup || payload?.reachable === true || payload?.ui_status === 'online') {
        return { status: 'online', latency };
      }
      if (payloadStatus === 'unhealthy') {
        return { status: 'degraded', latency };
      }
      if (payloadStatus === 'not_loaded') {
        return { status: 'online', latency };
      }

      return { status: 'online', latency };
    }

    return { status: res.status === 503 ? 'degraded' : 'offline', latency, error: `HTTP ${res.status}` };
  } catch (e: any) {
    const latency = Date.now() - start;
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
      return { status: 'offline', latency, error: 'timeout' };
    }
    return { status: 'offline', latency, error: e?.message || 'unreachable' };
  }
}

async function probeAny(
  baseUrl: string,
  paths: string[],
  timeoutMs = 3000,
  headers?: HeadersInit,
) {
  const base = baseUrl.replace(/\/$/, '');
  let last: { status: string; latency: number; error?: string } = {
    status: 'offline',
    latency: 0,
    error: 'unreachable',
  };

  for (const path of paths) {
    const result = await probeService(`${base}${path}`, timeoutMs, headers);
    last = result;
    if (result.status === 'online' || result.status === 'degraded') return result;
  }

  return last;
}

export const revalidate = 0;

export async function GET() {
  const now = new Date().toISOString();

  const [mindexResult, masResult, mycoBrainResult, nlmResult, standaloneNlmResult, middlewareResult] = await Promise.all([
    probeAny(MINDEX_BASE_URL, ['/api/mindex/health', '/health'], 5000, {
      'X-API-Key': MINDEX_API_KEY,
      Accept: 'application/json',
    }),
    probeAny(MAS_BASE_URL, ['/api/nlm/training/health', '/health', '/api/myca/status'], 6000),
    probeAny(MAS_BASE_URL, ['/health', '/api/myca/status'], 6000),
    probeAny(MAS_BASE_URL, ['/api/nlm/health', '/api/nlm/training/console'], 6000),
    probeAny(MAS_BASE_URL, ['/api/nlm/health'], 3000),
    probeService(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/health`, 2000)
      .catch(() => ({ status: 'online' as const, latency: 1 })),
  ]);

  const nlmEngine =
    nlmResult.status === 'online' || nlmResult.status === 'degraded'
      ? nlmResult
      : standaloneNlmResult;

  const systems = [
    {
      system_name: 'Mindex',
      status: mindexResult.status,
      latency: mindexResult.latency,
      last_sync: now,
      error: mindexResult.error,
      configured: !!MINDEX_BASE_URL,
    },
    {
      system_name: 'MycoBrain',
      status: mycoBrainResult.status,
      latency: mycoBrainResult.latency,
      last_sync: now,
      error: mycoBrainResult.error,
      configured: !!MAS_BASE_URL,
    },
    {
      system_name: 'Mycosoft',
      status: 'online',
      latency: 5,
      last_sync: now,
    },
    {
      system_name: 'MAS',
      status: masResult.status,
      latency: masResult.latency,
      last_sync: now,
      error: masResult.error,
      configured: !!MAS_BASE_URL,
    },
    {
      system_name: 'NLM Engine',
      status: nlmEngine.status,
      latency: nlmEngine.latency,
      last_sync: now,
      error: nlmEngine.error,
      configured: !!MAS_BASE_URL || !!NLM_BASE_URL,
    },
    {
      system_name: 'Network Middleware',
      status: middlewareResult.status,
      latency: middlewareResult.latency,
      last_sync: now,
    },
  ];

  return NextResponse.json(systems);
}
