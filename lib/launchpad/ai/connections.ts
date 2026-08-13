/**
 * BYO AI connection custody (service-role writes only).
 *
 * Authenticated clients cannot SELECT or UPDATE key_ciphertext / key_dek_wrapped.
 * Plaintext is accepted once on POST, envelope-encrypted in-process, then discarded.
 * Never log, never return, never put in Stripe metadata or audit payloads.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import {
  EnvelopeConfigError,
  envelopeEncrypt,
  envelopeToByteaHex,
  kmsBackendStatus,
  masterKeyId,
} from '@/lib/launchpad/crypto/envelope';
import type { AiProvider } from './types';
import { isInferenceProvider } from './types';

export function keyLast4(plaintext: string): string {
  const alnum = plaintext.replace(/[^A-Za-z0-9]/g, '');
  return (alnum.slice(-4) || '****').toLowerCase();
}

export function custodyReady(): boolean {
  const status = kmsBackendStatus();
  return status.backend === 'env_master' && status.envMasterConfigured && !status.awsKmsArnSet;
}

export async function storeByoConnection(input: {
  tenantId: string;
  provider: AiProvider;
  apiKey: string;
  label?: string | null;
}): Promise<
  | { ok: true; id: string; displayPrefix: string; masterKeyId: string; kmsBackend: 'env_master' }
  | { ok: false; code: 'kms_unconfigured' | 'cursor_mcp_only' | 'store_failed'; error: string }
> {
  if (!isInferenceProvider(input.provider)) {
    return {
      ok: false,
      code: 'cursor_mcp_only',
      error: 'Cursor is MCP-only. Mint a Launchpad API key under Settings → API keys.',
    };
  }
  if (!custodyReady()) {
    return {
      ok: false,
      code: 'kms_unconfigured',
      error: kmsBackendStatus().note,
    };
  }

  let blob;
  try {
    blob = envelopeEncrypt(input.apiKey);
  } catch (err) {
    const message = err instanceof EnvelopeConfigError ? err.message : kmsBackendStatus().note;
    return { ok: false, code: 'kms_unconfigured', error: message };
  }

  const last4 = keyLast4(input.apiKey);
  const { ciphertextHex, wrappedHex } = envelopeToByteaHex(blob);
  const svc = createLaunchpadServiceClient();
  const label =
    typeof input.label === 'string' && input.label.trim() ? input.label.trim().slice(0, 120) : null;

  const { data: existing } = await svc
    .from('launchpad_ai_connections')
    .select('id')
    .eq('tenant_id', input.tenantId)
    .eq('provider', input.provider)
    .eq('mode', 'byo')
    .maybeSingle();

  const row = {
    tenant_id: input.tenantId,
    provider: input.provider,
    mode: 'byo' as const,
    status: 'active',
    label,
    key_ciphertext: ciphertextHex,
    key_dek_wrapped: wrappedHex,
    key_kms_key_id: masterKeyId(),
    key_last4: last4,
    revoked_at: null,
    last_error: null,
  };

  if (existing?.id) {
    const { error } = await svc
      .from('launchpad_ai_connections')
      .update(row)
      .eq('tenant_id', input.tenantId)
      .eq('id', existing.id);
    if (error) return { ok: false, code: 'store_failed', error: 'Could not update BYO connection' };
    return {
      ok: true,
      id: existing.id as string,
      displayPrefix: `…${last4}`,
      masterKeyId: blob.masterKeyId,
      kmsBackend: 'env_master',
    };
  }

  const { data, error } = await svc.from('launchpad_ai_connections').insert(row).select('id').single();
  if (error || !data) return { ok: false, code: 'store_failed', error: 'Could not store BYO connection' };
  return {
    ok: true,
    id: data.id as string,
    displayPrefix: `…${last4}`,
    masterKeyId: blob.masterKeyId,
    kmsBackend: 'env_master',
  };
}

export async function storeMcpCursor(input: {
  tenantId: string;
  label?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const svc = createLaunchpadServiceClient();
  const label =
    typeof input.label === 'string' && input.label.trim() ? input.label.trim().slice(0, 120) : 'Cursor MCP';
  const { data: existing } = await svc
    .from('launchpad_ai_connections')
    .select('id, status')
    .eq('tenant_id', input.tenantId)
    .eq('provider', 'cursor')
    .eq('mode', 'mcp')
    .maybeSingle();
  if (existing?.id) {
    const { error } = await svc
      .from('launchpad_ai_connections')
      .update({ status: 'active', revoked_at: null, label })
      .eq('tenant_id', input.tenantId)
      .eq('id', existing.id);
    if (error) return { ok: false, error: 'Could not enable Cursor MCP' };
    return { ok: true, id: existing.id as string };
  }
  const { data, error } = await svc
    .from('launchpad_ai_connections')
    .insert({
      tenant_id: input.tenantId,
      provider: 'cursor',
      mode: 'mcp',
      status: 'active',
      label,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not enable Cursor MCP' };
  return { ok: true, id: data.id as string };
}

/** Zero ciphertext columns; session client cannot write them. */
export async function revokeConnectionCustody(input: {
  tenantId: string;
  id: string;
  session: SupabaseClient;
}): Promise<{ ok: true; provider: string; mode: string } | { ok: false; error: string }> {
  const { data, error } = await input.session
    .from('launchpad_ai_connections')
    .select('id, provider, mode')
    .eq('tenant_id', input.tenantId)
    .eq('id', input.id)
    .maybeSingle();
  if (error || !data) return { ok: false, error: 'Connection not found' };

  const svc = createLaunchpadServiceClient();
  const { error: wipeError } = await svc
    .from('launchpad_ai_connections')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      key_ciphertext: null,
      key_dek_wrapped: null,
      key_kms_key_id: null,
      key_last4: null,
      last_error: null,
    })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.id);
  if (wipeError) return { ok: false, error: 'Could not revoke connection' };
  return { ok: true, provider: data.provider as string, mode: data.mode as string };
}
