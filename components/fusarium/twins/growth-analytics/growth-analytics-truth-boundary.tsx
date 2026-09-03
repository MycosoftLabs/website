"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

const INHERITED_PROVIDER_CLAIM = "Connected to NatureOS, MAS, MINDEX, and MycoBrain telemetry."
const FUSARIUM_PROVIDER_TRUTH = "Fusarium evidence workbench. Providers are shown only when their records pass the local contract."

export function GrowthAnalyticsTruthBoundary({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    for (const node of root.querySelectorAll("p")) {
      if (node.textContent?.trim() === INHERITED_PROVIDER_CLAIM) node.textContent = FUSARIUM_PROVIDER_TRUTH
    }
    setReady(true)
  }, [])

  return <div ref={rootRef} hidden={!ready} aria-hidden={ready ? undefined : "true"} data-growth-truth-ready={ready ? "true" : "false"}>{children}</div>
}
