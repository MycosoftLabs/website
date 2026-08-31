/**
 * Dual-meter AI router.
 * BYO: decrypt in-process, credits_charged=0.
 * Managed (including MYCA / Nemotron): reserve-then-settle platform credits.
 * Prompt firewall applies to both. Keys never appear in responses or logs.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import { sanitizeForModel, filterModelOutput } from '@/lib/launchpad/prompt-firewall';
import { envelopeDecrypt, envelopeFromCustodyRow, redactSecrets } from '@/lib/launchpad/crypto/envelope';
import { governanceFor, maxPromptChars, type AiTaskType } from './governance';
import { completeWithKey, managedKeyFor } from './providers';
import { completeWithMas } from './mas-fallback';
import { insertCostLedger, refundReservation, reserveCredits, settleCredits } from './metering';
import { estimateReserveCredits, quoteCredits } from './price-book';
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
  'id, provider, mode, status, key_last4, label, last_verified_at, created_at, revoked_at, key_kms_key_id';

const MATERIAL_COLUMNS =
  'id, provider, mode, status, key_ciphertext, key_dek_wrapped, key_kms_key_id';

async function loadByoMaterial(
  tenantId: string,
  provider?: AiProvider,
) {
  const svc = createLaunchpadServiceClient();
  let q = svc
    .from('launchpad_ai_connections')
    .select(MATERIAL_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('mode', 'byo')
    .in('status', ['active', 'verified'])
    .is('revoked_at', null);
  if (provider && provider !== 'myca' && provider !== 'nemotron') q = q.eq('provider', provider);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error || !data) return null;
  const blob = envelopeFromCustodyRow(data as Parameters<typeof envelopeFromCustodyRow>[0]);
  if (!blob) return null;
  return { id: data.id as string, provider: data.provider as string, blob };
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
  const connections = (data ?? []).map((row) => ({
    id: row.id,
    provider: row.provider,
    mode: row.mode,
    status: row.status,
    displayPrefix: row.key_last4 ? `…${row.key_last4}` : null,
    label: row.label,
    lastVerifiedAt: row.last_verified_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
    kmsKeyId: row.key_kms_key_id,
  }));
  return { ok: true as const, connections };
}

function defaultModel(provider: AiProvider): string {
  if (provider === 'anthropic') return 'claude-sonnet-4-5';
  if (provider === 'openai') return 'gpt-4o';
  if (provider === 'perplexity') return 'sonar-pro';
  if (provider === 'xai') return 'grok-2-latest';
  if (provider === 'nemotron') {
    return process.env.NVIDIA_NIM_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct';
  }
  if (provider === 'myca') return 'myca';
  return '*';
}

function pickManaged(preferred?: AiProvider): {
  provider: AiProvider;
  key: string | null;
  viaMas: boolean;
} {
  const nim = managedKeyFor('nemotron');
  if (preferred === 'myca') return { provider: 'myca', key: null, viaMas: true };
  if (preferred === 'nemotron' && nim) return { provider: 'nemotron', key: nim, viaMas: false };
  if (preferred && isInferenceProvider(preferred) && preferred !== 'myca' && preferred !== 'nemotron') {
    const key = managedKeyFor(preferred);
    if (key) return { provider: preferred, key, viaMas: false };
  }
  if (nim) return { provider: 'nemotron', key: nim, viaMas: false };
  const order: AiProvider[] = ['anthropic', 'openai', 'xai', 'perplexity'];
  for (const p of order) {
    const key = managedKeyFor(p);
    if (key) return { provider: p, key, viaMas: false };
  }
  return { provider: 'myca', key: null, viaMas: true };
}

export async function routeCompletion(req: RouterRequest): Promise<RouterResult> {
  const gov = governanceFor(req.taskType);
  const submittedChars = (req.system?.length ?? 0) + (req.user?.length ?? 0);
  const maxChars = maxPromptChars(req.taskType);
  if (submittedChars > maxChars) {
    return {
      ok: false,
      byoKey: false,
      creditsCharged: 0,
      firewallRedactions: 0,
      firewallFlags: [],
      error: `Prompt is ${submittedChars} characters; max for this task is ${maxChars}. Provider was not called.`,
      code: 'prompt_too_large',
    };
  }
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
      key = envelopeDecrypt(byo.blob);
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
        taskId: gov.taskType,
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

  const picked = pickManaged(preferred);
  const modelForQuote = defaultModel(picked.provider);
  const estInput = Math.max(1, Math.ceil((safeSystem.length + safeUser.length) / 4));
  const estOutput = req.maxTokens ?? Math.min(1024, gov.maxContextTokens);
  const reserveQuote = estimateReserveCredits(
    {
      provider: picked.provider,
      model: modelForQuote,
      inputUnits: estInput,
      outputUnits: estOutput,
    },
    gov.maxCostCredits,
  );
  if (!reserveQuote.ok) {
    return {
      ok: false,
      byoKey: false,
      creditsCharged: 0,
      firewallRedactions: redactions,
      firewallFlags: [],
      error: reserveQuote.error,
      code: reserveQuote.code,
    };
  }

  const reserve = await reserveCredits(
    req.supabase,
    req.tenantId,
    reserveQuote.credits,
    `spend:${gov.taskType}`,
    { taskType: gov.taskType, provider: picked.provider },
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
    let result: {
      text: string;
      provider: string;
      model: string;
      inputUnits: number;
      outputUnits: number;
    };
    if (picked.viaMas) {
      const mas = await completeWithMas(
        { system: safeSystem, user: safeUser, maxTokens: req.maxTokens ?? gov.maxContextTokens },
        req.userId,
      );
      if ('ok' in mas) {
        await refundReservation(req.supabase, req.tenantId, reserve.reservationId);
        return {
          ok: false,
          byoKey: false,
          creditsCharged: 0,
          firewallRedactions: redactions,
          firewallFlags: [],
          error: mas.error || 'No managed AI provider configured, no verified BYO connection, and MYCA is unavailable.',
          code: mas.code || 'no_provider',
        };
      }
      result = mas;
    } else {
      result = await completeWithKey(picked.provider, picked.key as string, {
        system: safeSystem,
        user: safeUser,
        maxTokens: req.maxTokens ?? gov.maxContextTokens,
        model: modelForQuote,
      });
    }
    const filtered = filterModelOutput(result.text);
    const quoted = quoteCredits({
      provider: result.provider,
      model: result.model,
      inputUnits: result.inputUnits,
      outputUnits: result.outputUnits,
    });
    if (!quoted.ok) {
      await refundReservation(req.supabase, req.tenantId, reserve.reservationId);
      return {
        ok: false,
        byoKey: false,
        creditsCharged: 0,
        reservationId: reserve.reservationId,
        firewallRedactions: redactions,
        firewallFlags: [],
        error: quoted.error,
        code: quoted.code,
      };
    }
    const charged = Math.min(reserveQuote.credits, Math.max(1, quoted.credits));
    await settleCredits(req.supabase, req.tenantId, reserve.reservationId, charged);
    await insertCostLedger(req.supabase, req.tenantId, req.userId, {
      provider: result.provider,
      model: result.model,
      providerPriceVersion: quoted.version,
      inputUnits: result.inputUnits,
      outputUnits: result.outputUnits,
      searchRequests: 0,
      retrievalRequests: 0,
      reasoningUnits: 0,
      cacheRead: 0,
      cacheWrite: 0,
      actualCost: quoted.actualCents,
      reservedCost: reserveQuote.credits,
      creditsCharged: charged,
      byoKey: false,
      taskId: gov.taskType,
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
