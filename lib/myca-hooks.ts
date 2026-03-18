import type { SupabaseClient } from '@supabase/supabase-js'

interface FireEventParams {
  profile_id: string
  api_key_id?: string
  event_type: string
  severity?: 'info' | 'warn' | 'error' | 'critical'
  message: string
  metadata?: Record<string, unknown>
}

/**
 * Insert an agent event record.
 */
export async function fireAgentEvent(
  supabase: SupabaseClient,
  params: FireEventParams
) {
  const { error } = await supabase.from('agent_events').insert({
    profile_id: params.profile_id,
    api_key_id: params.api_key_id || null,
    event_type: params.event_type,
    severity: params.severity || 'info',
    message: params.message,
    metadata: params.metadata || {},
  })
  if (error) {
    console.error('[myca-hooks] Failed to fire event:', error.message)
  }
}

/**
 * Check balance and fire balance_low / balance_exhausted events if thresholds crossed.
 */
export async function checkAndFireBalanceAlerts(
  supabase: SupabaseClient,
  profile_id: string,
  balance_cents: number,
  api_key_id?: string
) {
  if (balance_cents <= 0) {
    await fireAgentEvent(supabase, {
      profile_id,
      api_key_id,
      event_type: 'balance_exhausted',
      severity: 'critical',
      message: 'Balance exhausted. API access suspended until top-up.',
      metadata: { balance_cents },
    })
  } else if (balance_cents <= 100) {
    await fireAgentEvent(supabase, {
      profile_id,
      api_key_id,
      event_type: 'balance_low',
      severity: 'warn',
      message: `Low balance: $${(balance_cents / 100).toFixed(2)} remaining.`,
      metadata: { balance_cents },
    })
  }
}

/**
 * Retrieve upsell message for an event type.
 */
export async function getUpsellForEvent(
  supabase: SupabaseClient,
  event_type: string,
  balance_cents: number
): Promise<{ title: string; message: string; action_url: string; action_label: string } | null> {
  const { data } = await supabase.rpc('get_upsell_message', {
    p_event_type: event_type,
    p_balance_cents: balance_cents,
  })
  return data || null
}
