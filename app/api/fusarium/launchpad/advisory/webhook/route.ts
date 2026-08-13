import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { extractCalcomMetadata, verifyCalcomWebhook } from '@/lib/launchpad/advisory/calcom';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = (process.env.CALCOM_WEBHOOK_SECRET ?? '').trim();
  if (!secret) {
    return NextResponse.json({ error: 'webhook not configured', code: 'calcom_webhook_unconfigured' }, { status: 503 });
  }
  const raw = await request.text();
  const signature = request.headers.get('x-cal-signature-256') || request.headers.get('X-Cal-Signature-256');
  if (!verifyCalcomWebhook(raw, signature)) {
    return NextResponse.json({ error: 'invalid signature', code: 'invalid_signature' }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const trigger = String(payload.triggerEvent ?? payload.type ?? '');
  const eventId =
    (typeof payload.id === 'string' && payload.id) ||
    `${trigger}:${createHash('sha256').update(raw).digest('hex').slice(0, 24)}`;
  const payloadHash = createHash('sha256').update(raw).digest('hex');

  const svc = createLaunchpadServiceClient();
  const { data: inserted } = await svc
    .from('launchpad_calcom_webhook_events')
    .upsert(
      { provider_event_id: eventId, type: trigger || 'unknown', payload_hash: payloadHash },
      { onConflict: 'provider_event_id', ignoreDuplicates: true },
    )
    .select('provider_event_id');
  if (!inserted || inserted.length === 0) {
    return NextResponse.json({ ok: true, replay: true });
  }

  if (!/BOOKING_CREATED/i.test(trigger) && trigger !== 'BOOKING_CREATED') {
    await svc
      .from('launchpad_calcom_webhook_events')
      .update({ outcome: { handled: false, reason: `unhandled ${trigger}` } })
      .eq('provider_event_id', eventId);
    return NextResponse.json({ ok: true, handled: false, trigger });
  }

  const meta = extractCalcomMetadata(payload);
  if (!meta.tenantId || !meta.creditId) {
    await svc
      .from('launchpad_calcom_webhook_events')
      .update({ outcome: { handled: false, reason: 'missing tenant/credit metadata' } })
      .eq('provider_event_id', eventId);
    return NextResponse.json({ ok: true, handled: false, reason: 'missing metadata' });
  }

  await svc
    .from('launchpad_advisory_credits')
    .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
    .eq('tenant_id', meta.tenantId)
    .eq('id', meta.creditId);

  const { data: booking } = await svc
    .from('launchpad_advisory_bookings')
    .select('id')
    .eq('tenant_id', meta.tenantId)
    .eq('credit_id', meta.creditId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (booking?.id) {
    await svc
      .from('launchpad_advisory_bookings')
      .update({
        status: 'scheduled',
        calcom_booking_id: meta.bookingId,
        scheduled_at: meta.startTime,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', meta.tenantId)
      .eq('id', booking.id);
  }

  await svc.from('launchpad_tasks').insert({
    tenant_id: meta.tenantId,
    title: 'Advisory session scheduled',
    detail: meta.startTime ? `Cal.com booking at ${meta.startTime}` : 'Cal.com BOOKING_CREATED',
    kind: 'advisory',
  });

  await appendAuditEvent(svc, meta.tenantId, null, {
    action: 'advisory.booking.created',
    entity: 'launchpad_advisory_bookings',
    entityId: booking?.id,
    actorType: 'service',
  });

  await svc
    .from('launchpad_calcom_webhook_events')
    .update({ tenant_id: meta.tenantId, outcome: { handled: true } })
    .eq('provider_event_id', eventId);

  return NextResponse.json({ ok: true, handled: true });
}
