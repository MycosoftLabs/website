"use server"

import { NextRequest } from "next/server"

import { recordApiUsage } from "@/lib/stripe/billing"
import { API_USAGE_PRICING, ApiUsageType } from "@/lib/stripe/config"
import { createAdminClient, createClient } from "@/lib/supabase/server"

interface RecordUsageOptions {
  request: NextRequest
  usageType: ApiUsageType
  quantity?: number
  metadata?: Record<string, unknown>
}

function isValidUsageType(usageType: ApiUsageType) {
  return Object.prototype.hasOwnProperty.call(API_USAGE_PRICING, usageType)
}

export async function recordUsageFromRequest({
  request,
  usageType,
  quantity = 1,
  metadata,
}: RecordUsageOptions) {
  if (!isValidUsageType(usageType)) return

  try {
    const supabase = await createClient()
    const admin = await createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    let userId = user?.id ?? null

    if (!userId) {
      const apiKey = request.headers.get("x-api-key")
      if (apiKey) {
        const { data: apiKeyData } = await admin
          .from("api_keys")
          .select("user_id")
          .eq("key", apiKey)
          .eq("active", true)
          .single()
        userId = apiKeyData?.user_id ?? null
      }
    }

    if (!userId) return

    const { error: usageError } = await admin.from("api_usage").insert({
      user_id: userId,
      usage_type: usageType,
      quantity,
      metadata,
    })

    if (usageError) {
      console.error("API usage insert error:", usageError)
    }

    // Determine cost in cents (fallback to 1 cent per request if undefined)
    const costCents = (API_USAGE_PRICING[usageType]?.pricePerCall || 0.01) * 100 * quantity;

    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id, balance_cents, is_agent")
      .eq("id", userId)
      .single()

    if (profile?.stripe_customer_id) {
      // Traditional Fiat Billing
      await recordApiUsage(profile.stripe_customer_id, usageType, quantity)
    } else if (profile?.is_agent && profile.balance_cents >= costCents) {
      // Web3 Cryptocurrency / Token Deduction
      const newBalance = profile.balance_cents - costCents;
      await admin.from("profiles").update({ balance_cents: newBalance }).eq("id", userId);
      
      // Also log the cost to the agent's current active session if one exists
      const { error: rpcErr } = await admin.rpc('increment_agent_session_cost', { 
        p_profile_id: userId, 
        p_cost_cents: costCents, 
        p_tokens_used: quantity 
      });
      if (rpcErr) console.warn('Could not increment agent session cost', rpcErr);
    } else if (profile?.is_agent && profile.balance_cents < costCents) {
      console.error(`INSUFFICIENT_FUNDS: Agent ${userId} attempted API usage but lacks sufficient crypto balance.`);
    }
  } catch (error) {
    console.error("Usage metering error:", error)
  }
}
