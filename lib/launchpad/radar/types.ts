/**
 * Contract Radar — normalized opportunity types (master plan §15.3).
 * No mock/sample federal rows live here — only the wire contract.
 */

export const OPPORTUNITY_SOURCES = [
  'sam',
  'dsip',
  'grants_gov',
  'diu',
  'darpa',
  'nspires',
  'nsf',
  'other',
] as const;

export type OpportunitySource = (typeof OPPORTUNITY_SOURCES)[number];

export interface NormalizedOpportunity {
  source: OpportunitySource;
  source_id: string;
  title: string;
  agency?: string | null;
  subagency?: string | null;
  instrument?: string | null;
  notice_type?: string | null;
  posted_at?: string | null;
  updated_at?: string | null;
  questions_due_at?: string | null;
  due_at?: string | null;
  timezone?: string | null;
  set_asides?: string[];
  naics?: string[];
  psc?: string[];
  official_url: string;
  /** sha256 of the raw official payload (amendment detection). */
  source_hash: string;
  normalized?: Record<string, unknown>;
}

export function isOpportunitySource(v: unknown): v is OpportunitySource {
  return typeof v === 'string' && (OPPORTUNITY_SOURCES as readonly string[]).includes(v);
}

export function validateNormalizedOpportunity(
  raw: unknown,
): { ok: true; record: NormalizedOpportunity } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'record must be an object' };
  const r = raw as Record<string, unknown>;
  if (!isOpportunitySource(r.source)) return { ok: false, error: 'invalid or missing source' };
  if (typeof r.source_id !== 'string' || !r.source_id.trim()) {
    return { ok: false, error: 'source_id required' };
  }
  if (typeof r.title !== 'string' || !r.title.trim()) return { ok: false, error: 'title required' };
  if (typeof r.official_url !== 'string' || !r.official_url.trim()) {
    return { ok: false, error: 'official_url required' };
  }
  if (typeof r.source_hash !== 'string' || !/^[a-f0-9]{64}$/i.test(r.source_hash)) {
    return { ok: false, error: 'source_hash must be sha256 hex' };
  }
  return {
    ok: true,
    record: {
      source: r.source,
      source_id: r.source_id.trim(),
      title: r.title.trim(),
      agency: typeof r.agency === 'string' ? r.agency : null,
      subagency: typeof r.subagency === 'string' ? r.subagency : null,
      instrument: typeof r.instrument === 'string' ? r.instrument : null,
      notice_type: typeof r.notice_type === 'string' ? r.notice_type : null,
      posted_at: typeof r.posted_at === 'string' ? r.posted_at : null,
      updated_at: typeof r.updated_at === 'string' ? r.updated_at : null,
      questions_due_at: typeof r.questions_due_at === 'string' ? r.questions_due_at : null,
      due_at: typeof r.due_at === 'string' ? r.due_at : null,
      timezone: typeof r.timezone === 'string' ? r.timezone : null,
      set_asides: Array.isArray(r.set_asides) ? r.set_asides.map(String) : [],
      naics: Array.isArray(r.naics) ? r.naics.map(String) : [],
      psc: Array.isArray(r.psc) ? r.psc.map(String) : [],
      official_url: r.official_url.trim(),
      source_hash: r.source_hash.toLowerCase(),
      normalized:
        r.normalized && typeof r.normalized === 'object'
          ? (r.normalized as Record<string, unknown>)
          : {},
    },
  };
}
