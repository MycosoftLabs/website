import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { resendEnvelope, voidEnvelope } from '@/lib/launchpad/signatures/docusign';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { id } = await context.params;
  const { data, error } = await gate.ctx.supabase
    .from('launchpad_signature_envelopes')
    .select(
      'id, document_id, provider, provider_envelope_id, status, signers, sent_at, completed_at, completed_doc_sha256, completed_doc_uri, provider_cert_ref, reminder_at, created_at',
    )
    .eq('tenant_id', gate.ctx.tenantId)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return jsonError(404, 'not_found', 'Envelope not found');
  return NextResponse.json({ envelope: data });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireTenant({ write: true, roles: ['owner', 'admin'] });
  if (gate.error) return gate.error;
  const { id } = await context.params;
  const parsed = await readJson<{ action?: string; reason?: string }>(request);
  if (parsed.ok === false) return parsed.response;
  if (parsed.body.action !== 'void') {
    return jsonError(400, 'validation_error', 'Only action=void is supported on PATCH');
  }
  const { data } = await gate.ctx.supabase
    .from('launchpad_signature_envelopes')
    .select('id, provider_envelope_id, status')
    .eq('tenant_id', gate.ctx.tenantId)
    .eq('id', id)
    .maybeSingle();
  if (!data?.provider_envelope_id) return jsonError(404, 'not_found', 'Envelope not found');
  if (['completed', 'voided', 'declined'].includes(data.status)) {
    return jsonError(409, 'immutable_status', `Cannot void a ${data.status} envelope`);
  }
  const reason = typeof parsed.body.reason === 'string' ? parsed.body.reason.trim() : 'Voided by workspace admin';
  try {
    await voidEnvelope(gate.ctx.tenantId, data.provider_envelope_id, reason);
  } catch (err) {
    return jsonError(502, 'docusign_void_failed', (err as Error).message);
  }
  const svc = createLaunchpadServiceClient();
  await svc
    .from('launchpad_signature_envelopes')
    .update({
      status: 'voided',
      void_reason: reason.slice(0, 200),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', gate.ctx.tenantId)
    .eq('id', id);
  await appendAuditEvent(gate.ctx.supabase, gate.ctx.tenantId, gate.ctx.user.id, {
    action: 'signature.envelope.voided',
    entity: 'launchpad_signature_envelopes',
    entityId: id,
  });
  return NextResponse.json({ ok: true, id, status: 'voided' });
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireTenant({ write: true, roles: ['owner', 'admin'] });
  if (gate.error) return gate.error;
  const { id } = await context.params;
  const { data } = await gate.ctx.supabase
    .from('launchpad_signature_envelopes')
    .select('id, provider_envelope_id, status')
    .eq('tenant_id', gate.ctx.tenantId)
    .eq('id', id)
    .maybeSingle();
  if (!data?.provider_envelope_id) return jsonError(404, 'not_found', 'Envelope not found');
  try {
    await resendEnvelope(gate.ctx.tenantId, data.provider_envelope_id);
  } catch (err) {
    return jsonError(502, 'docusign_remind_failed', (err as Error).message);
  }
  const svc = createLaunchpadServiceClient();
  await svc
    .from('launchpad_signature_envelopes')
    .update({ reminder_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('tenant_id', gate.ctx.tenantId)
    .eq('id', id);
  await appendAuditEvent(gate.ctx.supabase, gate.ctx.tenantId, gate.ctx.user.id, {
    action: 'signature.envelope.reminded',
    entity: 'launchpad_signature_envelopes',
    entityId: id,
  });
  return NextResponse.json({ ok: true, id, reminded: true });
}
