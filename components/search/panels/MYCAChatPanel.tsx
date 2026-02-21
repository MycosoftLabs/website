"use client"

/**
 * DEPRECATED: Search MYCAChatPanel
 * Uses the unified MYCA chat widget with search context injection.
 */

import { useMemo } from "react"
import { MYCAChatWidget } from "@/components/myca/MYCAChatWidget"
import { useSearchContext } from "../SearchContextProvider"

export function MYCAChatPanel() {
  const ctx = useSearchContext()

  const getContextText = useMemo(() => {
    return () => {
      const parts: string[] = []
      if (ctx.query) parts.push(`current search: ${ctx.query}`)
      if (ctx.species.length) {
        parts.push(`species in view: ${ctx.species.slice(0, 3).map((s) => s.scientificName).join(", ")}`)
      }
      if (ctx.compounds.length) {
        parts.push(`compounds in view: ${ctx.compounds.slice(0, 3).map((c) => c.name).join(", ")}`)
      }
      if (ctx.genetics.length) {
        parts.push(`genetics in view: ${ctx.genetics.slice(0, 3).map((g) => g.name).join(", ")}`)
      }
      if (ctx.research.length) {
        parts.push(`papers in view: ${ctx.research.slice(0, 3).map((r) => r.title).join(", ")}`)
      }
      return parts.length ? `Search context: ${parts.join("; ")}` : ""
    }
  }, [ctx])

  return <MYCAChatWidget getContextText={getContextText} />
}
