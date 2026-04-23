/**
 * Worldview "company" scope gate — Apr 23, 2026
 *
 * Morgan: "having all of it on for anyone with a mycosoft.org email
 * only for now 'Company view' so we can test that live now".
 *
 * A caller is granted the `company` scope if ANY of:
 *   1. Their Supabase JWT email ends in @mycosoft.org / @mycosoft.com
 *   2. Their agent_api_keys.scopes array contains "company"
 *   3. Their scopes contain "fusarium" or "ops" (inherit down)
 *
 * This module exports the resolver + visibility-gate helper. Used by
 * lib/worldview/middleware.ts runWithEnvelope() and by the device
 * dataset handlers that need to further filter device IDs per MYCA
 * policy.
 */

import { createClient } from "@supabase/supabase-js"
import type { AgentProfile } from "@/lib/agent-auth"
import type { WorldviewScope } from "./registry"

let _admin: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (_admin) return _admin
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  return _admin
}

const COMPANY_EMAIL_DOMAINS = [
  "mycosoft.org",
  "mycosoft.com",
  "mycodao.org",
]

/**
 * Returns the highest scope the caller is entitled to, based on the
 * combination of:
 *   - profile.email domain (Supabase JWT)
 *   - profile.scopes array (agent_api_keys.scopes)
 *   - hardcoded ops allowlist (env OPS_EMAILS, comma-separated)
 *
 * Unauthenticated callers return `public`.
 */
export function resolveEffectiveScope(profile: AgentProfile | null): WorldviewScope {
  if (!profile) return "public"
  const p = profile as any

  // Scopes array takes precedence
  const scopes: string[] = Array.isArray(p.scopes) ? p.scopes : []
  if (scopes.includes("ops")) return "ops"
  if (scopes.includes("fusarium")) return "fusarium"
  if (scopes.includes("company")) return "company"

  // Email domain gate — promotes agent → company when the JWT email
  // matches the company domain list.
  const email: string | undefined = p.email || p.user_email || p.profile?.email
  if (email && typeof email === "string") {
    const lower = email.toLowerCase()
    if (COMPANY_EMAIL_DOMAINS.some((d) => lower.endsWith(`@${d}`))) {
      return "company"
    }
    // Ops email allowlist from env
    const opsList = (process.env.OPS_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    if (opsList.includes(lower)) return "ops"
  }

  return "agent"
}

// ─── MYCA device visibility gate ─────────────────────────────────────
//
// Shape of the `myca_device_visibility` table (see
// supabase/migrations/20260423_device_visibility.sql):
//   device_id text PRIMARY KEY
//   visible_scopes text[]                    -- who can see this device
//   hidden_until timestamptz NULL            -- MYCA emergency hide
//   managed_by text                          -- 'myca' | 'user' | 'system'
//   updated_at timestamptz
//   reason text
//
// Default: a device NOT in the table is visible to `company` and above.
// A device with visible_scopes=['ops'] is only visible to ops.
// A device with hidden_until in the future is hidden for everyone
// below `ops`.

export interface VisibilityPolicy {
  device_id: string
  visible_scopes: WorldviewScope[]
  hidden_until: string | null
  managed_by: string
  reason?: string | null
}

let _policyCache: { at: number; map: Map<string, VisibilityPolicy> } | null = null
const POLICY_CACHE_MS = 15_000

async function loadPolicies(): Promise<Map<string, VisibilityPolicy>> {
  const now = Date.now()
  if (_policyCache && now - _policyCache.at < POLICY_CACHE_MS) return _policyCache.map
  try {
    const admin = getAdmin() as any
    const { data, error } = await admin
      .from("myca_device_visibility")
      .select("device_id, visible_scopes, hidden_until, managed_by, reason")
    if (error) {
      console.warn("[worldview/company-auth] visibility load error:", error.message)
      return new Map()
    }
    const map = new Map<string, VisibilityPolicy>()
    for (const row of (data || []) as any[]) map.set(row.device_id, row)
    _policyCache = { at: now, map }
    return map
  } catch (err: any) {
    console.warn("[worldview/company-auth] visibility load threw:", err?.message)
    return new Map()
  }
}

/**
 * Filter a device list down to what the caller is entitled to see.
 * Non-device responses pass through unchanged.
 *
 * Default policy: device visible to `company` and above. MYCA can
 * narrow visibility per-device by writing to myca_device_visibility.
 */
export async function applyDeviceVisibility<T extends { id?: string; device_id?: string; mycobrain_id?: string }>(
  devices: T[],
  callerScope: WorldviewScope,
): Promise<T[]> {
  if (!devices?.length) return devices
  const policies = await loadPolicies()
  if (!policies.size) return devices // no MYCA policies set → all visible to company+

  const now = Date.now()
  const scopeTier = (s: WorldviewScope) => ({ public: 0, agent: 1, company: 2, fusarium: 3, ops: 4 }[s])
  const callerTier = scopeTier(callerScope)

  return devices.filter((d) => {
    const deviceId = (d.id || d.device_id || d.mycobrain_id || "").toString()
    if (!deviceId) return callerTier >= scopeTier("company") // default: company+
    const policy = policies.get(deviceId)
    if (!policy) return callerTier >= scopeTier("company") // default

    if (policy.hidden_until && new Date(policy.hidden_until).getTime() > now) {
      // MYCA emergency hide: only ops sees it
      return callerTier >= scopeTier("ops")
    }
    const vis = (policy.visible_scopes && policy.visible_scopes.length)
      ? policy.visible_scopes
      : (["company", "fusarium", "ops"] as WorldviewScope[])
    return vis.some((s) => callerTier >= scopeTier(s))
  })
}

/** Clear the in-memory cache — called when MYCA writes new policies. */
export function bustVisibilityCache(): void {
  _policyCache = null
}
