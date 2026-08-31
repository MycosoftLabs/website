/**
 * Honest platform probes for Launchpad. Never invents healthy when a hop is down.
 */

import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';

export type ProbeStatus = 'ok' | 'down' | 'unconfigured';

export interface ServiceProbe {
  service: 'supabase' | 'mindex' | 'mas';
  status: ProbeStatus;
  url?: string;
  detail?: string;
  latencyMs?: number;
}

export interface PlatformHealth {
  supabase: ServiceProbe;
  mindex: ServiceProbe;
  mas: ServiceProbe;
}

async function probeHttp(url: string, timeoutMs: number): Promise<{ ok: boolean; status: number; latencyMs: number; detail?: string }> {
  const started = Date.now();
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - started };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      detail: e instanceof Error ? e.message : 'probe failed',
    };
  }
}

export async function probeSupabase(): Promise<ServiceProbe> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { service: 'supabase', status: 'unconfigured', detail: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' };
  }
  const started = Date.now();
  try {
    const svc = createLaunchpadServiceClient();
    const { error } = await svc.from('launchpad_tenants').select('id').limit(1);
    if (error) {
      return {
        service: 'supabase',
        status: 'down',
        url,
        latencyMs: Date.now() - started,
        detail: error.message,
      };
    }
    return { service: 'supabase', status: 'ok', url, latencyMs: Date.now() - started };
  } catch (e) {
    return {
      service: 'supabase',
      status: 'down',
      url,
      latencyMs: Date.now() - started,
      detail: e instanceof Error ? e.message : 'supabase probe failed',
    };
  }
}

export async function probeMindex(): Promise<ServiceProbe> {
  const base = (process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL || '').replace(/\/$/, '');
  if (!base) {
    return { service: 'mindex', status: 'unconfigured', detail: 'MINDEX_API_URL is not set' };
  }
  const hit = await probeHttp(`${base}/health`, 4000);
  if (hit.ok) return { service: 'mindex', status: 'ok', url: base, latencyMs: hit.latencyMs };
  return {
    service: 'mindex',
    status: 'down',
    url: base,
    latencyMs: hit.latencyMs,
    detail: hit.detail || `HTTP ${hit.status}`,
  };
}

export async function probeMas(): Promise<ServiceProbe> {
  const base = (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || '').replace(/\/$/, '');
  if (!base) {
    return { service: 'mas', status: 'unconfigured', detail: 'MAS_API_URL is not set' };
  }
  const hit = await probeHttp(`${base}/health`, 4000);
  if (hit.ok) return { service: 'mas', status: 'ok', url: base, latencyMs: hit.latencyMs };
  return {
    service: 'mas',
    status: 'down',
    url: base,
    latencyMs: hit.latencyMs,
    detail: hit.detail || `HTTP ${hit.status}`,
  };
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  const [supabase, mindex, mas] = await Promise.all([probeSupabase(), probeMindex(), probeMas()]);
  return { supabase, mindex, mas };
}
