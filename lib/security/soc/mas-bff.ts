// ═══════════════════════════════════════════════════════════════════════════
// mas-bff — the single MAS proxy helper for every SOC BFF route
// ═══════════════════════════════════════════════════════════════════════════
//
// One place that: gates on requireAdmin, resolves the MAS base URL from env
// (NO localhost fallback — a localhost default silently presents a dev service
// as production authority), attaches the server-only API key, bounds each call
// with a timeout, and returns a typed outcome the caller wraps in an
// OperationalState. Modeled on the clean pattern in
// app/api/security/posture/route.ts.
//
// The website is UI/BFF only. This helper never fabricates data; on any failure
// it returns { ok:false } so the envelope becomes `unavailable`, not a zero.

import { requireAdmin } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';
import { fromMas, unavailable, type OperationalState } from './operational-state';

export interface MasOutcome {
  ok: boolean;
  status: number; // 0 == network error / timeout
  body: any;
}

/** MAS base URL from env. Empty string when unconfigured — callers must treat as unavailable. */
export function masBase(): string {
  return (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || '').replace(/\/$/, '');
}

function masHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json', ...extra };
  // Posture-gated MAS routes want the MYCA posture key; others accept MAS_API_KEY.
  const key = process.env.MYCA_POSTURE_API_KEY || process.env.MAS_API_KEY || process.env.MAS_INTERNAL_API_KEY || '';
  if (key) h['X-API-Key'] = key;
  return h;
}

/**
 * Low-level MAS fetch. Never throws — returns a typed outcome. status 0 means
 * the request never completed (unreachable / timed out / unconfigured base).
 */
export async function masFetch(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<MasOutcome> {
  const base = masBase();
  if (!base) return { ok: false, status: 0, body: null };
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const timeoutMs = init?.timeoutMs ?? 8000;
  try {
    const res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: masHeaders(init?.headers as Record<string, string> | undefined),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

/**
 * Admin gate for a SOC BFF handler. Returns the 401/403 NextResponse to short-
 * circuit with, or null when the caller may proceed.
 */
export async function socAuthGate(): Promise<NextResponse | null> {
  const auth = await requireAdmin();
  return auth.error ?? null;
}

/**
 * Convenience: GET a MAS path and return it already wrapped in an
 * OperationalState envelope. `extract` pulls the payload from the MAS body.
 */
export async function masState<T>(
  source: string,
  path: string,
  extract: (body: any) => T,
  init?: RequestInit & { timeoutMs?: number },
): Promise<OperationalState<T>> {
  if (!masBase()) return unavailable<T>(source, 'MAS_API_URL not configured');
  const outcome = await masFetch(path, init);
  return fromMas<T>(source, outcome, extract);
}
