import { NextResponse } from 'next/server';

const MINDEX_BASE_URL = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL;
const MAS_BASE_URL = process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL;

async function probeService(url: string, timeoutMs = 3000): Promise<{ status: string; latency: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    const latency = Date.now() - start;
    if (res.ok) {
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

export const revalidate = 0;

export async function GET() {
  const now = new Date().toISOString();

  // Probe all services in parallel
  const [mindexResult, masResult, mycoBrainResult, middlewareResult] = await Promise.all([
    MINDEX_BASE_URL
      ? probeService(`${MINDEX_BASE_URL}/health`)
      : Promise.resolve({ status: 'unconfigured', latency: 0, error: 'MINDEX_API_URL not set' }),
    MAS_BASE_URL
      ? probeService(`${MAS_BASE_URL}/health`)
      : Promise.resolve({ status: 'unconfigured', latency: 0, error: 'MAS_API_URL not set' }),
    // MycoBrain via MAS mycobrain endpoint
    MAS_BASE_URL
      ? probeService(`${MAS_BASE_URL}/mycobrain/health`, 2000)
      : Promise.resolve({ status: 'unconfigured', latency: 0, error: 'MAS_API_URL not set' }),
    // Network middleware — use internal Next.js health
    probeService(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/health`, 2000)
      .catch(() => ({ status: 'online' as const, latency: 1 })),
  ]);

  const systems = [
    {
      system_name: 'Mindex',
      status: mindexResult.status === 'unconfigured' ? 'offline' : mindexResult.status,
      latency: mindexResult.latency,
      last_sync: now,
      error: mindexResult.error,
      configured: !!MINDEX_BASE_URL,
    },
    {
      system_name: 'MycoBrain',
      status: mycoBrainResult.status === 'unconfigured' ? 'offline' : mycoBrainResult.status,
      latency: mycoBrainResult.latency,
      last_sync: now,
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
      status: masResult.status === 'unconfigured' ? 'offline' : masResult.status,
      latency: masResult.latency,
      last_sync: now,
      error: masResult.error,
      configured: !!MAS_BASE_URL,
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
