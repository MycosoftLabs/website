/**
 * Reserve-then-settle AI credit flow.
 * BYO calls skip this module (credits_charged = 0) but still write the cost ledger.
 */

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLaunchpadServiceClient } from '@/lib/launchpad/service-client';
import type { CostLedgerInput } from './types';

export interface ReserveResult {
  ok: boolean;
  reservationId?: string;
  remaining?: number;
  error?: string;
  code?: string;
}

export async function reserveCredits(
  supabase: SupabaseClient,
  tenantId: string,
  amount: number,
  reason: string,
  ref: Record<string, unknown> = {},
): Promise<ReserveResult> {
  if (amount <= 0) return { ok: true, reservationId: randomUUID(), remaining: undefined };
  const reservationId = randomUUID();
  const { data, error } = await supabase.rpc('launchpad_reserve_credits', {
    t: tenantId,
    amount,
    p_reason: reason,
    p_reservation_id: reservationId,
    p_ref: ref,
  });
  if (error) {
    const msg = error.message || 'reserve failed';
    const insufficient = /insufficient credits/i.test(msg);
    return {
      ok: false,
      error: msg,
      code: insufficient ? 'insufficient_credits' : 'reserve_failed',
    };
  }
  return { ok: true, reservationId, remaining: typeof data === 'number' ? data : undefined };
}

export async function settleCredits(
  supabase: SupabaseClient,
  tenantId: string,
  reservationId: string,
  actualAmount: number,
): Promise<{ ok: boolean; remaining?: number; error?: string }> {
  const { data, error } = await supabase.rpc('launchpad_settle_credits', {
    t: tenantId,
    p_reservation_id: reservationId,
    p_actual: actualAmount,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, remaining: typeof data === 'number' ? data : undefined };
}

export async function refundReservation(
  supabase: SupabaseClient,
  tenantId: string,
  reservationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('launchpad_refund_reservation', {
    t: tenantId,
    p_reservation_id: reservationId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function insertCostLedger(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string | null,
  input: CostLedgerInput,
): Promise<void> {
  const svc = createLaunchpadServiceClient();
  const { error } = await svc.from('launchpad_ai_cost_ledger').insert({
    tenant_id: tenantId,
    user_id: userId,
    task: input.taskId?.trim() || 'unattributed',
    provider: input.provider,
    model: input.model,
    provider_price_version: input.providerPriceVersion,
    input_units: input.inputUnits,
    output_units: input.outputUnits,
    search_requests: input.searchRequests,
    retrieval_requests: input.retrievalRequests,
    reasoning_units: input.reasoningUnits,
    cache_read: input.cacheRead,
    cache_write: input.cacheWrite,
    actual_cost_cents: input.actualCost,
    reserved_cost_cents: input.reservedCost,
    credits_charged: input.creditsCharged,
    byo_key: input.byoKey,
    ref: input.reservationId ? { reservation_id: input.reservationId } : {},
  });
  if (error) {
    console.error('[launchpad/ai] cost ledger insert failed:', error.message);
  }
}
