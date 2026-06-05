"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glowing-border"

import type { Taxon } from "./mindex-dashboard-types"

function contentHashPreview(t: Taxon): string | null {
  const m = t.metadata
  if (!m || typeof m !== "object") return null
  const rec = m as Record<string, unknown>
  const h = rec.content_hash ?? rec.content_hash_hex
  if (typeof h === "string" && h.length > 8) return `${h.slice(0, 10)}…`
  return null
}

export function SpeciesCard({ taxon, showProfileLink = true }: { taxon: Taxon; showProfileLink?: boolean }) {
  const hash = contentHashPreview(taxon)
  return (
    <GlassCard color="purple" className="hover:border-purple-400/40 transition-colors" padding="p-0">
      <div className="p-4 flex flex-col gap-3 min-h-[44px]">
        <div>
          <h4 className="font-semibold text-white text-base">{taxon.canonical_name}</h4>
          {taxon.common_name ? <p className="text-sm text-gray-400 mt-1">{taxon.common_name}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-purple-500/20 text-purple-300 border-none text-xs capitalize">{taxon.rank}</Badge>
          {taxon.kingdom ? (
            <Badge className="bg-green-500/20 text-green-300 border-none text-xs capitalize">{taxon.kingdom}</Badge>
          ) : null}
          <Badge className="bg-cyan-500/20 text-cyan-300 border-none text-xs">{taxon.source}</Badge>
          {hash ? (
            <Badge variant="outline" className="text-xs font-mono border-orange-500/40 text-orange-200">
              hash {hash}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-white/15 text-gray-400">
              No content hash in metadata
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-md bg-white/5 px-2 py-1">
            <p className="text-gray-500">Obs</p>
            <p className="font-mono text-cyan-200">{(taxon.obs_count ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-md bg-white/5 px-2 py-1">
            <p className="text-gray-500">Images</p>
            <p className="font-mono text-cyan-200">{(taxon.image_count ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-md bg-white/5 px-2 py-1">
            <p className="text-gray-500">Genomes</p>
            <p className="font-mono text-green-200">{(taxon.genome_count ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-md bg-white/5 px-2 py-1">
            <p className="text-gray-500">Compounds</p>
            <p className="font-mono text-green-200">{(taxon.compound_link_count ?? 0).toLocaleString()}</p>
          </div>
        </div>
        {showProfileLink ? (
          <Button asChild variant="secondary" className="w-full min-h-[44px] justify-center sm:w-auto sm:self-start">
            <Link href={`/natureos/mindex/species/${encodeURIComponent(taxon.id)}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Species profile
            </Link>
          </Button>
        ) : null}
      </div>
    </GlassCard>
  )
}
