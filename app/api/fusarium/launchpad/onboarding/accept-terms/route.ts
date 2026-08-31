import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { TERMS_VERSION } from '@/lib/launchpad/constants';

/**
 * POST — record first-run terms for a workspace that was provisioned at pay
 * time (webhook/activate). Claude owns the wizard UI; this only writes the
 * acceptance ledger. Does not create a tenant.
 */

const REQUIRED_DOCS = ['terms', 'privacy', 'aup', 'non_cui_policy'] as const;

export async function POST(request: NextRequest) {
  const result = await requireTenant({ allowPaidOnboarding: true });
  if (result.error) return result.error;
  const { ctx } = result;
  if (!ctx.tenantId) {
    return NextResponse.json(
      { error: 'No workspace yet', code: 'tenant_required' },
      { status: 403 },
    );
  }

  let body: { accepted?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const accepted = new Set(Array.isArray(body.accepted) ? body.accepted : []);
  const missing = REQUIRED_DOCS.filter((d) => !accepted.has(d));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `You must accept: ${missing.join(', ')}`, code: 'terms_not_accepted' },
      { status: 400 },
    );
  }

  const { data: existing } = await ctx.supabase
    .from('launchpad_terms_acceptances')
    .select('doc_key')
    .eq('tenant_id', ctx.tenantId)
    .eq('user_id', ctx.user.id)
    .eq('doc_version', TERMS_VERSION);
  const already = new Set((existing ?? []).map((row) => row.doc_key as string));
  if (REQUIRED_DOCS.every((doc) => already.has(doc))) {
    return NextResponse.json(
      {
        error: 'Terms already accepted',
        code: 'already_onboarded',
        tenantId: ctx.tenantId,
        nextStep: 'dashboard',
        redirectTo: '/app/launchpad/dashboard',
      },
      { status: 409 },
    );
  }

  const ipHash = createHash('sha256')
    .update(request.headers.get('x-forwarded-for') ?? 'unknown')
    .digest('hex')
    .slice(0, 32);

  const { error } = await ctx.supabase.from('launchpad_terms_acceptances').insert(
    REQUIRED_DOCS.map((doc) => ({
      tenant_id: ctx.tenantId,
      user_id: ctx.user.id,
      doc_key: doc,
      doc_version: TERMS_VERSION,
      ip_hash: ipHash,
    })),
  );
  if (error) {
    return NextResponse.json(
      { error: 'Could not record terms', code: 'terms_record_failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    tenantId: ctx.tenantId,
    nextStep: 'dashboard',
    redirectTo: '/app/launchpad/dashboard',
  });
}
