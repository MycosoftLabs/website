"use client"

import { Activity, Dna } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glowing-border"
import {
  GenomeTrackViewerLazy as GenomeTrackViewer,
  CircosViewerLazy as CircosViewer,
  JBrowseViewerLazy as JBrowseViewer,
} from "@/components/mindex/lazy-viewers"

import type { MINDEXStats } from "./mindex-dashboard-types"

export function GenomicsSection({ stats }: { stats: MINDEXStats | null }) {
  const genomeCount = stats?.genome_records

  return (
    <div className="space-y-6">
      <JBrowseViewer className="bg-black/40 border-indigo-500/30" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GenomeTrackViewer className="bg-black/40 border-green-500/30" />
        <CircosViewer className="bg-black/40 border-purple-500/30" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard color="green">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Dna className="h-5 w-5 text-green-400" />
              Genome Browser
            </h3>
            <Badge className="bg-green-500/20 text-green-300 border-none">Gosling.js</Badge>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Interactive genome track visualization. Tracks and regions depend on the loaded assembly and MINDEX genome
            records.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-green-300 font-semibold">
                {genomeCount != null ? genomeCount.toLocaleString() : "—"}
              </div>
              <div className="text-gray-500">Genome records (MINDEX)</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-green-300 font-semibold">Browser</div>
              <div className="text-gray-500">Region from selection</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard color="green">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              Track Types
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-white/5 rounded">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <div>
                <div className="text-sm text-white">Predicted Genes</div>
                <div className="text-xs text-gray-500">Gene annotations with strand direction</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-white/5 rounded">
              <div className="w-3 h-3 rounded-sm bg-amber-500" />
              <div>
                <div className="text-sm text-white">Genetic Variants</div>
                <div className="text-xs text-gray-500">SNPs and structural variations</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-white/5 rounded">
              <div className="w-3 h-3 rounded-sm bg-purple-500" />
              <div>
                <div className="text-sm text-white">Expression Levels</div>
                <div className="text-xs text-gray-500">RNA-seq coverage plots</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-white/5 rounded">
              <div className="w-3 h-3 rounded-sm bg-cyan-500" />
              <div>
                <div className="text-sm text-white">Functional Annotations</div>
                <div className="text-xs text-gray-500">Gene clusters and regions</div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
