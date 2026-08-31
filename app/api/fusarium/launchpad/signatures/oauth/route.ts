import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac, randomBytes } from 'crypto';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError } from '@/lib/launchpad/http';
import { docusignConfigStatus, oauthAuthorizeUrl } from '@/lib/launchpad/signatures/docusign';

export const dynamic = 'force-dynamic';

const STATE_COOKIE = 'lp_docusign_oauth';

function stateSecret(): string | null {
  const secret = (
    process.env.LAUNCHPAD_OAUTH_STATE_SECRET ||
    process.env.LAUNCHPAD_KMS_MASTER_KEY ||
    process.env.NEXTAUTH_SECRET ||
    ''
  ).trim();
  return secret || null;
}

export function signOauthState(tenantId: string, nonce: string, exp: number): string {
  const secret = stateSecret();
  if (!secret) {
    throw new Error('oauth_state_unconfigured');
  }
  const payload = `${tenantId}.${nonce}.${exp}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function parseOauthState(state: string): { tenantId: string; nonce: string } | null {
  try {
    const raw = Buffer.from(state, 'base64url').toString('utf8');
    const [tenantId, nonce, expStr, sig] = raw.split('.');
    if (!tenantId || !nonce || !expStr || !sig) return null;
    if (Number(expStr) < Date.now()) return null;
    const expected = signOauthState(tenantId, nonce, Number(expStr));
    if (expected !== state) return null;
    return { tenantId, nonce };
  } catch {
    return null;
  }
}

export async function GET() {
  const gate = await requireTenant({ roles: ['owner', 'admin'] });
  if (gate.error) return gate.error;
  const status = docusignConfigStatus();
  if (!status.oauthClientConfigured) {
    return jsonError(503, 'docusign_unconfigured', status.blockingReason || 'DocuSign OAuth client is not configured', {
      docusign: status,
    });
  }
  if (!stateSecret()) {
    return jsonError(
      503,
      'oauth_state_unconfigured',
      'Set LAUNCHPAD_OAUTH_STATE_SECRET (or LAUNCHPAD_KMS_MASTER_KEY / NEXTAUTH_SECRET). Refusing to HMAC with a placeholder.',
    );
  }
  const nonce = randomBytes(16).toString('hex');
  const exp = Date.now() + 15 * 60 * 1000;
  const state = signOauthState(gate.ctx.tenantId, nonce, exp);
  (await cookies()).set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 900,
  });
  return NextResponse.json({
    authorizeUrl: oauthAuthorizeUrl(state),
    docusign: status,
    note: 'Opens the customer DocuSign account. Tokens are envelope-encrypted. Mycosoft does not become the signer.',
  });
}
