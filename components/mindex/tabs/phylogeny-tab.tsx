"use client"

import { Dna, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glowing-border"
import { PhylogeneticTree } from "@/components/ancestry/phylogenetic-tree"

export function PhylogenySection() {
  return (
    <div className="space-y-6">
      <GlassCard color="purple" padding="p-2">
        <PhylogeneticTree height={550} showControls showLegend treeType="radial" />
      </GlassCard>

      <GlassCard color="purple">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Dna className="h-5 w-5 text-purple-400" />
              Ancestry Integration
            </h3>
            <p className="text-sm text-gray-400">DNA ancestry trees, genetic database, sequence alignment</p>
          </div>
          <Button variant="outline" size="sm" asChild className="border-purple-500/30 text-purple-300">
            <a href="/ancestry/phylogeny">
              Open Ancestry
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
