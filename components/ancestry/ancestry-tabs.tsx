"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AncestryExplorer } from "@/components/ancestry/ancestry-explorer"
import { AncestryHome } from "@/components/ancestry/ancestry-home"
import { PhylogeneticTreeTool } from "@/components/ancestry/phylogenetic-tree-tool"
import { DatabaseTools } from "@/components/ancestry/database-tools"
import { BiologicalTools } from "@/components/ancestry/biological-tools"
import { SpeciesExplorer } from "@/components/ancestry/species-explorer"

export function AncestryTabs() {
  return (
    <Tabs defaultValue="home" className="w-full">
      <TabsList>
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
        <TabsTrigger value="explorer">Species Explorer</TabsTrigger>
        <TabsTrigger value="phylogeny">Phylogeny</TabsTrigger>
        <TabsTrigger value="database">Database</TabsTrigger>
      </TabsList>

      <TabsContent value="home" className="space-y-4">
        <AncestryHome />
      </TabsContent>

      <TabsContent value="explorer" className="space-y-4">
        <SpeciesExplorer />
      </TabsContent>

      <TabsContent value="phylogeny" className="space-y-4">
        <PhylogeneticTreeTool />
      </TabsContent>

      <TabsContent value="database" className="space-y-4">
        <DatabaseTools />
      </TabsContent>

      <TabsContent value="tools" className="space-y-4">
        <AncestryExplorer />
        <BiologicalTools />
      </TabsContent>
    </Tabs>
  )
}
