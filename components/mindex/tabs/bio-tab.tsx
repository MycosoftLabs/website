"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlassCard } from "@/components/ui/glowing-border"

import type { MINDEXStats } from "./mindex-dashboard-types"
import { PhylogenySection } from "./phylogeny-tab"
import { GenomicsSection } from "./genomics-tab"
import { SequenceToolsPanel } from "./sequence-tools-panel"

export function BioSection({ stats }: { stats: MINDEXStats | null }) {
  return (
    <div className="space-y-4">
      <GlassCard color="purple">
        <p className="text-sm text-gray-400 mb-4">
          Tree of life, genome browsers, sequence tooling, and comparative views — unified from the former Phylogeny +
          Genomics tabs. Data is loaded from live ancestry / MINDEX routes inside each sub-panel (no placeholder catalog).
        </p>
        <Tabs defaultValue="tree" className="w-full">
          <TabsList className="grid w-full grid-cols-1 gap-1 bg-white/5 p-1 h-auto min-h-[48px] sm:grid-cols-3 sm:inline-flex sm:w-auto">
            <TabsTrigger value="tree" className="min-h-[44px] text-base sm:text-sm">
              Tree of life
            </TabsTrigger>
            <TabsTrigger value="genomics" className="min-h-[44px] text-base sm:text-sm">
              Genomics
            </TabsTrigger>
            <TabsTrigger value="sequence" className="min-h-[44px] text-base sm:text-sm">
              Sequence tools
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tree" className="mt-4">
            <PhylogenySection />
          </TabsContent>
          <TabsContent value="genomics" className="mt-4">
            <GenomicsSection stats={stats} />
          </TabsContent>
          <TabsContent value="sequence" className="mt-4">
            <SequenceToolsPanel />
          </TabsContent>
        </Tabs>
      </GlassCard>
    </div>
  )
}
