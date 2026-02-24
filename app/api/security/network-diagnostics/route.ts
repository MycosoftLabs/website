/**
 * Network Diagnostics API
 *
 * Proxies to MAS /api/network endpoints for DNS, latency, topology,
 * connectivity, and vulnerability checks.
 *
 * @version 1.0.0
 * @date February 12, 2026
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.188:8001';
const MAS_API_KEY = process.env.MAS_API_KEY;

export const dynamic = 'force-dynamic';

async function proxyToMas(path: string, searchParams?: URLSearchParams) {
  const url = new URL(`${MAS_API_URL}/api/network${path}`);
  if (searchParams) {
    searchParams.forEach((v, k) => url.searchParams.append(k, v));
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (MAS_API_KEY) headers['X-API-Key'] = MAS_API_KEY;

  const res = await fetch(url.toString(), {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

/**
 * GET /api/security/network-diagnostics
 *
 * Query params:
 * - action: health | dns | latency | connectivity | diagnostics
 * - domains: comma-separated (for action=dns)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'diagnostics';

  try {
    switch (action) {
      case 'health':
        return proxyToMas('/health');
      case 'dns': {
        const domains = searchParams.get('domains');
        const includeSystem = searchParams.get('include_system') ?? 'true';
        const params = new URLSearchParams();
        if (domains) params.append('domains', domains);
        params.append('include_system', includeSystem);
        return proxyToMas('/dns', params);
      }
      case 'latency':
        return proxyToMas('/latency');
      case 'connectivity':
        return proxyToMas('/connectivity');
      case 'diagnostics':
      default:
        return proxyToMas('/diagnostics');
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Network diagnostics request failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
