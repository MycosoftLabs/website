/**
 * DocuSign eSignature client for Launchpad (GTM §10.6).
 *
 * Launchpad MAY: create envelopes, identify signers, receive Connect webhooks,
 * record envelope id + role + completion time + final document hash.
 * Launchpad MUST NOT: apply a signature, hold a signature image, sign as an
 * official, store signed PDF bytes, or claim validity beyond DocuSign's record.
 *
 * Customer send path: OAuth authorization-code against the CUSTOMER account.
 * Platform JWT (Mycosoft DOCUSIGN_* env) is dogfood-only, gated by
 * LAUNCHPAD_DOCUSIGN_PLATFORM_SEND=1. Default off.
 *
 * Env names only — values live in gitignored .env.local.
 */

import { createHash, createHmac, createSign, timingSafeEqual } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { envelopeDecrypt, envelopeEncrypt, envelopeFromCustodyRow, envelopeToByteaHex } from '@/lib/launchpad/crypto/envelope';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';

export const SIGN_ANCHOR = '/sn1/';

export type EnvelopeStatus =
  | 'draft'
  | 'sent'
  | 'delivered'
  | 'completed'
  | 'declined'
  | 'voided'
  | 'expired';

export interface DocuSignSigner {
  name: string;
  email: string;
  role: string;
  routingOrder: number;
  signedAt?: string | null;
}

export interface DocuSignConfigStatus {
  oauthClientConfigured: boolean;
  jwtConfigured: boolean;
  jwtReady: boolean;
  rsaKeyPresent: boolean;
  connectHmacConfigured: boolean;
  platformSendEnabled: boolean;
  authServerHost: string;
  blockingReason: string | null;
}

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function docusignAuthServer(): string {
  return (env('DOCUSIGN_AUTH_SERVER') || 'https://account.docusign.com').replace(/\/$/, '');
}

export function docusignRedirectUri(): string {
  const explicit = env('DOCUSIGN_REDIRECT_URI');
  if (explicit) return explicit;
  const base = env('NEXT_PUBLIC_BASE_URL') || env('NEXT_PUBLIC_APP_URL') || 'http://localhost:3010';
  return `${base.replace(/\/$/, '')}/api/fusarium/launchpad/signatures/oauth/callback`;
}

function loadRsaPem(): string | null {
  const inline = env('DOCUSIGN_RSA_PRIVATE_KEY');
  if (inline) return inline.replace(/\\n/g, '\n');
  const path = env('DOCUSIGN_RSA_PRIVATE_KEY_PATH');
  if (path && existsSync(path)) return readFileSync(path, 'utf8');
  return null;
}

export function docusignConfigStatus(): DocuSignConfigStatus {
  const integrationKey = env('DOCUSIGN_INTEGRATION_KEY');
  const userId = env('DOCUSIGN_USER_ID');
  const accountId = env('DOCUSIGN_API_ACCOUNT_ID');
  const secret = env('DOCUSIGN_SECRET_KEY');
  const pem = loadRsaPem();
  const jwtConfigured = Boolean(integrationKey && userId && accountId);
  const jwtReady = jwtConfigured && Boolean(pem);
  const oauthClientConfigured = Boolean(integrationKey && secret);
  const platformSendEnabled =
    env('LAUNCHPAD_DOCUSIGN_PLATFORM_SEND') === '1' ||
    env('LAUNCHPAD_DOCUSIGN_PLATFORM_SEND') === 'true';
  let blockingReason: string | null = null;
  if (!oauthClientConfigured && !jwtReady) {
    blockingReason =
      'Set DOCUSIGN_INTEGRATION_KEY + DOCUSIGN_SECRET_KEY for customer OAuth, or JWT vars + RSA PEM for Mycosoft dogfood.';
  } else if (!oauthClientConfigured) {
    blockingReason = 'Customer OAuth needs DOCUSIGN_INTEGRATION_KEY and DOCUSIGN_SECRET_KEY.';
  }
  return {
    oauthClientConfigured,
    jwtConfigured,
    jwtReady,
    rsaKeyPresent: Boolean(pem),
    connectHmacConfigured: Boolean(env('DOCUSIGN_CONNECT_HMAC_KEY') || env('DOCUSIGN_CONNECT_SECRET')),
    platformSendEnabled,
    authServerHost: docusignAuthServer().replace(/^https?:\/\//, ''),
    blockingReason,
  };
}

function createRs256Jwt(claims: Record<string, string | number>, pem: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${body}`);
  signer.end();
  const sig = signer.sign(pem, 'base64url');
  return `${header}.${body}.${sig}`;
}

async function jwtAccessToken(): Promise<{ token: string; accountId: string; baseUri: string }> {
  const status = docusignConfigStatus();
  if (!status.jwtReady) {
    throw new Error(status.blockingReason || 'DocuSign JWT is not ready');
  }
  const pem = loadRsaPem();
  if (!pem) throw new Error('RSA PEM missing');
  const aud = docusignAuthServer().replace(/^https?:\/\//, '');
  const now = Math.floor(Date.now() / 1000);
  const assertion = createRs256Jwt(
    {
      iss: env('DOCUSIGN_INTEGRATION_KEY'),
      sub: env('DOCUSIGN_USER_ID'),
      aud,
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation',
    },
    pem,
  );
  const res = await fetch(`${docusignAuthServer()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `DocuSign JWT token HTTP ${res.status}`);
  }
  const base = (env('DOCUSIGN_BASE_URL') || 'https://na4.docusign.net').replace(/\/$/, '');
  return { token: json.access_token, accountId: env('DOCUSIGN_API_ACCOUNT_ID'), baseUri: base };
}

export function oauthAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    scope: 'signature',
    client_id: env('DOCUSIGN_INTEGRATION_KEY'),
    redirect_uri: docusignRedirectUri(),
    state,
  });
  return `${docusignAuthServer()}/oauth/auth?${params.toString()}`;
}

export async function exchangeOauthCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  accountId: string;
  baseUri: string;
  userId: string | null;
}> {
  const basic = Buffer.from(`${env('DOCUSIGN_INTEGRATION_KEY')}:${env('DOCUSIGN_SECRET_KEY')}`).toString('base64');
  const tokenRes = await fetch(`${docusignAuthServer()}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: docusignRedirectUri(),
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error || `DocuSign OAuth token HTTP ${tokenRes.status}`);
  }
  const infoRes = await fetch(`${docusignAuthServer()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const info = (await infoRes.json()) as {
    sub?: string;
    accounts?: Array<{ account_id: string; base_uri: string; is_default?: boolean }>;
  };
  const account =
    info.accounts?.find((a) => a.is_default) ?? info.accounts?.[0] ?? null;
  if (!account) throw new Error('DocuSign userinfo returned no accounts');
  const expiresAt = new Date(Date.now() + (tokenJson.expires_in ?? 28800) * 1000).toISOString();
  return {
    accessToken: tokenJson.access_token,
    refreshToken: tokenJson.refresh_token ?? null,
    expiresAt,
    accountId: account.account_id,
    baseUri: account.base_uri.replace(/\/$/, ''),
    userId: info.sub ?? null,
  };
}

export async function storeTenantOauthTokens(input: {
  tenantId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  accountId: string;
  baseUri: string;
  userId: string | null;
  createdBy: string;
}): Promise<{ id: string }> {
  const blob = envelopeEncrypt(
    JSON.stringify({
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
    }),
  );
  const { ciphertextHex, wrappedHex } = envelopeToByteaHex(blob);
  const svc = createLaunchpadServiceClient();
  const last4 = input.accountId.replace(/[^A-Za-z0-9]/g, '').slice(-4).toLowerCase() || '****';
  const row = {
    tenant_id: input.tenantId,
    status: 'active' as const,
    docusign_account_id: input.accountId,
    docusign_base_uri: input.baseUri,
    docusign_user_id: input.userId,
    token_ciphertext: ciphertextHex,
    token_dek_wrapped: wrappedHex,
    token_kms_key_id: blob.masterKeyId,
    token_last4: last4,
    expires_at: input.expiresAt,
    last_error: null,
    created_by: input.createdBy,
    revoked_at: null,
  };
  const { data: existing } = await svc
    .from('launchpad_docusign_connections')
    .select('id')
    .eq('tenant_id', input.tenantId)
    .maybeSingle();
  if (existing?.id) {
    const { error } = await svc
      .from('launchpad_docusign_connections')
      .update(row)
      .eq('tenant_id', input.tenantId)
      .eq('id', existing.id);
    if (error) throw new Error(error.message);
    return { id: existing.id };
  }
  const { data, error } = await svc
    .from('launchpad_docusign_connections')
    .insert(row)
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message || 'Could not store DocuSign connection');
  return { id: data.id };
}

async function loadTenantSendContext(tenantId: string): Promise<{
  token: string;
  accountId: string;
  baseUri: string;
} | null> {
  const svc = createLaunchpadServiceClient();
  const { data } = await svc
    .from('launchpad_docusign_connections')
    .select(
      'status, docusign_account_id, docusign_base_uri, token_ciphertext, token_dek_wrapped, token_kms_key_id, expires_at',
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();
  if (!data?.docusign_account_id || !data.docusign_base_uri) return null;
  const blob = envelopeFromCustodyRow({
    key_ciphertext: data.token_ciphertext,
    key_dek_wrapped: data.token_dek_wrapped,
    key_kms_key_id: data.token_kms_key_id,
  });
  if (!blob) return null;
  const parsed = JSON.parse(envelopeDecrypt(blob)) as { accessToken?: string };
  if (!parsed.accessToken) return null;
  return {
    token: parsed.accessToken,
    accountId: data.docusign_account_id,
    baseUri: String(data.docusign_base_uri).replace(/\/$/, ''),
  };
}

export async function resolveSendContext(tenantId: string): Promise<
  | { ok: true; token: string; accountId: string; baseUri: string; mode: 'tenant_oauth' | 'platform_jwt' }
  | { ok: false; code: 'docusign_oauth_required' | 'docusign_unconfigured'; error: string }
> {
  try {
    const tenant = await loadTenantSendContext(tenantId);
    if (tenant) return { ok: true, ...tenant, mode: 'tenant_oauth' };
  } catch {
    // fall through to platform JWT if explicitly enabled
  }
  const status = docusignConfigStatus();
  if (status.platformSendEnabled && status.jwtReady) {
    const jwt = await jwtAccessToken();
    return { ok: true, ...jwt, mode: 'platform_jwt' };
  }
  if (!status.oauthClientConfigured) {
    return {
      ok: false,
      code: 'docusign_unconfigured',
      error: status.blockingReason || 'DocuSign is not configured',
    };
  }
  return {
    ok: false,
    code: 'docusign_oauth_required',
    error:
      'Connect the customer DocuSign account (OAuth). Mycosoft-as-sender is off unless LAUNCHPAD_DOCUSIGN_PLATFORM_SEND=1 and JWT is ready.',
  };
}

function htmlWithSignAnchor(html: string): string {
  if (html.includes(SIGN_ANCHOR)) return html;
  return `${html}
<p style="margin-top:48px;font-family:system-ui,sans-serif;font-size:12px;color:#333">
  Authorized Official signature ${SIGN_ANCHOR}<br/>
  Launchpad does not apply this signature. The e-signature provider's certificate is authoritative.
</p>`;
}

export async function createAndSendEnvelope(input: {
  tenantId: string;
  title: string;
  html: string;
  signers: DocuSignSigner[];
}): Promise<{ providerEnvelopeId: string; status: EnvelopeStatus; mode: string }> {
  const ctx = await resolveSendContext(input.tenantId);
  if (!ctx.ok) throw Object.assign(new Error(ctx.error), { code: ctx.code });
  const documentBase64 = Buffer.from(htmlWithSignAnchor(input.html), 'utf8').toString('base64');
  const body = {
    emailSubject: `Signature requested: ${input.title}`.slice(0, 100),
    documents: [
      {
        documentBase64,
        name: `${input.title.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80)}.html`,
        fileExtension: 'html',
        documentId: '1',
      },
    ],
    recipients: {
      signers: input.signers.map((s, i) => ({
        email: s.email,
        name: s.name,
        recipientId: String(i + 1),
        routingOrder: String(s.routingOrder || i + 1),
        roleName: s.role,
        tabs: {
          signHereTabs: [{ anchorString: SIGN_ANCHOR, anchorUnits: 'pixels', anchorXOffset: '0', anchorYOffset: '0' }],
        },
      })),
    },
    status: 'sent',
  };
  const res = await fetch(`${ctx.baseUri}/restapi/v2.1/accounts/${ctx.accountId}/envelopes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { envelopeId?: string; status?: string; message?: string; errorCode?: string };
  if (!res.ok || !json.envelopeId) {
    throw new Error(json.message || json.errorCode || `DocuSign create envelope HTTP ${res.status}`);
  }
  return {
    providerEnvelopeId: json.envelopeId,
    status: mapProviderStatus(json.status),
    mode: ctx.mode,
  };
}

export async function resendEnvelope(tenantId: string, providerEnvelopeId: string): Promise<void> {
  const ctx = await resolveSendContext(tenantId);
  if (!ctx.ok) throw Object.assign(new Error(ctx.error), { code: ctx.code });
  const res = await fetch(
    `${ctx.baseUri}/restapi/v2.1/accounts/${ctx.accountId}/envelopes/${providerEnvelopeId}?resend_envelope=true`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ctx.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    },
  );
  if (!res.ok) throw new Error(`DocuSign resend HTTP ${res.status}`);
}

export async function voidEnvelope(
  tenantId: string,
  providerEnvelopeId: string,
  reason: string,
): Promise<void> {
  const ctx = await resolveSendContext(tenantId);
  if (!ctx.ok) throw Object.assign(new Error(ctx.error), { code: ctx.code });
  const res = await fetch(
    `${ctx.baseUri}/restapi/v2.1/accounts/${ctx.accountId}/envelopes/${providerEnvelopeId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ctx.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'voided', voidedReason: reason.slice(0, 200) }),
    },
  );
  if (!res.ok) throw new Error(`DocuSign void HTTP ${res.status}`);
}

export function mapProviderStatus(raw: string | undefined | null): EnvelopeStatus {
  const s = (raw ?? '').toLowerCase();
  if (s === 'created') return 'draft';
  if (s === 'sent') return 'sent';
  if (s === 'delivered') return 'delivered';
  if (s === 'completed' || s === 'signed') return 'completed';
  if (s === 'declined') return 'declined';
  if (s === 'voided' || s === 'deleted') return 'voided';
  if (s === 'expired' || s === 'timedout') return 'expired';
  return 'sent';
}

/** DocuSign Connect HMAC (X-DocuSign-Signature-1). Hash the raw body; never log it. */
export function verifyConnectHmac(rawBody: string, signatureHeader: string | null): boolean {
  const key = env('DOCUSIGN_CONNECT_HMAC_KEY') || env('DOCUSIGN_CONNECT_SECRET');
  if (!key || !signatureHeader) return false;
  const expected = createHmac('sha256', key).update(rawBody, 'utf8').digest('base64');
  const candidates = signatureHeader.split(',').map((p) => p.trim()).filter(Boolean);
  const a = Buffer.from(expected);
  for (const c of candidates) {
    const b = Buffer.from(c);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

export function hashBytesSha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export const AUTHORIZED_OFFICIAL_REPRESENTATIONS = [
  'I am an authorized official of this organization for the purpose of this signature packet.',
  'Launchpad did not apply this signature and will not store a signature image.',
  'The e-signature provider certificate is the authoritative record of validity.',
  'This workspace is non-CUI. Signed files stay in the customer-controlled system; Launchpad stores envelope metadata and a hash only.',
  'Mycosoft is pursuing CMMC Level 2 (Self-Assessment) and does not claim achieved compliance on my behalf.',
] as const;
