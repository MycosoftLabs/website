// ═══════════════════════════════════════════════════════════════════════════
// OperationalState<T> — the honest-SOC provenance envelope
// ═══════════════════════════════════════════════════════════════════════════
//
// Every operational datum shown on a SOC surface (/security, /security/network,
// /security/incidents, /security/redteam) must carry where it came from, when it
// was collected, and whether it can be trusted right now. A bare number with no
// provenance is exactly what let the old dashboard render a green zero on a
// failed fetch. This envelope makes that impossible: the UI decides what to draw
// from `state`, and `state` is never inferred from an empty array.
//
// Source of truth is MAS 188 / MINDEX 189. The website is UI/BFF only — it may
// wrap MAS responses in this envelope but must never fabricate `data`.

export type SocState =
  | 'healthy'      // fresh, verified data from the source
  | 'degraded'     // source answered but flagged reduced confidence / partial
  | 'stale'        // last-known-good retained; collected_at is old
  | 'unknown'      // no verified snapshot yet (cold) — render em-dash, not zero
  | 'unavailable'; // source failed / unreachable / unauthorized — render error

export interface OperationalState<T> {
  state: SocState;
  /** Human-readable source system, e.g. "MAS /api/incidents". */
  source: string;
  /** ISO time the source produced this data, or null when unknown/unavailable. */
  collected_at: string | null;
  /** ISO time after which this data should be treated as stale, or null. */
  fresh_until: string | null;
  /** Correlation / request id from MAS for tracing, when provided. */
  correlation_id: string | null;
  /** The payload. null for unknown/unavailable — the UI must not read it then. */
  data: T | null;
  /** Why the state is degraded/stale/unavailable. Shown to the operator. */
  reason?: string;
}

/** A healthy snapshot with verified data. */
export function ok<T>(
  data: T,
  source: string,
  opts?: { collectedAt?: string | null; freshUntil?: string | null; correlationId?: string | null; degraded?: boolean; reason?: string },
): OperationalState<T> {
  return {
    state: opts?.degraded ? 'degraded' : 'healthy',
    source,
    collected_at: opts?.collectedAt ?? null,
    fresh_until: opts?.freshUntil ?? null,
    correlation_id: opts?.correlationId ?? null,
    data,
    reason: opts?.reason,
  };
}

/** No verified snapshot yet (cold start). Distinct from a failure. */
export function unknown<T>(source: string, reason?: string): OperationalState<T> {
  return { state: 'unknown', source, collected_at: null, fresh_until: null, correlation_id: null, data: null, reason };
}

/** Source failed, was unreachable, timed out, or rejected auth. Never a zero. */
export function unavailable<T>(source: string, reason?: string): OperationalState<T> {
  return { state: 'unavailable', source, collected_at: null, fresh_until: null, correlation_id: null, data: null, reason };
}

/** Retain last-known-good but mark it explicitly stale. */
export function stale<T>(data: T, source: string, collectedAt: string | null, reason?: string): OperationalState<T> {
  return { state: 'stale', source, collected_at: collectedAt, fresh_until: null, correlation_id: null, data, reason: reason ?? 'last known good' };
}

/**
 * Map a raw MAS fetch outcome to an envelope. Centralises the rule that a
 * non-2xx, a thrown fetch, or a null body is `unavailable` — never healthy-zero.
 * A `degraded` flag inside the body (MAS convention) downgrades to `degraded`.
 */
export function fromMas<T>(
  source: string,
  outcome: { ok: boolean; status: number; body: any },
  extract: (body: any) => T,
): OperationalState<T> {
  if (!outcome.ok || outcome.body == null) {
    const reason =
      outcome.status === 401 || outcome.status === 403
        ? `authorization rejected (${outcome.status})`
        : outcome.status === 0
          ? 'unreachable / timed out'
          : `source returned ${outcome.status}`;
    return unavailable<T>(source, reason);
  }
  const b = outcome.body;
  const collectedAt: string | null = b.collected_at ?? b.timestamp ?? b.generated_at ?? b.last_entry_at ?? null;
  const correlationId: string | null = b.correlation_id ?? b.request_id ?? null;
  const degraded: boolean = b.degraded === true || b.ok === false;
  const reason: string | undefined = degraded ? (b.reason ?? b.integrity_reason ?? 'source reported degraded') : undefined;
  let data: T;
  try {
    data = extract(b);
  } catch {
    return unavailable<T>(source, 'unexpected response shape');
  }
  return ok<T>(data, source, { collectedAt, correlationId, degraded, reason });
}

/** True when the envelope carries usable data (healthy/degraded/stale). */
export function hasData<T>(s: OperationalState<T> | null | undefined): s is OperationalState<T> & { data: T } {
  return !!s && (s.state === 'healthy' || s.state === 'degraded' || s.state === 'stale') && s.data != null;
}
