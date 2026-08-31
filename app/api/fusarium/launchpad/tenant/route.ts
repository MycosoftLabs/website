import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireTenant, ACTIVE_TENANT_COOKIE } from '@/lib/launchpad/tenant-context';
import { TERMS_VERSION } from '@/lib/launchpad/constants';
import { isLaunchpadOperatorEmail } from '@/lib/launchpad/operator';

/**
 * GET  — resolve the caller's Launchpad context (or signal onboarding/selection).
 * POST — select the active tenant. The tenant id in the body is ONLY used to
 *        pick among memberships the session can already see under RLS — it
 *        grants nothing a forged value could exploit.
 */

export async function GET() {
  const result = await requireTenant({ allowNoTenant: true });
  if (result.error) return result.error;
  const { ctx } = result;

  if (!ctx.tenantId) {
    return NextResponse.json({
      state: 'needs_onboarding',
      user: { email: ctx.user.email },
      isOperator: isLaunchpadOperatorEmail(ctx.user.email),
      acceptance: {
        termsVersion: TERMS_VERSION,
        accepted: false,
        docs: [] as string[],
      },
    });
  }

  const requiredDocs = ['terms', 'privacy', 'aup', 'non_cui_policy'] as const;
  const { data: rows } = await ctx.supabase
    .from('launchpad_terms_acceptances')
    .select('doc_key')
    .eq('tenant_id', ctx.tenantId)
    .eq('user_id', ctx.user.id)
    .eq('doc_version', TERMS_VERSION);
  const docs = Array.from(new Set((rows ?? []).map((r) => r.doc_key as string)));
  const accepted = requiredDocs.every((doc) => docs.includes(doc));

  return NextResponse.json({
    state: 'ok',
    tenant: { id: ctx.tenantId, name: ctx.tenantName, status: ctx.tenantStatus },
    role: ctx.role,
    user: { email: ctx.user.email },
    isOperator: isLaunchpadOperatorEmail(ctx.user.email),
    acceptance: {
      termsVersion: TERMS_VERSION,
      accepted,
      docs,
    },
  });
}

export async function POST(request: NextRequest) {
  const result = await requireTenant({ allowNoTenant: true });
  if (result.error) return result.error;
  const { ctx } = result;

  let body: { tenantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const target = typeof body.tenantId === 'string' ? body.tenantId : '';
  if (!target) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  // Validate through the session client — RLS returns the row only if the
  // caller is genuinely an active member.
  const { data } = await ctx.supabase
    .from('launchpad_memberships')
    .select('tenant_id')
    .eq('user_id', ctx.user.id)
    .eq('tenant_id', target)
    .eq('status', 'active')
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: 'Not a member of that workspace' }, { status: 403 });
  }

  (await cookies()).set(ACTIVE_TENANT_COOKIE, target, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}
