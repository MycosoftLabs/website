import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { envelopeEncrypt, EnvelopeConfigError, kmsBackendStatus } from '@/lib/launchpad/crypto/envelope';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { listPublicConnections } from '@/lib/launchpad/ai/router';
import { AI_PROVIDERS, isAiProvider, isInferenceProvider } from '@/lib/launchpad/ai/types';
import { verifyProviderKey } from '@/lib/launchpad/ai/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const listed = await listPublicConnections(ctx.supabase, ctx.tenantId);
  const kms = kmsBackendStatus();
  return NextResponse.json({
    connections: listed.ok ? listed.connections : [],
    providers: AI_PROVIDERS,
    byoAvailableOnEveryTier: true,
    kms,
    note: 'Provider secrets are never returned. Cursor is MCP-only (no inference key). Managed AI consumes credits; BYO charges 0 credits.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const parsed = await readJson<{ provider?: string; apiKey?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const provider = typeof parsed.body.provider === 'string' ? parsed.body.provider : '';
  if (!isAiProvider(provider)) {
    return jsonError(400, 'validation_error', 'provider must be anthropic|openai|perplexity|xai|cursor', {
      allowed: AI_PROVIDERS,
    });
  }

  if (provider === 'cursor') {
    const { data, error } = await ctx.supabase
      .from('launchpad_ai_connections')
      .upsert(
        {
          tenant_id: ctx.tenantId,
          provider: 'cursor',
          mode: 'mcp',
          status: 'verified',
          display_prefix: 'mcp',
          last_verified_at: new Date().toISOString(),
          created_by: ctx.user.id,
          revoked_at: null,
        },
        { onConflict: 'tenant_id,provider,mode' },
      )
      .select('id')
      .single();
    if (error || !data) return jsonError(500, 'create_failed', 'Could not record Cursor MCP connector');
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'ai.connection.cursor_mcp',
      entity: 'launchpad_ai_connections',
      entityId: data.id,
    });
    return NextResponse.json({
      ok: true,
      id: data.id,
      mode: 'mcp',
      note: 'Cursor has no public inference API here. Attach Launchpad tools in Cursor via a tenant API key (scope read).',
    });
  }

  const apiKey = typeof parsed.body.apiKey === 'string' ? parsed.body.apiKey.trim() : '';
  if (!apiKey) return jsonError(400, 'api_key_required', 'apiKey required for BYO inference providers');

  const verified = await verifyProviderKey(provider, apiKey);
  if (!verified.ok) {
    return jsonError(400, 'verify_failed', verified.message);
  }

  let envelope;
  try {
    envelope = envelopeEncrypt(apiKey);
  } catch (err) {
    if (err instanceof EnvelopeConfigError) {
      return jsonError(503, 'kms_unconfigured', err.message, { kms: kmsBackendStatus() });
    }
    return jsonError(500, 'encrypt_failed', 'Could not envelope-encrypt the provider key');
  }

  const displayPrefix = apiKey.slice(0, 6);
  const svc = createLaunchpadServiceClient();
  const { data, error } = await svc
    .from('launchpad_ai_connections')
    .upsert(
      {
        tenant_id: ctx.tenantId,
        provider,
        mode: 'byo',
        status: 'verified',
        display_prefix: displayPrefix,
        last_verified_at: new Date().toISOString(),
        ciphertext: envelope.ciphertext,
        nonce: envelope.nonce,
        tag: envelope.tag,
        wrapped_dek: envelope.wrappedDek,
        wrap_nonce: envelope.wrapNonce,
        wrap_tag: envelope.wrapTag,
        dek_id: envelope.dekId,
        alg: envelope.alg,
        kms_backend: envelope.kmsBackend,
        created_by: ctx.user.id,
        revoked_at: null,
      },
      { onConflict: 'tenant_id,provider,mode' },
    )
    .eq('tenant_id', ctx.tenantId)
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not store encrypted connection');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'ai.connection.verified',
    entity: 'launchpad_ai_connections',
    entityId: data.id,
    payload: { provider, kmsBackend: envelope.kmsBackend },
  });

  return NextResponse.json({
    ok: true,
    id: data.id,
    provider,
    mode: 'byo',
    displayPrefix,
    kmsBackend: envelope.kmsBackend,
    note: isInferenceProvider(provider)
      ? 'Key stored encrypted. It will never be returned. BYO calls charge 0 credits.'
      : undefined,
  });
}

export async function DELETE(request: NextRequest) {
  const gate = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return jsonError(400, 'id_required', 'id required');
  const svc = createLaunchpadServiceClient();
  const { error } = await svc
    .from('launchpad_ai_connections')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      ciphertext: null,
      nonce: null,
      tag: null,
      wrapped_dek: null,
      wrap_nonce: null,
      wrap_tag: null,
      dek_id: null,
    })
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);
  if (error) return jsonError(500, 'revoke_failed', 'Could not revoke connection');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'ai.connection.revoked',
    entity: 'launchpad_ai_connections',
    entityId: id,
  });
  return NextResponse.json({ ok: true, revoked: true });
}
