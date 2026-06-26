/**
 * RECONSTRUCTED faithful shim (see lib/geo/crep-map-fly-to.ts header). The globe-engine React
 * context Cursor extracted. CREPDashboardLoader wraps the dashboard in <EarthGlobeEngineProvider
 * engine={...}>; useEarthGlobeEngine() reads that context and getGlobeEngine() reads a window
 * mirror the provider sets (so non-React call sites stay correct). Defaults to "legacy".
 * Cursor's real version supersedes on sync.
 */
import { createContext, createElement, useContext, useEffect, type ReactNode } from "react"

export type GlobeEngine = "legacy" | "v3"

const EarthGlobeEngineContext = createContext<GlobeEngine>("legacy")

/** Non-React accessor (used by perf gates / boot). Mirrors the provider's value via a window flag. */
export function getGlobeEngine(): GlobeEngine {
  if (typeof window !== "undefined") {
    const e = (window as unknown as { __crep_globe_engine?: string }).__crep_globe_engine
    if (e === "v3") return "v3"
  }
  return "legacy"
}

export function EarthGlobeEngineProvider({
  engine,
  children,
}: {
  engine?: GlobeEngine
  children: ReactNode
}) {
  const value: GlobeEngine = engine === "v3" ? "v3" : "legacy"
  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as unknown as { __crep_globe_engine?: string }).__crep_globe_engine = value
    }
  }, [value])
  return createElement(EarthGlobeEngineContext.Provider, { value }, children)
}

export function useEarthGlobeEngine(): GlobeEngine {
  return useContext(EarthGlobeEngineContext)
}
