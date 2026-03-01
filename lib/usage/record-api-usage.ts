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

    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single()

    if (profile?.stripe_customer_id) {
      await recordApiUsage(profile.stripe_customer_id, usageType, quantity)
    }
  } catch (error) {
    console.error("Usage metering error:", error)
  }
}
