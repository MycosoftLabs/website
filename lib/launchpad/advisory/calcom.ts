/**
 * Cal.com advisory booking — real availability only.
 *
 * Payment stays in Stripe (fus_launchpad_advisory_*). Cal.com is the calendar.
 * If env is missing, routes return 503 calcom_unconfigured — never fake slots.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { getProduct } from '@/lib/launchpad/catalog';

export type AdvisoryMinutes = 15 | 30 | 60 | 90;

export interface CalcomStatus {
  apiKeySet: boolean;
  webhookSecretSet: boolean;
  bookingBaseSet: boolean;
  eventTypes: Record<AdvisoryMinutes, string | null>;
  configured: boolean;
  blockingReason: string | null;
}

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

const MINUTES: AdvisoryMinutes[] = [15, 30, 60, 90];

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
  };
}

/**
 * Single-use-ish booking URL. Cal.com hashed private links require their API;
 * we attach tenant + credit as query metadata so BOOKING_CREATED can redeem.
 */
export function bookingUrlForCredit(input: {
  minutes: AdvisoryMinutes;
  tenantId: string;
  creditId: string;
}): { url: string } | { error: string; code: 'calcom_unconfigured' } {
  const status = calcomStatus();
  const event = status.eventTypes[input.minutes];
  if (!status.configured || !event) {
    return { error: status.blockingReason || 'Cal.com event type missing for this duration', code: 'calcom_unconfigured' };
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

export function extractCalcomMetadata(payload: Record<string, unknown>): {
  tenantId: string | null;
  creditId: string | null;
  bookingId: string | null;
  startTime: string | null;
} {
  const meta =
    (payload.metadata as Record<string, unknown> | undefined) ??
    ((payload.payload as Record<string, unknown> | undefined)?.metadata as Record<string, unknown> | undefined) ??
    {};
  const inner = (payload.payload as Record<string, unknown> | undefined) ?? payload;
  const tenantId =
    (typeof meta.lp_tenant_id === 'string' && meta.lp_tenant_id) ||
    (typeof meta.tenantId === 'string' && meta.tenantId) ||
    null;
  const creditId =
    (typeof meta.lp_credit_id === 'string' && meta.lp_credit_id) ||
    (typeof meta.creditId === 'string' && meta.creditId) ||
    null;
  const bookingId =
    (typeof inner.uid === 'string' && inner.uid) ||
    (typeof inner.id === 'string' && inner.id) ||
    (typeof inner.bookingId === 'string' && inner.bookingId) ||
    null;
  const startTime =
    (typeof inner.startTime === 'string' && inner.startTime) ||
    (typeof inner.start === 'string' && inner.start) ||
    null;
  return { tenantId, creditId, bookingId, startTime };
}
