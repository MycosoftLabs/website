"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AncestryHome } from "@/components/ancestry/ancestry-home"
import { SpeciesExplorer } from "@/components/ancestry/species-explorer"
import { PhylogeneticTreeTool } from "@/components/ancestry/phylogenetic-tree-tool"
import { BiologicalTools } from "@/components/ancestry/biological-tools"
import { useSearchParams } from "next/navigation"

export default function AncestryApp() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") || "home"
  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Fungal Ancestry</h1>
        <p className="text-muted-foreground">
          Explore fungal species, their phylogenetic relationships, and genetic data
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 md:w-[600px]">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="explorer">Species Explorer</TabsTrigger>
          <TabsTrigger value="phylogeny">Phylogeny</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
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
        <TabsContent value="tools" className="space-y-4">
          <BiologicalTools />
        </TabsContent>
      </Tabs>
    </div>
  )
}
