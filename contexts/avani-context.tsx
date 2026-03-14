"use client"

/**
 * AVANI Context Provider
 *
 * Provides global governance state from Avani (the stewardship layer)
 * to the entire application. Runs in the background alongside MYCA,
 * polling governance status and making evaluation results available
 * to any component that needs them.
 *
 * Yin (AVANI) to Yang (MYCA) — she governs while MYCA executes.
 *
 * When the standalone `avani` repo/service is deployed, this context
 * will connect to the full Avani backend with weights, constitution,
 * memory, soul, and persona.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export interface AvaniGovernanceStatus {
  active: boolean
  mode: "background" | "interactive" | "strict"
  constitution_version: string
  rules_loaded: number
  evaluations_total: number
  denials_total: number
  approvals_requiring_audit: number
  backend_connected: boolean
  last_verdict: string | null
  last_risk_tier: string | null
}

export interface AvaniContextValue {
  /** Whether Avani governance is active */
  active: boolean
  /** Current governance status */
  status: AvaniGovernanceStatus | null
  /** Whether the standalone Avani backend is connected */
  backendConnected: boolean
  /** Last governance verdict for the most recent interaction */
  lastVerdict: string | null
  /** Last risk tier */
  lastRiskTier: string | null
  /** Refresh governance status */
  refresh: () => Promise<void>
}

const AvaniContext = createContext<AvaniContextValue | null>(null)

export function AvaniProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AvaniGovernanceStatus | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/avani/status", {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      })
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch {
      // Avani status check is best-effort — never block the UI
    }
  }, [])

  // Poll governance status every 30 seconds (matches MYCA consciousness polling)
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const value = useMemo<AvaniContextValue>(
    () => ({
      active: status?.active ?? true,
      status,
      backendConnected: status?.backend_connected ?? false,
      lastVerdict: status?.last_verdict ?? null,
      lastRiskTier: status?.last_risk_tier ?? null,
      refresh: fetchStatus,
    }),
    [status, fetchStatus]
  )

  return <AvaniContext.Provider value={value}>{children}</AvaniContext.Provider>
}

export function useAvani(): AvaniContextValue {
  const context = useContext(AvaniContext)
  if (!context) {
    throw new Error("useAvani must be used within AvaniProvider")
  }
  return context
}

/** Optional Avani context — returns null if not within AvaniProvider */
export function useOptionalAvani(): AvaniContextValue | null {
  return useContext(AvaniContext)
}
