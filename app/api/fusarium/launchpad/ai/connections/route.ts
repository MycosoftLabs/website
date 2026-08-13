import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { appendAuditEvent } from '@/lib/launchpad/audit';
import { jsonError, readJson } from '@/lib/launchpad/http';
import { kmsBackendStatus } from '@/lib/launchpad/crypto/envelope';
import { listPublicConnections } from '@/lib/launchpad/ai/router';
import {
  custodyReady,
  revokeConnectionCustody,
  storeByoConnection,
  storeMcpCursor,
} from '@/lib/launchpad/ai/connections';
import { isAiProvider, isInferenceProvider } from '@/lib/launchpad/ai/types';

/**
 * AI provider connections.
 *
 * Live schema (Claude 20260813031155, extended): bytea key_ciphertext /
 * key_dek_wrapped. Authenticated cannot SELECT those columns.
 *
 * POST BYO: plaintext `apiKey` accepted once, envelope-encrypted, never returned.
 * GET: public metadata only (key_last4 → displayPrefix).
 * PATCH/DELETE revoke: zeros bytea via service role.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LEDGER_COLUMNS =
  'id, provider, model, task, byo_key, input_units, output_units, credits_charged, actual_cost_cents, created_at';

export async function GET() {
  const result = await requireTenant();
  if (result.error) return result.error;
  const { ctx } = result;

  const listed = await listPublicConnections(ctx.supabase, ctx.tenantId);
  if (!listed.ok) {
    return jsonError(500, 'load_failed', 'Could not load AI connections');
  }

  const { data: ledger, error: ledgerError } = await ctx.supabase
    .from('launchpad_ai_cost_ledger')
    .select(LEDGER_COLUMNS)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (ledgerError) {
    return jsonError(500, 'load_failed', 'Could not load AI cost ledger');
  }

  const kms = kmsBackendStatus();
  return NextResponse.json({
    connections: listed.connections,
    providers: ['anthropic', 'openai', 'perplexity', 'xai', 'cursor'],
    byoAvailableOnEveryTier: true,
    custody: custodyReady() ? 'ready' : 'kms_pending',
    kms,
    costLedger: ledger ?? [],
  });
}

export async function POST(request: NextRequest) {
  const result = await requireTenant({ write: true, roles: ['owner', 'admin'] });
  if (result.error) return result.error;
  const { ctx } = result;

  const parsed = await readJson<{
    provider?: string;
    mode?: string;
    apiKey?: string;
    label?: string;
  }>(request);
  // 'in' narrowing: boolean discriminants do not narrow with strictNullChecks off.
  if ('response' in parsed) return parsed.response;
  const provider = typeof parsed.body.provider === 'string' ? parsed.body.provider : '';
  if (!isAiProvider(provider)) {
    return jsonError(400, 'validation_error', 'provider must be one of: anthropic, openai, perplexity, xai, cursor');
  }

  const modeRaw = parsed.body.mode;
  const label =
    typeof parsed.body.label === 'string' && parsed.body.label.trim()
      ? parsed.body.label.trim().slice(0, 120)
      : null;

  if (provider === 'cursor' || modeRaw === 'mcp') {
    const stored = await storeMcpCursor({ tenantId: ctx.tenantId, label });
    if ('error' in stored) return jsonError(500, 'store_failed', stored.error);
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'ai.connection.mcp_enabled',
      entity: 'launchpad_ai_connections',
      entityId: stored.id,
      payload: { provider: 'cursor', mode: 'mcp' },
    });
    return NextResponse.json({
      ok: true,
      id: stored.id,
      mode: 'mcp',
      note: 'Cursor has no inference API key. Use a Launchpad workspace API key (Settings → API keys) for MCP tools.',
    });
  }

  const mode = modeRaw === 'byo' || typeof parsed.body.apiKey === 'string' ? 'byo' : 'managed';

  if (mode === 'byo') {
    const apiKey = typeof parsed.body.apiKey === 'string' ? parsed.body.apiKey.trim() : '';
    if (!apiKey || apiKey.length < 8) {
      return jsonError(400, 'validation_error', 'apiKey is required once for BYO and is never returned');
    }
    if (!isInferenceProvider(provider)) {
      return jsonError(400, 'cursor_mcp_only', 'Cursor is MCP-only; do not paste an editor key here.');
    }
    const stored = await storeByoConnection({
      tenantId: ctx.tenantId,
      provider,
      apiKey,
      label,
    });
    if ('error' in stored) {
      const status = stored.code === 'kms_unconfigured' ? 503 : stored.code === 'cursor_mcp_only' ? 400 : 500;
      return jsonError(status, stored.code, stored.error);
    }
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'ai.connection.byo_stored',
      entity: 'launchpad_ai_connections',
      entityId: stored.id,
      payload: { provider, mode: 'byo', last4: stored.displayPrefix },
    });
    return NextResponse.json({
      ok: true,
      id: stored.id,
      mode: 'byo',
      displayPrefix: stored.displayPrefix,
      kmsBackend: stored.kmsBackend,
      masterKeyId: stored.masterKeyId,
    });
  }

  if (!isInferenceProvider(provider)) {
    return jsonError(400, 'cursor_mcp_only', 'Cursor is MCP-only.');
  }

  const { data: existing, error: existingError } = await ctx.supabase
    .from('launchpad_ai_connections')
    .select('id, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('provider', provider)
    .eq('mode', 'managed')
    .maybeSingle();
  if (existingError) {
    return jsonError(500, 'load_failed', 'Could not check existing connections');
  }

  if (existing) {
    if (existing.status === 'active') {
      return NextResponse.json({ ok: true, id: existing.id, alreadyActive: true, mode: 'managed' });
    }
    const { error: updateError } = await ctx.supabase
      .from('launchpad_ai_connections')
      .update({ status: 'active', revoked_at: null, ...(label ? { label } : {}) })
      .eq('tenant_id', ctx.tenantId)
      .eq('id', existing.id);
    if (updateError) return jsonError(500, 'store_failed', 'Could not re-enable managed AI');
    await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
      action: 'ai.connection.managed_enabled',
      entity: 'launchpad_ai_connections',
      entityId: existing.id,
      payload: { provider, reactivated: true },
    });
    return NextResponse.json({ ok: true, id: existing.id, mode: 'managed' });
  }

  const { data, error } = await ctx.supabase
    .from('launchpad_ai_connections')
    .insert({
      tenant_id: ctx.tenantId,
      provider,
      mode: 'managed',
      status: 'active',
      label,
    })
    .select('id')
    .single();
  if (error || !data) return jsonError(500, 'store_failed', 'Could not enable managed AI');

  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'ai.connection.managed_enabled',
    entity: 'launchpad_ai_connections',
    entityId: data.id,
    payload: { provider },
  });
  return NextResponse.json({ ok: true, id: data.id, mode: 'managed' });
}

export async function PATCH(request: NextRequest) {
  const result = await requireTenant({ write: true, roles: ['owner', 'admin'] });
  if (result.error) return result.error;
  const { ctx } = result;
  const parsed = await readJson<{ id?: string; action?: string }>(request);
  // 'in' narrowing: boolean discriminants do not narrow with strictNullChecks off.
  if ('response' in parsed) return parsed.response;
  const id = typeof parsed.body.id === 'string' ? parsed.body.id : '';
  if (!UUID_RE.test(id)) return jsonError(400, 'validation_error', 'id must be a connection UUID');
  if (parsed.body.action !== 'revoke') return jsonError(400, 'validation_error', "action must be 'revoke'");
  return revoke(ctx, id);
}

export async function DELETE(request: NextRequest) {
  const result = await requireTenant({ write: true, roles: ['owner', 'admin'] });
  if (result.error) return result.error;
  const { ctx } = result;
  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!UUID_RE.test(id)) return jsonError(400, 'validation_error', 'id must be a connection UUID');
  return revoke(ctx, id);
}

async function revoke(
  ctx: { supabase: SupabaseClient; tenantId: string; user: { id: string } },
  id: string,
) {
  const wiped = await revokeConnectionCustody({ tenantId: ctx.tenantId, id, session: ctx.supabase });
  if ('error' in wiped) return jsonError(404, 'not_found', wiped.error);
  await appendAuditEvent(ctx.supabase, ctx.tenantId, ctx.user.id, {
    action: 'ai.connection.revoked',
    entity: 'launchpad_ai_connections',
    entityId: id,
    payload: { provider: wiped.provider, mode: wiped.mode },
  });
  return NextResponse.json({ ok: true });
}
