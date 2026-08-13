import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import {
  hashBytesSha256,
  mapProviderStatus,
  verifyConnectHmac,
} from '@/lib/launchpad/signatures/docusign';

export const dynamic = 'force-dynamic';

function extractEnvelopeId(raw: string, json: Record<string, unknown> | null): string | null {
  if (json) {
    const data = json.data as Record<string, unknown> | undefined;
    const summary = data?.envelopeSummary as Record<string, unknown> | undefined;
    const id =
      (typeof json.envelopeId === 'string' && json.envelopeId) ||
      (typeof data?.envelopeId === 'string' && data.envelopeId) ||
      (typeof summary?.envelopeId === 'string' && summary.envelopeId) ||
      null;
    if (id) return id;
  }
  const m = raw.match(/<EnvelopeID>([^<]+)<\/EnvelopeID>/i) || raw.match(/"envelopeId"\s*:\s*"([^"]+)"/);
  return m?.[1] ?? null;
}

function extractStatus(raw: string, json: Record<string, unknown> | null): string | null {
  if (json) {
    const data = json.data as Record<string, unknown> | undefined;
    const summary = (data?.envelopeSummary as Record<string, unknown> | undefined) ?? json;
    const s = summary.status ?? json.status;
    if (typeof s === 'string') return s;
  }
  const m = raw.match(/<Status>([^<]+)<\/Status>/i);
  return m?.[1] ?? null;
}

/** If Connect included PDF bytes, hash then drop. Never persist the file. */
function hashAndDropPdf(raw: string, json: Record<string, unknown> | null): string | null {
  if (json) {
    const data = json.data as Record<string, unknown> | undefined;
    const pdf =
      (typeof json.pdfBytes === 'string' && json.pdfBytes) ||
      (typeof data?.pdfBytes === 'string' && data.pdfBytes) ||
      null;
    if (pdf) {
      try {
        return hashBytesSha256(Buffer.from(pdf, 'base64'));
      } catch {
        return null;
      }
    }
  }
  const m = raw.match(/<PDFBytes>([^<]+)<\/PDFBytes>/);
  if (!m?.[1]) return null;
  try {
    return hashBytesSha256(Buffer.from(m[1], 'base64'));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const secretSet = Boolean(
    (process.env.DOCUSIGN_CONNECT_HMAC_KEY ?? '').trim() || (process.env.DOCUSIGN_CONNECT_SECRET ?? '').trim(),
  );
  if (!secretSet) {
    return NextResponse.json({ error: 'webhook not configured', code: 'docusign_webhook_unconfigured' }, { status: 503 });
  }
  const raw = await request.text();
  const signature =
    request.headers.get('x-docusign-signature-1') ||
    request.headers.get('X-DocuSign-Signature-1') ||
    request.headers.get('x-authorization-digest');
  if (!verifyConnectHmac(raw, signature)) {
    return NextResponse.json({ error: 'invalid signature', code: 'invalid_signature' }, { status: 400 });
  }

  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    json = null;
  }

  const envelopeId = extractEnvelopeId(raw, json);
  if (!envelopeId) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'no envelope id' });
  }

  const payloadHash = createHash('sha256').update(raw).digest('hex');
  const eventId =
    (typeof json?.eventId === 'string' && json.eventId) ||
    `${envelopeId}:${payloadHash.slice(0, 16)}`;

  const svc = createLaunchpadServiceClient();
  const { data: inserted } = await svc
    .from('launchpad_signature_webhook_events')
    .upsert(
      { provider_event_id: eventId, provider: 'docusign', type: typeof json?.event === 'string' ? json.event : 'connect', payload_hash: payloadHash },
      { onConflict: 'provider_event_id', ignoreDuplicates: true },
    )
    .select('provider_event_id');
  if (!inserted || inserted.length === 0) {
    return NextResponse.json({ ok: true, replay: true });
  }

  const sha = hashAndDropPdf(raw, json);
  const status = mapProviderStatus(extractStatus(raw, json));
  const { data: row } = await svc
    .from('launchpad_signature_envelopes')
    .select('id, tenant_id, status')
    .eq('provider_envelope_id', envelopeId)
    .maybeSingle();

  if (!row) {
    await svc
      .from('launchpad_signature_webhook_events')
      .update({ outcome: { handled: false, reason: 'unknown envelope' } })
      .eq('provider_event_id', eventId);
    return NextResponse.json({ ok: true, handled: false, reason: 'unknown envelope' });
  }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'completed') {
    patch.completed_at = new Date().toISOString();
    if (sha) patch.completed_doc_sha256 = sha;
    patch.provider_cert_ref = `docusign:${envelopeId}:certificate-of-completion`;
  }
  await svc.from('launchpad_signature_envelopes').update(patch).eq('tenant_id', row.tenant_id).eq('id', row.id);

  if (sha) {
    await svc.from('launchpad_evidence_index').insert({
      tenant_id: row.tenant_id,
      title: `Signed envelope ${envelopeId}`,
      control_ids: [],
      evidence_type: 'other',
      authoritative_system: 'docusign',
      authoritative_ref: envelopeId,
      sha256: sha,
      review_status: 'unreviewed',
      cui_indicator: 'no',
      notes: 'Hash only. Signed PDF was not stored in Launchpad.',
    });
  }

  await appendAuditEvent(svc, row.tenant_id, null, {
    action: `signature.envelope.${status}`,
    entity: 'launchpad_signature_envelopes',
    entityId: row.id,
    actorType: 'service',
    payload: { providerEnvelopeId: envelopeId, hashed: Boolean(sha) },
  });

  await svc
    .from('launchpad_signature_webhook_events')
    .update({
      tenant_id: row.tenant_id,
      envelope_id: row.id,
      outcome: { handled: true, status, hashed: Boolean(sha) },
    })
    .eq('provider_event_id', eventId);

  return NextResponse.json({ ok: true, status, hashed: Boolean(sha) });
}
