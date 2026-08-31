import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { capText, entitlementDenied, jsonError, parseIsoDate, readJson, SHA256_RE } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';

const PROVIDERS = ['preveil', 'gcc_high', 'govcloud', 'assured_workloads', 'self_hosted', 'exostar', 'other'] as const;

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.enclaveBridge) {
    return entitlementDenied('enclaveBridge', derived.planKey, 'Enclave Bridge is not on this plan.');
  }
  const { data, error } = await ctx.supabase
    .from('launchpad_enclave_references')
    .select('id, provider, title, external_id, owner_label, item_date, content_hash, status, created_at, revoked_at')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });
  if (error) return jsonError(500, 'load_failed', 'Could not load enclave references');
  const references = data ?? [];
  return NextResponse.json({
    references,
    providers: PROVIDERS,
    connectorPattern: {
      stores: ['title', 'id', 'owner', 'date', 'hash', 'status'],
      never: ['imported content', 'broad drive search', 'AI processing without item-level approval'],
    },
    note:
      references.length === 0
        ? 'No enclave references yet. OAuth plumbing for PreVeil/Exostar is not wired in this pass — metadata the customer selects can still be recorded. Content is never imported.'
        : 'Content is not stored. Revoke deletes the metadata row status, not a remote file.',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.enclaveBridge) {
    return entitlementDenied('enclaveBridge', derived.planKey, 'Enclave Bridge is not on this plan.');
  }
  const parsed = await readJson<{
    provider?: string;
    title?: string;
    externalId?: string;
    ownerLabel?: string;
    itemDate?: string;
    contentHash?: string;
    revokeId?: string;
  }>(request);
  if (parsed.ok === false) return parsed.response;
  if (parsed.body.revokeId) {
    const revokeId = typeof parsed.body.revokeId === 'string' ? parsed.body.revokeId.trim() : '';
    if (!revokeId) return jsonError(400, 'validation_error', 'revokeId required');
    const { data, error } = await ctx.supabase
      .from('launchpad_enclave_references')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('tenant_id', ctx.tenantId)
      .eq('id', revokeId)
      .select('id')
      .maybeSingle();
    if (error) return jsonError(500, 'revoke_failed', 'Could not revoke reference');
    if (!data) return jsonError(404, 'not_found', 'Enclave reference not found in this workspace');
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'enclave.revoked',
      entity: 'launchpad_enclave_references',
      entityId: data.id,
    });
    return NextResponse.json({ ok: true, revoked: true, id: data.id });
  }
  const provider = typeof parsed.body.provider === 'string' ? parsed.body.provider : '';
  const title = capText(parsed.body.title, 300);
  if (!(PROVIDERS as readonly string[]).includes(provider) || !title) {
    return jsonError(400, 'validation_error', 'provider and title required');
  }
  const externalId = capText(parsed.body.externalId, 200) || null;
  const ownerLabel = capText(parsed.body.ownerLabel, 200) || null;
  const itemDateParsed = parseIsoDate(parsed.body.itemDate);
  if (itemDateParsed.ok === false) {
    return jsonError(400, 'validation_error', 'itemDate must be a valid ISO date');
  }
  const rawHash = capText(parsed.body.contentHash, 64);
  if (rawHash && !SHA256_RE.test(rawHash)) {
    return jsonError(400, 'validation_error', 'contentHash must be a 64-char hex SHA-256');
  }
  const { data, error } = await ctx.supabase
    .from('launchpad_enclave_references')
    .insert({
      tenant_id: ctx.tenantId,
      provider,
      title,
      external_id: externalId,
      owner_label: ownerLabel,
      item_date: itemDateParsed.iso,
      content_hash: rawHash ? rawHash.toLowerCase() : null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'create_failed', 'Could not record reference');
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'enclave.referenced',
    entity: 'launchpad_enclave_references',
    entityId: data.id,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
