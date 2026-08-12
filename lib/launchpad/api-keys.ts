/**
 * FUSARIUM Launchpad — tenant API key mint / verify.
 *
 * Keys are Bearer tokens: `lp_…`. Plaintext is shown once; only SHA-256 hex
 * is stored in launchpad_api_keys. Platform break-glass env tokens remain
 * supported but deprecated (see TENANT_API_KEYS_AND_SECRETS_AUG12_2026.md).
 */

import { createHash, timingSafeEqual, randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export type ApiKeyScope = 'ingest' | 'agent' | 'read' | 'admin';

export const API_KEY_SCOPES: readonly ApiKeyScope[] = [
  'ingest',
  'agent',
  'read',
  'admin',
] as const;

export interface ApiKeyMeta {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdBy: string | null;
}

export interface VerifiedApiKey {
  id: string;
  tenantId: string;
  scopes: ApiKeyScope[];
  keyPrefix: string;
  source: 'database';
}

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export function mintApiKeyPlaintext(): { plaintext: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  const plaintext = `lp_${raw}`;
  const prefix = plaintext.slice(0, 12);
  return { plaintext, prefix, hash: hashApiKey(plaintext) };
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function safeEqualUtf8(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Parse Authorization: Bearer … header value (full header or token only). */
export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  if (!m) return null;
  const token = m[1].trim();
  return token.length > 0 ? token : null;
}

export function isLaunchpadApiKeyFormat(token: string): boolean {
  return token.startsWith('lp_') && token.length >= 20;
}

export function parseScopes(raw: unknown): ApiKeyScope[] {
  if (!Array.isArray(raw)) return [];
  const out: ApiKeyScope[] = [];
  for (const s of raw) {
    if (typeof s === 'string' && (API_KEY_SCOPES as readonly string[]).includes(s)) {
      out.push(s as ApiKeyScope);
    }
  }
  return out;
}

/**
 * Resolve a Bearer token against launchpad_api_keys (service role required).
 * Updates last_used_at on success (best-effort).
 */
export async function verifyTenantApiKey(
  svc: SupabaseClient,
  plaintext: string,
  requiredScope: ApiKeyScope,
): Promise<VerifiedApiKey | null> {
  if (!isLaunchpadApiKeyFormat(plaintext)) return null;
  const keyHash = hashApiKey(plaintext);

  const { data, error } = await svc
    .from('launchpad_api_keys')
    .select('id, tenant_id, key_prefix, scopes, key_hash, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (!safeEqualHex(String(data.key_hash), keyHash)) return null;

  const scopes = parseScopes(data.scopes);
  if (!scopes.includes(requiredScope) && !scopes.includes('admin')) {
    return null;
  }

  // Best-effort last_used touch — never fail auth on this.
  void svc
    .from('launchpad_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    id: data.id as string,
    tenantId: data.tenant_id as string,
    scopes,
    keyPrefix: data.key_prefix as string,
    source: 'database',
  };
}

/**
 * Ingest auth: DB key with scope=ingest (preferred) OR deprecated
 * LAUNCHPAD_INGEST_TOKEN break-glass.
 */
export async function authorizeIngestBearer(
  svc: SupabaseClient | null,
  authorizationHeader: string | null,
  env: NodeJS.ProcessEnv = process.env,
): Promise<
  | { ok: true; mode: 'api_key'; key: VerifiedApiKey }
  | { ok: true; mode: 'break_glass' }
  | { ok: false; status: 401 | 503; error: string; code: string }
> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    return { ok: false, status: 401, error: 'unauthorized', code: 'missing_bearer' };
  }

  if (isLaunchpadApiKeyFormat(token)) {
    if (!svc) {
      return {
        ok: false,
        status: 503,
        error: 'service role not configured',
        code: 'service_role_missing',
      };
    }
    const key = await verifyTenantApiKey(svc, token, 'ingest');
    if (!key) {
      return { ok: false, status: 401, error: 'unauthorized', code: 'invalid_api_key' };
    }
    return { ok: true, mode: 'api_key', key };
  }

  const breakGlass = env.LAUNCHPAD_INGEST_TOKEN?.trim() ?? '';
  if (breakGlass && safeEqualUtf8(token, breakGlass)) {
    return { ok: true, mode: 'break_glass' };
  }

  return { ok: false, status: 401, error: 'unauthorized', code: 'invalid_bearer' };
}

/**
 * Agent results auth via Bearer lp_ key (scope agent|admin).
 * Caller must still confirm agent.tenant_id === key.tenantId.
 */
export async function authorizeAgentBearer(
  svc: SupabaseClient,
  authorizationHeader: string | null,
): Promise<VerifiedApiKey | null> {
  const token = extractBearerToken(authorizationHeader);
  if (!token || !isLaunchpadApiKeyFormat(token)) return null;
  return verifyTenantApiKey(svc, token, 'agent');
}

/** Create key via session RPC (preferred for UI). Returns plaintext once. */
export async function createApiKeyViaRpc(
  sessionClient: SupabaseClient,
  tenantId: string,
  name: string,
  scopes: ApiKeyScope[],
): Promise<
  | { ok: true; id: string; keyPrefix: string; scopes: ApiKeyScope[]; plaintextKey: string; createdAt: string }
  | { ok: false; error: string }
> {
  const { data, error } = await sessionClient.rpc('launchpad_create_api_key', {
    p_tenant_id: tenantId,
    p_name: name,
    p_scopes: scopes,
  });
  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return { ok: false, error: 'empty rpc result' };
  const r = row as Record<string, unknown>;
  return {
    ok: true,
    id: String(r.id),
    keyPrefix: String(r.key_prefix),
    scopes: parseScopes(r.scopes),
    plaintextKey: String(r.plaintext_key),
    createdAt: String(r.created_at),
  };
}

/** Service-role mint (CLI / bootstrap when RPC session unavailable). */
export async function createApiKeyServiceRole(
  svc: SupabaseClient,
  opts: {
    tenantId: string;
    name: string;
    scopes: ApiKeyScope[];
    createdBy?: string | null;
  },
): Promise<
  | { ok: true; id: string; keyPrefix: string; scopes: ApiKeyScope[]; plaintextKey: string; createdAt: string }
  | { ok: false; error: string }
> {
  const { plaintext, prefix, hash } = mintApiKeyPlaintext();
  const { data, error } = await svc
    .from('launchpad_api_keys')
    .insert({
      tenant_id: opts.tenantId,
      name: opts.name.trim(),
      key_prefix: prefix,
      key_hash: hash,
      scopes: opts.scopes,
      created_by: opts.createdBy ?? null,
    })
    .select('id, key_prefix, scopes, created_at')
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? 'insert failed' };

  // Chain fields (seq/prev_hash/hash) are set by launchpad_audit_chain trigger.
  // Best-effort — never fail key mint if audit insert is blocked.
  const { error: auditError } = await svc.from('launchpad_audit_events').insert({
    tenant_id: opts.tenantId,
    actor_user_id: opts.createdBy ?? null,
    actor_type: opts.createdBy ? 'user' : 'service',
    action: 'api_key.created',
    entity: 'launchpad_api_keys',
    entity_id: data.id,
    payload_hash: hashApiKey(JSON.stringify({ name: opts.name, scopes: opts.scopes, prefix })),
  });
  if (auditError) {
    console.warn('[launchpad/api-keys] audit insert failed after key create:', auditError.message);
  }

  return {
    ok: true,
    id: data.id as string,
    keyPrefix: data.key_prefix as string,
    scopes: parseScopes(data.scopes),
    plaintextKey: plaintext,
    createdAt: data.created_at as string,
  };
}

export async function revokeApiKeyViaRpc(
  sessionClient: SupabaseClient,
  keyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await sessionClient.rpc('launchpad_revoke_api_key', { p_key_id: keyId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listApiKeysMeta(
  sessionClient: SupabaseClient,
  tenantId: string,
): Promise<{ ok: true; keys: ApiKeyMeta[] } | { ok: false; error: string }> {
  const { data, error } = await sessionClient
    .from('launchpad_api_keys')
    .select('id, tenant_id, name, key_prefix, scopes, created_by, created_at, revoked_at, last_used_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return { ok: false, error: error.message };
  const keys: ApiKeyMeta[] = (data ?? []).map((row) => ({
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    keyPrefix: row.key_prefix as string,
    scopes: parseScopes(row.scopes),
    createdAt: row.created_at as string,
    revokedAt: (row.revoked_at as string | null) ?? null,
    lastUsedAt: (row.last_used_at as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
  }));
  return { ok: true, keys };
}

/** Map SECURITY DEFINER RPC failures to BFF JSON + status. */
export function mapApiKeyRpcError(message: string, op: 'create' | 'revoke' | 'list') {
  const lower = message.toLowerCase();
  if (lower.includes('insufficient_role')) {
    return NextResponse.json(
      { error: 'Requires owner or admin', code: 'insufficient_role' },
      { status: 403 },
    );
  }
  if (lower.includes('key not found') || lower.includes('not found')) {
    return NextResponse.json({ error: 'Key not found', code: 'key_not_found' }, { status: 404 });
  }
  if (lower.includes('authentication required')) {
    return NextResponse.json({ error: 'Authentication required', code: 'auth_required' }, { status: 401 });
  }
  if (
    lower.includes('invalid scope') ||
    lower.includes('scopes required') ||
    lower.includes('name required')
  ) {
    return NextResponse.json({ error: message, code: 'validation_error' }, { status: 400 });
  }
  return NextResponse.json(
    {
      error: message,
      code: op === 'create' ? 'create_failed' : op === 'revoke' ? 'revoke_failed' : 'list_failed',
      hint: 'Ensure migration 20260812120000_launchpad_api_keys.sql (RPCs) is applied.',
    },
    { status: 500 },
  );
}
