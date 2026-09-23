/**
 * Cal.com advisory booking — real availability only.
 *
 * Payment stays in Stripe (fus_launchpad_advisory_*). Cal.com is the calendar
 * (Google Calendar is connected on Cal.com’s side). If env is missing, routes
 * return 503 calcom_unconfigured — never fake slots.
 *
 * Env (gitignored): CALCOM_API_KEY, CALCOM_WEBHOOK_SECRET,
 * CALCOM_BOOKING_BASE_URL, CALCOM_EVENT_TYPE_ADVISORY_{15,30,60,90}.
 *
 * Public webhook receiver (paste in Cal.com → Developer → Webhooks):
 *   {NEXT_PUBLIC_SITE_URL}/api/fusarium/launchpad/advisory/webhook
 * Production: https://mycosoft.com/api/fusarium/launchpad/advisory/webhook
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { getProduct } from '@/lib/launchpad/catalog';

export type AdvisoryMinutes = 15 | 30 | 60 | 90;

export const CALCOM_ADVISORY_WEBHOOK_PATH = '/api/fusarium/launchpad/advisory/webhook';

export interface CalcomStatus {
  apiKeySet: boolean;
  webhookSecretSet: boolean;
  bookingBaseSet: boolean;
  eventTypes: Record<AdvisoryMinutes, string | null>;
  configured: boolean;
  blockingReason: string | null;
  webhookPath: string;
}

export interface CalcomEventTypeSummary {
  id: number | string;
  slug: string;
  title: string;
  lengthInMinutes: number;
}

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

const MINUTES: AdvisoryMinutes[] = [15, 30, 60, 90];

const CAL_API_BASE = 'https://api.cal.com/v2';

export function minutesFromSku(sku: string): AdvisoryMinutes | null {
  const product = getProduct(sku);
  const m = product?.advisoryMinutes;
  if (m === 15 || m === 30 || m === 60 || m === 90) return m;
  return null;
}

export function calcomStatus(): CalcomStatus {
  const eventTypes = {
    15: env('CALCOM_EVENT_TYPE_ADVISORY_15') || null,
    30: env('CALCOM_EVENT_TYPE_ADVISORY_30') || null,
    60: env('CALCOM_EVENT_TYPE_ADVISORY_60') || null,
    90: env('CALCOM_EVENT_TYPE_ADVISORY_90') || null,
  } as Record<AdvisoryMinutes, string | null>;
  const apiKeySet = Boolean(env('CALCOM_API_KEY'));
  const webhookSecretSet = Boolean(env('CALCOM_WEBHOOK_SECRET'));
  const bookingBaseSet = Boolean(env('CALCOM_BOOKING_BASE_URL'));
  const anyType = MINUTES.some((m) => eventTypes[m]);
  const configured = (apiKeySet || bookingBaseSet) && anyType && webhookSecretSet;
  let blockingReason: string | null = null;
  if (!configured) {
    if (!webhookSecretSet) {
      blockingReason =
        'Set CALCOM_WEBHOOK_SECRET plus CALCOM_BOOKING_BASE_URL and CALCOM_EVENT_TYPE_ADVISORY_{15,30,60,90}. Paid bookings are not sold until redeem works.';
    } else {
      blockingReason =
        'Set CALCOM_BOOKING_BASE_URL (or CALCOM_API_KEY) and CALCOM_EVENT_TYPE_ADVISORY_{15,30,60,90}. Availability is not invented.';
    }
  }
  return {
    apiKeySet,
    webhookSecretSet,
    bookingBaseSet,
    eventTypes,
    configured,
    blockingReason,
    webhookPath: CALCOM_ADVISORY_WEBHOOK_PATH,
  };
}

async function calcomApiFetch(path: string, apiVersion = '2024-06-14'): Promise<Response> {
  const apiKey = env('CALCOM_API_KEY');
  if (!apiKey) throw new Error('CALCOM_API_KEY missing');
  return fetch(`${CAL_API_BASE}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'cal-api-version': apiVersion,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
}

/** Authenticated account profile (username for public booking URLs). */
export async function fetchCalcomMe(): Promise<{ username: string; id: number | string } | null> {
  if (!env('CALCOM_API_KEY')) return null;
  try {
    const res = await calcomApiFetch('/me', '2024-08-13');
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { username?: string; id?: number | string } };
    const username = json.data?.username;
    if (!username) return null;
    return { username, id: json.data?.id ?? '' };
  } catch {
    return null;
  }
}

/** Event types from HIS Cal.com account (Bearer API key). */
export async function fetchCalcomEventTypes(username?: string): Promise<CalcomEventTypeSummary[]> {
  if (!env('CALCOM_API_KEY')) return [];
  try {
    const me = username ? { username } : await fetchCalcomMe();
    const qs = me?.username ? `?username=${encodeURIComponent(me.username)}` : '';
    const res = await calcomApiFetch(`/event-types${qs}`, '2024-06-14');
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Array<Record<string, unknown>> };
    const rows = Array.isArray(json.data) ? json.data : [];
    return rows
      .map((row) => {
        const slug = typeof row.slug === 'string' ? row.slug : '';
        const title = typeof row.title === 'string' ? row.title : slug;
        const lengthInMinutes =
          typeof row.lengthInMinutes === 'number'
            ? row.lengthInMinutes
            : typeof row.length === 'number'
              ? row.length
              : 0;
        const id = (row.id as number | string) ?? slug;
        return { id, slug, title, lengthInMinutes };
      })
      .filter((e) => e.slug && e.lengthInMinutes > 0);
  } catch {
    return [];
  }
}

/**
 * Single-use-ish booking URL. Attaches tenant + credit as query metadata so
 * BOOKING_CREATED can redeem. Uses Morgan’s cal.com/{username}/{slug} links —
 * never invents availability.
 */
export function bookingUrlForCredit(input: {
  minutes: AdvisoryMinutes;
  tenantId: string;
  creditId: string;
}): { url: string } | { error: string; code: 'calcom_unconfigured' } {
  const status = calcomStatus();
  const event = status.eventTypes[input.minutes];
  if (!status.configured || !event) {
    return {
      error: status.blockingReason || 'Cal.com event type missing for this duration',
      code: 'calcom_unconfigured',
    };
  }
  const base = env('CALCOM_BOOKING_BASE_URL').replace(/\/$/, '');
  const params = new URLSearchParams({
    'metadata[lp_tenant_id]': input.tenantId,
    'metadata[lp_credit_id]': input.creditId,
    'metadata[lp_minutes]': String(input.minutes),
  });
  if (base) {
    const path = event.startsWith('http') ? event : `${base}/${event.replace(/^\//, '')}`;
    return { url: `${path}?${params.toString()}` };
  }
  if (event.startsWith('http')) return { url: `${event}?${params.toString()}` };
  return {
    error: 'CALCOM_BOOKING_BASE_URL is required when event types are slugs, not absolute URLs.',
    code: 'calcom_unconfigured',
  };
}

/** Cal.com webhook HMAC (X-Cal-Signature-256). */
export function verifyCalcomWebhook(rawBody: string, signatureHeader: string | null): boolean {
  const secret = env('CALCOM_WEBHOOK_SECRET');
  if (!secret || !signatureHeader) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const given = signatureHeader.replace(/^sha256=/i, '').trim();
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(given, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function pickMetaString(meta: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = meta[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export function extractCalcomMetadata(payload: Record<string, unknown>): {
  tenantId: string | null;
  creditId: string | null;
  bookingId: string | null;
  startTime: string | null;
} {
  const inner = (payload.payload as Record<string, unknown> | undefined) ?? payload;
  const meta =
    (payload.metadata as Record<string, unknown> | undefined) ??
    (inner.metadata as Record<string, unknown> | undefined) ??
    {};
  const tenantId = pickMetaString(meta, 'lp_tenant_id', 'tenantId', 'lpTenantId');
  const creditId = pickMetaString(meta, 'lp_credit_id', 'creditId', 'lpCreditId');
  const bookingId =
    (typeof inner.uid === 'string' && inner.uid) ||
    (typeof inner.bookingUid === 'string' && inner.bookingUid) ||
    (typeof inner.id === 'string' && inner.id) ||
    (typeof inner.bookingId === 'string' && inner.bookingId) ||
    (typeof payload.uid === 'string' && payload.uid) ||
    null;
  const startTime =
    (typeof inner.startTime === 'string' && inner.startTime) ||
    (typeof inner.start === 'string' && inner.start) ||
    (typeof payload.startTime === 'string' && payload.startTime) ||
    null;
  return { tenantId, creditId, bookingId, startTime };
}
