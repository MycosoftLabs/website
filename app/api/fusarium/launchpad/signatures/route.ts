/**
 * Signature envelopes. Session client owns list/create under RLS.
 * The service client is used ONLY to decrypt the tenant's DocuSign OAuth
 * envelope (column grants hide ciphertext from authenticated). It is not a
 * session-bypass for writes of envelope metadata.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson, entitlementDenied } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import {
  AUTHORIZED_OFFICIAL_REPRESENTATIONS,
  createAndSendEnvelope,
  docusignConfigStatus,
  type DocuSignSigner,
} from '@/lib/launchpad/signatures/docusign';
import { LINKS_BY_SURFACE } from '@/lib/launchpad/official-links';

export const dynamic = 'force-dynamic';

interface AttestationBody {
  representationsAcknowledged?: boolean;
  attestationsChecked?: boolean;
  reauthenticatedAt?: string;
}

function parseSigners(raw: unknown): DocuSignSigner[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const signers: DocuSignSigner[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const row = raw[i] as Record<string, unknown>;
    const name = typeof row.name === 'string' ? row.name.trim().slice(0, 200) : '';
    const email = typeof row.email === 'string' ? row.email.trim().slice(0, 320) : '';
    const role = typeof row.role === 'string' ? row.role.trim().slice(0, 80) : 'Authorized Official';
    if (!name || !email || !email.includes('@')) return null;
    signers.push({
      name,
      email,
      role,
      routingOrder: typeof row.routingOrder === 'number' ? row.routingOrder : i + 1,
    });
  }
  return signers;
}

function attestationValid(att: AttestationBody | undefined): boolean {
  if (!att?.representationsAcknowledged || !att.attestationsChecked) return false;
  const at = att.reauthenticatedAt ? Date.parse(att.reauthenticatedAt) : NaN;
  if (!Number.isFinite(at)) return false;
  return Math.abs(Date.now() - at) <= 15 * 60 * 1000;
}

export async function GET(request: NextRequest) {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.documentFactory) {
    return entitlementDenied('documentFactory', derived.planKey, 'Document factory (and signatures) are not on this plan.');
  }
  const documentId = request.nextUrl.searchParams.get('documentId');
  let query = ctx.supabase
    .from('launchpad_signature_envelopes')
    .select(
      'id, document_id, provider, provider_envelope_id, status, signers, sent_at, completed_at, completed_doc_sha256, completed_doc_uri, provider_cert_ref, reminder_at, created_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (documentId) query = query.eq('document_id', documentId);
  const { data, error } = await query;
  if (error) return jsonError(500, 'load_failed', 'Could not load signature envelopes');
  const envelopes = data ?? [];
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const unsignedAging = envelopes.filter((e) => {
    if (!['sent', 'delivered'].includes(e.status)) return false;
    const sent = e.sent_at ? Date.parse(e.sent_at) : NaN;
    return Number.isFinite(sent) && sent < weekAgo;
  }).length;
  const { data: connection } = await ctx.supabase
    .from('launchpad_docusign_connections')
    .select('id, status, docusign_account_id, token_last4, expires_at')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  return NextResponse.json({
    envelopes,
    unsignedAging,
    connection: connection
      ? {
          connected: connection.status === 'active',
          accountIdLast4: connection.token_last4,
          expiresAt: connection.expires_at,
        }
      : { connected: false },
    docusign: docusignConfigStatus(),
    authorizedOfficialRepresentations: AUTHORIZED_OFFICIAL_REPRESENTATIONS,
    officialLinks: LINKS_BY_SURFACE.documents,
    note:
      envelopes.length === 0
        ? 'No envelopes yet. Generate a DRAFT, then send it for signature. Launchpad stores envelope metadata and hashes — never signed PDF bytes or signature images.'
        : 'Provider certificate is authoritative. Completed files stay in the customer system.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true, roles: ['owner', 'admin'] });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.documentFactory) {
    return entitlementDenied('documentFactory', derived.planKey, 'Document factory (and signatures) are not on this plan.');
  }
  const parsed = await readJson<{
    documentId?: string;
    signers?: unknown;
    authorizedOfficialAttestation?: AttestationBody;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  const documentId = typeof parsed.body.documentId === 'string' ? parsed.body.documentId : '';
  const signers = parseSigners(parsed.body.signers);
  if (!documentId || !signers) {
    return jsonError(400, 'validation_error', 'documentId and signers[{name,email,role?}] are required');
  }
  if (!attestationValid(parsed.body.authorizedOfficialAttestation)) {
    return jsonError(
      403,
      'authorized_official_gate',
      '§21.5 gate: acknowledge the representations, check the attestations, and re-authenticate within 15 minutes before sending.',
      { representations: AUTHORIZED_OFFICIAL_REPRESENTATIONS },
    );
  }

  const { data: doc, error: docErr } = await ctx.supabase
    .from('launchpad_generated_documents')
    .select('id, title, rendered_html, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', documentId)
    .maybeSingle();
  if (docErr || !doc?.rendered_html) {
    return jsonError(404, 'document_not_found', 'Generated document not found or has no HTML to send');
  }

  let sent;
  try {
    sent = await createAndSendEnvelope({
      tenantId: ctx.tenantId,
      title: doc.title,
      html: doc.rendered_html,
      signers,
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'docusign_oauth_required' || code === 'docusign_unconfigured') {
      return jsonError(503, code, (err as Error).message, { docusign: docusignConfigStatus() });
    }
    return jsonError(502, 'docusign_send_failed', (err as Error).message);
  }

  const { data: row, error } = await ctx.supabase
    .from('launchpad_signature_envelopes')
    .insert({
      tenant_id: ctx.tenantId,
      document_id: documentId,
      provider: 'docusign',
      provider_envelope_id: sent.providerEnvelopeId,
      status: sent.status,
      signers: signers.map((s) => ({ ...s, signed_at: null })),
      sent_at: new Date().toISOString(),
      authorized_official_attestation: {
        representationsAcknowledged: true,
        attestationsChecked: true,
        reauthenticatedAt: parsed.body.authorizedOfficialAttestation?.reauthenticatedAt,
        at: new Date().toISOString(),
      },
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !row) return jsonError(500, 'persist_failed', 'Envelope sent but could not persist metadata');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'signature.envelope.sent',
    entity: 'launchpad_signature_envelopes',
    entityId: row.id,
    payload: { documentId, providerEnvelopeId: sent.providerEnvelopeId, mode: sent.mode },
  });

  return NextResponse.json({
    ok: true,
    id: row.id,
    providerEnvelopeId: sent.providerEnvelopeId,
    status: sent.status,
    mode: sent.mode,
  });
}

/** Create reminder tasks for envelopes unsigned > 7 days. */
export async function PUT() {
  const gate = await requireTenant({ write: true, roles: ['owner', 'admin'] });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data } = await ctx.supabase
    .from('launchpad_signature_envelopes')
    .select('id, document_id, status, sent_at, reminder_at, signers')
    .eq('tenant_id', ctx.tenantId)
    .in('status', ['sent', 'delivered']);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const due = (data ?? []).filter((e) => {
    const sent = e.sent_at ? Date.parse(e.sent_at) : NaN;
    return Number.isFinite(sent) && sent < weekAgo && !e.reminder_at;
  });
  const svc = createLaunchpadServiceClient();
  let created = 0;
  for (const envRow of due) {
    const { data: task } = await ctx.supabase
      .from('launchpad_tasks')
      .insert({
        tenant_id: ctx.tenantId,
        title: 'Unsigned envelope older than 7 days',
        detail: `Envelope ${envRow.id} still ${envRow.status}`,
        kind: 'signature_reminder',
        created_by: ctx.user.id,
      })
      .select('id')
      .single();
    await svc
      .from('launchpad_signature_envelopes')
      .update({ reminder_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('tenant_id', ctx.tenantId)
      .eq('id', envRow.id);
    if (task) created += 1;
  }
  return NextResponse.json({ ok: true, tasksCreated: created });
}
