/**
 * SAM.gov Opportunities API collector (api.data.gov key).
 * Fetches official notices only — never invents federal rows.
 *
 * Env: SAM_API_KEY or DATA_GOV_API_KEY (never commit).
 */

import { createHash } from 'crypto';
import type { NormalizedOpportunity } from '@/lib/launchpad/radar/types';

const SAM_SEARCH_URL = 'https://api.sam.gov/opportunities/v2/search';

export interface SamCollectorOptions {
  /** api.data.gov / SAM API key */
  apiKey: string;
  /** Limit results per run (default 25, max 100 for MVP safety) */
  limit?: number;
  /** Posted-from ISO date (YYYY-MM-DD); default = 7 days ago UTC */
  postedFrom?: string;
  /** Optional keyword filter */
  keyword?: string;
}

function daysAgoIsoDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

function asNotice(raw: Record<string, unknown>): NormalizedOpportunity | null {
  const sourceId =
    (typeof raw.noticeId === 'string' && raw.noticeId) ||
    (typeof raw.solicitationNumber === 'string' && raw.solicitationNumber) ||
    null;
  if (!sourceId) return null;

  const title =
    (typeof raw.title === 'string' && raw.title) ||
    (typeof raw.solicitationTitle === 'string' && raw.solicitationTitle) ||
    null;
  if (!title) return null;

  const uiLink =
    (typeof raw.uiLink === 'string' && raw.uiLink) ||
    (typeof raw.additionalInfoLink === 'string' && raw.additionalInfoLink) ||
    `https://sam.gov/opp/${encodeURIComponent(sourceId)}/view`;

  const rawJson = JSON.stringify(raw);
  const naics: string[] = [];
  if (typeof raw.naicsCode === 'string') naics.push(raw.naicsCode);
  if (Array.isArray(raw.naicsCodes)) naics.push(...raw.naicsCodes.map(String));

  const psc: string[] = [];
  if (typeof raw.classificationCode === 'string') psc.push(raw.classificationCode);

  const setAsides: string[] = [];
  if (typeof raw.typeOfSetAside === 'string' && raw.typeOfSetAside) setAsides.push(raw.typeOfSetAside);
  if (typeof raw.typeOfSetAsideDescription === 'string' && raw.typeOfSetAsideDescription) {
    setAsides.push(raw.typeOfSetAsideDescription);
  }

  return {
    source: 'sam',
    source_id: sourceId,
    title,
    agency: typeof raw.fullParentPathName === 'string' ? raw.fullParentPathName.split('.')[0] : null,
    subagency: typeof raw.department === 'string' ? raw.department : null,
    instrument: typeof raw.type === 'string' ? raw.type : null,
    notice_type: typeof raw.baseType === 'string' ? raw.baseType : null,
    posted_at: typeof raw.postedDate === 'string' ? raw.postedDate : null,
    updated_at: typeof raw.archiveDate === 'string' ? null : null,
    due_at:
      (typeof raw.responseDeadLine === 'string' && raw.responseDeadLine) ||
      (typeof raw.responseDeadline === 'string' && raw.responseDeadline) ||
      null,
    timezone: null,
    set_asides: setAsides,
    naics,
    psc,
    official_url: uiLink,
    source_hash: sha256Hex(rawJson),
    normalized: { sam: raw },
  };
}

export type SamCollectResult =
  | { ok: true; records: NormalizedOpportunity[]; skipped?: false }
  | { ok: true; records: []; skipped: true; reason: 'sam_not_configured' }
  | { ok: false; error: string };

/**
 * Fetch recent SAM.gov opportunities. Returns [] on empty API pages.
 * When no API key is configured, returns skipped (never invents rows).
 * Throws only for programming misuse when `apiKey` is required by opts
 * and the caller used the legacy throw path via `collectSamOpportunities`.
 */
export async function collectSamOpportunitiesSafe(
  opts: Partial<SamCollectorOptions> & { apiKey?: string | null },
): Promise<SamCollectResult> {
  const apiKey = opts.apiKey?.trim() ?? '';
  if (!apiKey) {
    return {
      ok: true,
      records: [],
      skipped: true,
      reason: 'sam_not_configured',
    };
  }
  try {
    const records = await collectSamOpportunities({
      apiKey,
      limit: opts.limit,
      postedFrom: opts.postedFrom,
      keyword: opts.keyword,
    });
    return { ok: true, records };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'SAM collector failed' };
  }
}

/**
 * Fetch recent SAM.gov opportunities. Returns [] on empty API pages.
 * Throws if the API key is missing or the upstream errors.
 */
export async function collectSamOpportunities(
  opts: SamCollectorOptions,
): Promise<NormalizedOpportunity[]> {
  if (!opts.apiKey?.trim()) {
    throw new Error(
      'SAM not configured (SAM_API_KEY / DATA_GOV_API_KEY unset) — refusing to invent opportunities',
    );
  }
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const postedFrom = opts.postedFrom ?? daysAgoIsoDate(7);

  const url = new URL(SAM_SEARCH_URL);
  url.searchParams.set('api_key', opts.apiKey);
  url.searchParams.set('postedFrom', postedFrom);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', '0');
  if (opts.keyword) url.searchParams.set('title', opts.keyword);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SAM.gov API ${res.status}: ${body.slice(0, 400)}`);
  }

  const json = (await res.json()) as { opportunitiesData?: unknown[]; totalRecords?: number };
  const rows = Array.isArray(json.opportunitiesData) ? json.opportunitiesData : [];
  const out: NormalizedOpportunity[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const notice = asNotice(row as Record<string, unknown>);
    if (notice) out.push(notice);
  }
  return out;
}

export function resolveSamApiKeyFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return env.SAM_API_KEY?.trim() || env.DATA_GOV_API_KEY?.trim() || null;
}
