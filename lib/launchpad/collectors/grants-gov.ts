/**
 * Official Grants.gov Search2 API — keyless.
 * Nightly collectors must not require GRANTS_GOV_API_KEY.
 */

import { createHash } from 'crypto';
import type { NormalizedOpportunity } from '@/lib/launchpad/radar/types';

const GRANTS_SEARCH = 'https://api.grants.gov/v1/api/search2';

export type GrantsCollectResult =
  | { ok: true; records: NormalizedOpportunity[] }
  | { ok: false; error: string };

function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function asNotice(raw: Record<string, unknown>): NormalizedOpportunity | null {
  const sourceId = asString(raw.id) || asString(raw.number) || asString(raw.oppId);
  const title = asString(raw.title) || asString(raw.opportunityTitle);
  if (!sourceId || !title) return null;
  const official =
    asString(raw.opportunityLink) ||
    asString(raw.url) ||
    `https://www.grants.gov/search-results-detail/${encodeURIComponent(sourceId)}`;
  const rawJson = JSON.stringify(raw);
  return {
    source: 'grants_gov',
    source_id: sourceId,
    title,
    agency: asString(raw.agency) || asString(raw.agencyCode),
    subagency: asString(raw.agencyName),
    instrument: asString(raw.opportunityCategory) || 'grant',
    notice_type: asString(raw.oppStatus) || asString(raw.opportunityStatus),
    posted_at: asString(raw.postDate) || asString(raw.openDate),
    due_at: asString(raw.closeDate) || asString(raw.close_date),
    timezone: null,
    set_asides: [],
    naics: [],
    psc: [],
    official_url: official,
    source_hash: sha256Hex(rawJson),
    normalized: { grants_gov: raw, feed: 'grants.gov' },
  };
}

export async function collectGrantsGovOpportunitiesSafe(opts?: {
  limit?: number;
}): Promise<GrantsCollectResult> {
  const limit = Math.min(Math.max(opts?.limit ?? 25, 1), 100);
  try {
    const res = await fetch(GRANTS_SEARCH, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: limit,
        oppStatuses: 'forecasted|posted',
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `Grants.gov API ${res.status}: ${body.slice(0, 400)}` };
    }
    const json = (await res.json()) as {
      data?: { oppHits?: unknown[]; opportunityHits?: unknown[] };
      oppHits?: unknown[];
    };
    const rows =
      json.data?.oppHits ??
      json.data?.opportunityHits ??
      json.oppHits ??
      [];
    const records: NormalizedOpportunity[] = [];
    for (const row of Array.isArray(rows) ? rows.slice(0, limit) : []) {
      if (!row || typeof row !== 'object') continue;
      const notice = asNotice(row as Record<string, unknown>);
      if (notice) records.push(notice);
    }
    return { ok: true, records };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Grants.gov collector failed' };
  }
}
