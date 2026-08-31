/**
 * Prepaid Mycosoft-hosted envelope sends — marked-up SKU, never free platform JWT.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function grantEnvelopeSendCredit(
  svc: SupabaseClient,
  input: { tenantId: string; sku: string; eventId: string },
): Promise<{ granted: string; sku: string }> {
  const { error } = await svc.from('launchpad_envelope_credits').insert({
    tenant_id: input.tenantId,
    sku: input.sku,
    status: 'unredeemed',
    stripe_event_id: input.eventId,
  });
  if (error) throw new Error(error.message);
  return { granted: 'envelope_send', sku: input.sku };
}

export async function unredeemedEnvelopeCredits(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('launchpad_envelope_credits')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'unredeemed');
  if (error) return 0;
  return data?.length ?? 0;
}

export async function consumeEnvelopeSendCredit(
  svc: SupabaseClient,
  tenantId: string,
): Promise<{ ok: true; creditId: string } | { ok: false; code: string; error: string }> {
  const { data, error } = await svc
    .from('launchpad_envelope_credits')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'unredeemed')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false, code: 'envelope_credit_read_failed', error: error.message };
  if (!data?.id) {
    return {
      ok: false,
      code: 'envelope_sku_required',
      error: 'Buy the hosted envelope SKU before sending with Mycosoft DocuSign.',
    };
  }
  const { data: updated, error: updErr } = await svc
    .from('launchpad_envelope_credits')
    .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
    .eq('id', data.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'unredeemed')
    .select('id')
    .maybeSingle();
  if (updErr || !updated) {
    return { ok: false, code: 'envelope_credit_race', error: 'Envelope credit was already used.' };
  }
  return { ok: true, creditId: updated.id };
}
