"use client"

import React, { useState } from "react"
import { CircleDot, Dna, Globe, List, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CircosViewerLazy,
  GenomeTrackViewerLazy,
  JBrowseViewerLazy,
  SpeciesExplorerLazy,
} from "@/components/mindex/lazy-viewers"

interface SpeciesRecord {
  id: string
  scientific_name: string
  common_name?: string
  kingdom?: string
  phylum?: string
  observation_count?: number
}

interface MindexExplorerClientProps {
  initialSpecies: SpeciesRecord[]
}

function SpeciesListTab({ species }: { species: SpeciesRecord[] }) {
  const [query, setQuery] = useState("")

  const filtered = species.filter((s) => {
    const q = query.toLowerCase()
    return (
      s.scientific_name?.toLowerCase().includes(q) ||
      s.common_name?.toLowerCase().includes(q) ||
      s.phylum?.toLowerCase().includes(q)
    )
  })

  if (species.length === 0) {
    return (
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardContent className="py-12 text-center">
          <List className="mx-auto mb-3 h-10 w-10 text-orange-400" />
          <p className="mb-2 text-lg font-semibold text-orange-300">Species catalog is waiting for live rows</p>
          <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">
            MINDEX will show the all-life species list here when catalog rows are available. Observations, media,
            genetics, and chemistry can still be explored from the main MINDEX app.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">
            Species Catalog
            <Badge variant="secondary" className="ml-2 text-xs">
              {species.length} records
            </Badge>
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter species..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Scientific Name</th>
                <th className="px-4 py-2 text-left font-medium">Common Name</th>
                <th className="px-4 py-2 text-left font-medium">Phylum</th>
                <th className="px-4 py-2 text-right font-medium">Observations</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No matching species
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 100).map((s) => (
                  <tr key={s.id} className="border-t transition-colors hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium italic">{s.scientific_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{s.common_name ?? "-"}</td>
                    <td className="px-4 py-2">
                      {s.phylum ? (
                        <Badge variant="outline" className="text-xs">
                          {s.phylum}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {s.observation_count?.toLocaleString() ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Showing first 100 of {filtered.length} results
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function MindexExplorerClient({ initialSpecies }: MindexExplorerClientProps) {
  const [activeTab, setActiveTab] = useState("species")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="species" className="gap-2">
          <List className="h-4 w-4" />
          Species List
        </TabsTrigger>
        <TabsTrigger value="genome" className="gap-2">
          <Dna className="h-4 w-4" />
          Genome Browser
        </TabsTrigger>
        <TabsTrigger value="circos" className="gap-2">
          <CircleDot className="h-4 w-4" />
          Circular Plot
        </TabsTrigger>
        <TabsTrigger value="spatial" className="gap-2">
          <Globe className="h-4 w-4" />
          Spatial View
        </TabsTrigger>
      </TabsList>

      <TabsContent value="species">
        <SpeciesListTab species={initialSpecies} />
      </TabsContent>

      <TabsContent value="genome">
        <div className="grid grid-cols-1 gap-6">
          <GenomeTrackViewerLazy />
          <JBrowseViewerLazy />
        </div>
      </TabsContent>

      <TabsContent value="circos">
        <CircosViewerLazy />
      </TabsContent>

      <TabsContent value="spatial">
        <SpeciesExplorerLazy className="border" />
      </TabsContent>
    </Tabs>
  )
}
