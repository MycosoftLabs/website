/**
 * Official SBIR.gov public API — DSIP-class topics, no scrape, no login.
 * https://api.www.sbir.gov/public/api/solicitations
 *
 * Stored as source `dsip` so existing CHECK constraints apply. Copy must say
 * these are official SBIR.gov topics (same public set posted on DSIP), not a
 * DSIP login.
 */

import { createHash } from 'crypto';
import type { NormalizedOpportunity } from '@/lib/launchpad/radar/types';

const SBIR_SOLICITATIONS = 'https://api.www.sbir.gov/public/api/solicitations';

export type SbirCollectResult =
  | { ok: true; records: NormalizedOpportunity[] }
  | { ok: false; error: string };

function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function asNotice(raw: Record<string, unknown>): NormalizedOpportunity | null {
  const sourceId =
    asString(raw.solicitation_number) ||
    asString(raw.solicitation_id) ||
    asString(raw.id);
  const title = asString(raw.solicitation_title) || asString(raw.title);
  if (!sourceId || !title) return null;
  const official =
    asString(raw.solicitation_agency_url) ||
    asString(raw.solicitation_url) ||
    `https://www.sbir.gov/sbirsearch/detail/${encodeURIComponent(sourceId)}`;
  const rawJson = JSON.stringify(raw);
  return {
    source: 'dsip',
    source_id: `sbir:${sourceId}`,
    title,
    agency: asString(raw.agency) || asString(raw.branch),
    subagency: asString(raw.branch),
    instrument: asString(raw.program) || 'SBIR/STTR',
    notice_type: asString(raw.program) || 'solicitation',
    posted_at: asString(raw.open_date) || asString(raw.release_date),
    due_at: asString(raw.close_date) || asString(raw.close_date_ts),
    timezone: null,
    set_asides: [],
    naics: [],
    psc: [],
    official_url: official,
    source_hash: sha256Hex(rawJson),
    normalized: {
      feed: 'sbir.gov',
      dsip_class: true,
      note: 'Official SBIR.gov public API. Same public topics posted on DSIP. Not a DSIP login.',
      sbir: raw,
    },
  };
}

export async function collectSbirOpportunitiesSafe(opts?: {
  limit?: number;
}): Promise<SbirCollectResult> {
  const limit = Math.min(Math.max(opts?.limit ?? 25, 1), 100);
  try {
    const url = new URL(SBIR_SOLICITATIONS);
    url.searchParams.set('limit', String(limit));
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `SBIR.gov API ${res.status}: ${body.slice(0, 400)}` };
    }
    const json = (await res.json()) as unknown;
    const rows = Array.isArray(json)
      ? json
      : Array.isArray((json as { solicitations?: unknown[] }).solicitations)
        ? (json as { solicitations: unknown[] }).solicitations
        : [];
    const records: NormalizedOpportunity[] = [];
    for (const row of rows.slice(0, limit)) {
      if (!row || typeof row !== 'object') continue;
      const notice = asNotice(row as Record<string, unknown>);
      if (notice) records.push(notice);
    }
    return { ok: true, records };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'SBIR.gov collector failed' };
  }
}
