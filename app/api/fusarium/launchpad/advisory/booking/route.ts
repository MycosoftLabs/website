/**
 * Advisory booking. Session client lists credits/bookings (RLS).
 * Service client is used only to mark a credit redeemed after a booking row
 * exists — authenticated cannot UPDATE launchpad_advisory_credits by design.
 * Availability still comes from Cal.com; we never invent slots.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { bookingUrlForCredit, calcomStatus, minutesFromSku } from '@/lib/launchpad/advisory/calcom';
import { LINKS_BY_SURFACE } from '@/lib/launchpad/official-links';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { data: credits, error } = await gate.ctx.supabase
    .from('launchpad_advisory_credits')
    .select('id, sku, minutes, status, created_at, redeemed_at')
    .eq('tenant_id', gate.ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load advisory credits');
  const { data: bookings } = await gate.ctx.supabase
    .from('launchpad_advisory_bookings')
    .select('id, credit_id, sku, minutes, status, calcom_booking_id, scheduled_at, booking_url, created_at')
    .eq('tenant_id', gate.ctx.tenantId)
    .order('created_at', { ascending: false });
  const status = calcomStatus();
  return NextResponse.json({
    credits: credits ?? [],
    bookings: bookings ?? [],
    calcom: status,
    catalogLookupKeys: [
      'fus_launchpad_advisory_15',
      'fus_launchpad_advisory_30',
      'fus_launchpad_advisory_60',
      'fus_launchpad_advisory_90',
    ],
    officialLinks: LINKS_BY_SURFACE.advisory,
    note: status.configured
      ? 'Pay with Stripe, then schedule on Cal.com. Availability is Cal.com’s real calendar — Launchpad does not invent slots.'
      : status.blockingReason,
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const parsed = await readJson<{ creditId?: string }>(request);
  if (parsed.ok === false) return parsed.response;
  const creditId = typeof parsed.body.creditId === 'string' ? parsed.body.creditId : '';
  if (!creditId) return jsonError(400, 'credit_required', 'creditId required');

  const { data: credit } = await gate.ctx.supabase
    .from('launchpad_advisory_credits')
    .select('id, sku, minutes, status')
    .eq('tenant_id', gate.ctx.tenantId)
    .eq('id', creditId)
    .maybeSingle();
  if (!credit) return jsonError(404, 'credit_not_found', 'No such advisory credit');
  if (credit.status !== 'unredeemed') {
    return jsonError(409, 'credit_not_unredeemed', `Credit is ${credit.status}`);
  }
  const minutes = minutesFromSku(credit.sku) ?? (credit.minutes as 15 | 30 | 60 | 90);
  const url = bookingUrlForCredit({ minutes, tenantId: gate.ctx.tenantId, creditId: credit.id });
  if ('error' in url) {
    return jsonError(503, url.code, url.error, { calcom: calcomStatus() });
  }

  let svc;
  try {
    svc = createLaunchpadServiceClient();
  } catch {
    return jsonError(
      503,
      'service_unconfigured',
      'Cannot mint a booking without the service role (needed to mark the credit redeemed).',
    );
  }

  const { data: booking, error } = await gate.ctx.supabase
    .from('launchpad_advisory_bookings')
    .insert({
      tenant_id: gate.ctx.tenantId,
      credit_id: credit.id,
      sku: credit.sku,
      minutes,
      status: 'pending',
      booking_url: url.url,
    })
    .select('id')
    .single();
  if (error || !booking) return jsonError(500, 'booking_persist_failed', 'Could not record booking intent');

  await svc
    .from('launchpad_advisory_credits')
    .update({ status: 'redeemed', redeemed_at: new Date().toISOString(), booking_id: booking.id })
    .eq('tenant_id', gate.ctx.tenantId)
    .eq('id', credit.id)
    .eq('status', 'unredeemed');

  await appendAuditEvent(gate.ctx.supabase, gate.ctx.tenantId, gate.ctx.user.id, {
    action: 'advisory.booking.link_issued',
    entity: 'launchpad_advisory_bookings',
    entityId: booking.id,
    payload: { minutes },
  });

  return NextResponse.json({
    ok: true,
    bookingId: booking.id,
    bookingUrl: url.url,
    embedUrl: url.url,
    minutes,
    note: 'This URL is Cal.com’s real booking page. Do not scrape or fake availability.',
  });
}
