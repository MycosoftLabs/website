/**
 * Species detail page — looked up by scientific name.
 * Used when only the species name is available (no numeric taxon ID).
 *
 * Resolves the iNaturalist taxon ID via the taxa search API, then
 * redirects to /ancestry/species/{id} for the full detail view.
 */

"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function SpeciesByNamePage() {
  const params = useParams()
  const router = useRouter()

  const name = decodeURIComponent(String(params.name || ""))

  useEffect(() => {
    if (!name) return

    // Search iNaturalist for this scientific name, get the taxon ID, then redirect
    fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(name)}&rank=species,genus,family&per_page=1&is_active=true`,
      { signal: AbortSignal.timeout(10000) }
    )
      .then((r) => r.json())
      .then((d) => {
        const taxon = d?.results?.[0]
        if (taxon?.id) {
          // Redirect to the canonical species detail page
          router.replace(`/ancestry/species/${taxon.id}`)
        } else {
          // Nothing found — show explorer search as fallback
          router.replace(`/ancestry/explorer?search=${encodeURIComponent(name)}`)
        }
      })
      .catch(() => {
        router.replace(`/ancestry/explorer?search=${encodeURIComponent(name)}`)
      })
  }, [name, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm">Looking up <span className="italic font-medium text-foreground">{name}</span>…</p>
    </div>
  )
}
