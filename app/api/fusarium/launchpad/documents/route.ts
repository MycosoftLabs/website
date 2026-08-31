import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { entitlementDenied, jsonError } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import { POLICY_FAMILIES } from '@/lib/reports/policy';
import { buildTenantPolicy, policyDraftPrompts } from '@/lib/launchpad/docs/policy-factory';
import { profileFromCompanyData } from '@/lib/launchpad/docs/tenant-profile';
import { RULE_PACK_V1 } from '@/lib/launchpad/scoring/engine';
import { routeCompletion } from '@/lib/launchpad/ai/router';

/**
 * Document factory endpoint.
 *
 * GET  — list the tenant's generated documents (metadata; html on demand via ?id=).
 * POST — generate a family-policy DRAFT from the tenant's own profile facts.
 *        Drafts always persist with status 'draft'; approval is a separate
 *        human action (not implemented by the factory, ever).
 */

export async function GET(request: NextRequest) {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const id = request.nextUrl.searchParams.get('id');
  if (id) {
    const { data, error } = await ctx.supabase
      .from('launchpad_generated_documents')
      .select('id, kind, title, status, rendered_html, payload, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ document: data });
  }

  const { data, error } = await ctx.supabase
    .from('launchpad_generated_documents')
    .select('id, kind, title, status, rule_pack_version, template_version, version, content_hash, created_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load documents' }, { status: 500 });
  return NextResponse.json({ documents: data ?? [], families: Object.keys(POLICY_FAMILIES) });
}

export async function POST(request: NextRequest) {
  const result = await requireTenant({ write: true, ai: true });
  if (result.error) return result.error;
  const { ctx } = result;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.documentFactory) {
    return entitlementDenied('documentFactory', derived.planKey, 'Document factory is not on this plan.');
  }

  let body: { family?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const family = String(body.family ?? '');
  if (!POLICY_FAMILIES[family]) {
    return NextResponse.json({ error: 'Unknown policy family' }, { status: 400 });
  }

  // Tenant facts come from the company profile — and ONLY from there.
  const { data: companyRow } = await ctx.supabase
    .from('launchpad_company_profiles')
    .select('data')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();
  const profile = profileFromCompanyData((companyRow?.data as Record<string, unknown>) ?? {});

  const prompts = policyDraftPrompts(family, profile);
  let narrative: { text: string | null; provider: string | null } = { text: null, provider: null };
  if (prompts) {
    const completion = await routeCompletion({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      supabase: ctx.supabase,
      taskType: 'policy_draft',
      system: prompts.system,
      user: prompts.user,
    });
    if (!completion.ok && completion.code === 'insufficient_credits') {
      return jsonError(402, 'insufficient_credits', completion.error ?? 'Buy credits to generate this draft.', {
        buyCreditsPath: '/app/launchpad/billing',
      });
    }
    if (completion.ok && completion.text) {
      narrative = {
        text: completion.text,
        provider: completion.provider && completion.model
          ? `${completion.provider} (${completion.model})`
          : completion.provider ?? null,
      };
    }
  }

  const draft = await buildTenantPolicy(family, profile, RULE_PACK_V1.version, narrative);
  if (!draft) return NextResponse.json({ error: 'Generation failed' }, { status: 500 });

  const contentHash = createHash('sha256').update(draft.html).digest('hex');
  const { data: doc, error } = await ctx.supabase
    .from('launchpad_generated_documents')
    .insert({
      tenant_id: ctx.tenantId,
      kind: 'policy',
      title: draft.meta.title,
      status: 'draft', // the factory can never set anything else
      rule_pack_version: draft.meta.rulePackVersion,
      template_version: draft.meta.templateVersion,
      payload: draft.meta,
      rendered_html: draft.html,
      content_hash: contentHash,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !doc) return NextResponse.json({ error: 'Could not persist draft' }, { status: 500 });

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'document.generated',
    entity: 'launchpad_generated_documents',
    entityId: doc.id,
    payload: { family, contentHash, provider: draft.meta.provider },
  });

  return NextResponse.json({ ok: true, id: doc.id, meta: draft.meta });
}

/** Human-only status transition. The factory can never set approved. */
export async function PATCH(request: NextRequest) {
  const result = await requireTenant({ roles: ['owner', 'admin'], write: true });
  if (result.error) return result.error;
  const { ctx } = result;
  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id : '';
  const status = body.status;
  const allowed = ['draft', 'customer_review', 'approved', 'superseded'];
  if (!id || !status || !allowed.includes(status)) {
    return NextResponse.json({ error: 'id and status (draft|customer_review|approved|superseded) required' }, { status: 400 });
  }
  const patch: Record<string, unknown> = { status };
  if (status === 'approved') {
    patch.approved_by = ctx.user.id;
    patch.approved_at = new Date().toISOString();
  }
  const { error } = await ctx.supabase
    .from('launchpad_generated_documents')
    .update(patch)
    .eq('tenant_id', ctx.tenantId)
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update document status' }, { status: 500 });
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'document.status.changed',
    entity: 'launchpad_generated_documents',
    entityId: id,
    payload: { status },
  });
  return NextResponse.json({ ok: true, id, status });
}

