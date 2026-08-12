import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { requireTenant, ACTIVE_TENANT_COOKIE } from '@/lib/launchpad/tenant-context';
import { TERMS_VERSION } from '@/lib/launchpad/constants';

/**
 * POST — create the caller's Launchpad workspace.
 *
 * Atomic on the DB side via the SECURITY DEFINER RPC launchpad_create_tenant
 * (tenant + owner membership + genesis audit event). Terms acceptance rows are
 * recorded in the same request; the wizard requires all four checkboxes before
 * it will call this route, and we re-validate server-side.
 */

const REQUIRED_DOCS = ['terms', 'privacy', 'aup', 'non_cui_policy'] as const;

export async function POST(request: NextRequest) {
  const result = await requireTenant({ allowNoTenant: true });
  if (result.error) return result.error;
  const { ctx } = result;

  if (ctx.tenantId) {
    return NextResponse.json(
      { error: 'You already have a workspace', code: 'already_onboarded' },
      { status: 409 },
    );
  }

  let body: { companyName?: string; accepted?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const companyName = (body.companyName ?? '').trim();
  if (companyName.length < 2 || companyName.length > 120) {
    return NextResponse.json({ error: 'Company name must be 2-120 characters' }, { status: 400 });
  }
  const accepted = new Set(Array.isArray(body.accepted) ? body.accepted : []);
  const missing = REQUIRED_DOCS.filter((d) => !accepted.has(d));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `You must accept: ${missing.join(', ')}`, code: 'terms_not_accepted' },
      { status: 400 },
    );
  }

  // 1. Atomic tenant creation (RPC runs as definer; membership + genesis event included).
  const { data: tenantId, error: rpcError } = await ctx.supabase.rpc('launchpad_create_tenant', {
    p_name: companyName,
  });
  if (rpcError || !tenantId) {
    console.error('[launchpad/onboarding] create_tenant failed:', rpcError?.message);
    return NextResponse.json({ error: 'Could not create workspace' }, { status: 500 });
  }

  // 2. Terms acceptance ledger (session client; RLS checks membership just created).
  const ipHash = createHash('sha256')
    .update(request.headers.get('x-forwarded-for') ?? 'unknown')
    .digest('hex')
    .slice(0, 32);
  const { error: termsError } = await ctx.supabase.from('launchpad_terms_acceptances').insert(
    REQUIRED_DOCS.map((doc) => ({
      tenant_id: tenantId,
      user_id: ctx.user.id,
      doc_key: doc,
      doc_version: TERMS_VERSION,
      ip_hash: ipHash,
    })),
  );
  if (termsError) {
    // Tenant exists but acceptances failed — surface loudly; the wizard retries.
    console.error('[launchpad/onboarding] terms insert failed:', termsError.message);
    return NextResponse.json(
      { error: 'Workspace created but terms recording failed — retry', code: 'terms_record_failed' },
      { status: 500 },
    );
  }

  (await cookies()).set(ACTIVE_TENANT_COOKIE, tenantId as string, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true, tenantId });
}
