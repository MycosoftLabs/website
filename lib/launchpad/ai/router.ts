/**
 * Dual-meter AI router.
 * BYO: decrypt in-process, credits_charged=0.
 * Managed: reserve-then-settle platform credits.
 * Prompt firewall applies to both. Keys never appear in responses or logs.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { sanitizeForModel, filterModelOutput } from '@/lib/launchpad/prompt-firewall';
import { envelopeDecrypt, redactSecrets, type EnvelopeBlob } from '@/lib/launchpad/crypto/envelope';
import { governanceFor, type AiTaskType } from './governance';
import { completeWithKey, managedKeyFor } from './providers';
import { insertCostLedger, refundReservation, reserveCredits, settleCredits } from './metering';
import type { AiProvider } from './types';
import { isInferenceProvider } from './types';

export interface RouterRequest {
  tenantId: string;
  userId: string;
  supabase: SupabaseClient;
  taskType: AiTaskType | string;
  system: string;
  user: string;
  providerPreference?: AiProvider;
  maxTokens?: number;
}

export interface RouterResult {
  ok: boolean;
  text?: string;
  byoKey: boolean;
  provider?: string;
  model?: string;
  creditsCharged: number;
  reservationId?: string;
  firewallRedactions: number;
  firewallFlags: string[];
  error?: string;
  code?: string;
}

const PUBLIC_CONNECTION_COLUMNS =
  'id, provider, mode, status, display_prefix, last_verified_at, created_at, revoked_at, kms_backend';

interface MaterialRow {
  id: string;
  provider: string;
  mode: string;
  status: string;
  ciphertext: string;
  nonce: string;
  tag: string;
  wrapped_dek: string;
  wrap_nonce: string;
  wrap_tag: string;
  dek_id: string;
  alg: string;
  kms_backend: string;
}

function blobFromRow(row: MaterialRow): EnvelopeBlob {
  return {
    ciphertext: row.ciphertext,
    nonce: row.nonce,
    tag: row.tag,
    wrappedDek: row.wrapped_dek,
    wrapNonce: row.wrap_nonce,
    wrapTag: row.wrap_tag,
    dekId: row.dek_id,
    alg: row.alg as EnvelopeBlob['alg'],
    kmsBackend: row.kms_backend as EnvelopeBlob['kmsBackend'],
  };
}

async function loadByoMaterial(
  tenantId: string,
  provider?: AiProvider,
): Promise<MaterialRow | null> {
  const svc = createLaunchpadServiceClient();
  let q = svc
    .from('launchpad_ai_connections')
    .select(
      'id, provider, mode, status, ciphertext, nonce, tag, wrapped_dek, wrap_nonce, wrap_tag, dek_id, alg, kms_backend',
    )
    .eq('tenant_id', tenantId)
    .eq('mode', 'byo')
    .eq('status', 'verified')
    .is('revoked_at', null);
  if (provider) q = q.eq('provider', provider);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error || !data) return null;
  return data as MaterialRow;
}

export async function listPublicConnections(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from('launchpad_ai_connections')
    .select(PUBLIC_CONNECTION_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) return { ok: false as const, error: error.message, connections: [] };
  return { ok: true as const, connections: data ?? [] };
}

export async function routeCompletion(req: RouterRequest): Promise<RouterResult> {
  const gov = governanceFor(req.taskType);
  const { text: safeSystem, redactions: r1 } = sanitizeForModel(req.system);
  const { text: safeUser, redactions: r2 } = sanitizeForModel(req.user);
  const redactions = r1 + r2;

  const preferred = req.providerPreference;
  if (preferred && !isInferenceProvider(preferred)) {
    return {
      ok: false,
      byoKey: false,
      creditsCharged: 0,
      firewallRedactions: redactions,
      firewallFlags: [],
      error: 'Cursor is MCP-only. Use a Launchpad API key from Settings → API keys.',
      code: 'cursor_mcp_only',
    };
  }

  const byo = await loadByoMaterial(req.tenantId, preferred && isInferenceProvider(preferred) ? preferred : undefined);
  if (byo) {
    let key = '';
    try {
      key = envelopeDecrypt(blobFromRow(byo));
      const result = await completeWithKey(byo.provider as AiProvider, key, {
        system: safeSystem,
        user: safeUser,
        maxTokens: req.maxTokens ?? gov.maxContextTokens,
      });
      const filtered = filterModelOutput(result.text);
      await insertCostLedger(req.supabase, req.tenantId, req.userId, {
        provider: result.provider,
        model: result.model,
        providerPriceVersion: null,
        inputUnits: result.inputUnits,
        outputUnits: result.outputUnits,
        searchRequests: 0,
        retrievalRequests: 0,
        reasoningUnits: 0,
        cacheRead: 0,
        cacheWrite: 0,
        actualCost: null,
        reservedCost: null,
        creditsCharged: 0,
        byoKey: true,
        taskId: null,
        reservationId: null,
      });
      return {
        ok: true,
        text: filtered.text,
        byoKey: true,
        provider: result.provider,
        model: result.model,
        creditsCharged: 0,
        firewallRedactions: redactions,
        firewallFlags: filtered.flagged,
      };
    } catch (err) {
      return {
        ok: false,
        byoKey: true,
        creditsCharged: 0,
        firewallRedactions: redactions,
        firewallFlags: [],
        error: redactSecrets(err instanceof Error ? err.message : 'BYO complete failed'),
        code: 'byo_complete_failed',
      };
    } finally {
      key = '';
    }
  }

  const managedProvider: AiProvider =
    preferred && isInferenceProvider(preferred) ? preferred : 'anthropic';
  const managedKey = managedKeyFor(managedProvider) || managedKeyFor('openai') || managedKeyFor('perplexity');
  const resolvedProvider: AiProvider = managedKeyFor(managedProvider)
    ? managedProvider
    : managedKeyFor('openai')
      ? 'openai'
      : 'perplexity';
  if (!managedKey) {
    return {
      ok: false,
      byoKey: false,
      creditsCharged: 0,
      firewallRedactions: redactions,
      firewallFlags: [],
      error: 'No managed AI provider configured and no verified BYO connection.',
      code: 'no_provider',
    };
  }

  const reserve = await reserveCredits(
    req.supabase,
    req.tenantId,
    gov.maxCostCredits,
    `spend:${gov.taskType}`,
    { taskType: gov.taskType, provider: resolvedProvider },
  );
  if (!reserve.ok || !reserve.reservationId) {
    return {
      ok: false,
      byoKey: false,
      creditsCharged: 0,
      firewallRedactions: redactions,
      firewallFlags: [],
      error: reserve.error ?? 'Could not reserve credits',
      code: reserve.code ?? 'insufficient_credits',
    };
  }

  try {
    const result = await completeWithKey(resolvedProvider, managedKey, {
      system: safeSystem,
      user: safeUser,
      maxTokens: req.maxTokens ?? gov.maxContextTokens,
    });
    const filtered = filterModelOutput(result.text);
    const charged = Math.min(gov.maxCostCredits, Math.max(1, Math.ceil((result.inputUnits + result.outputUnits) / 1000)));
    await settleCredits(req.supabase, req.tenantId, reserve.reservationId, charged);
    await insertCostLedger(req.supabase, req.tenantId, req.userId, {
      provider: result.provider,
      model: result.model,
      providerPriceVersion: null,
      inputUnits: result.inputUnits,
      outputUnits: result.outputUnits,
      searchRequests: 0,
      retrievalRequests: 0,
      reasoningUnits: 0,
      cacheRead: 0,
      cacheWrite: 0,
      actualCost: null,
      reservedCost: gov.maxCostCredits,
      creditsCharged: charged,
      byoKey: false,
      taskId: null,
      reservationId: reserve.reservationId,
    });
    return {
      ok: true,
      text: filtered.text,
      byoKey: false,
      provider: result.provider,
      model: result.model,
      creditsCharged: charged,
      reservationId: reserve.reservationId,
      firewallRedactions: redactions,
      firewallFlags: filtered.flagged,
    };
  } catch (err) {
    await refundReservation(req.supabase, req.tenantId, reserve.reservationId);
    return {
      ok: false,
      byoKey: false,
      creditsCharged: 0,
      reservationId: reserve.reservationId,
      firewallRedactions: redactions,
      firewallFlags: [],
      error: redactSecrets(err instanceof Error ? err.message : 'managed complete failed'),
      code: 'managed_complete_failed',
    };
  }
}
