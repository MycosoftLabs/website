"use client"

import React, { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  List, Dna, CircleDot, Globe, Search, Loader2, ExternalLink,
} from "lucide-react"
import {
  GenomeTrackViewerLazy,
  CircosViewerLazy,
  JBrowseViewerLazy,
  SpeciesExplorerLazy,
} from "@/components/mindex/lazy-viewers"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Species list tab                                                          */
/* -------------------------------------------------------------------------- */

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
      <Card>
        <CardContent className="py-12 text-center">
          <List className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            No species data available — MINDEX API may be unreachable
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Expected at {process.env.NEXT_PUBLIC_MINDEX_API_URL ?? "MINDEX_API_URL"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Species Catalog
            <Badge variant="secondary" className="ml-2 text-xs">
              {species.length} records
            </Badge>
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter species…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Scientific Name</th>
                <th className="text-left px-4 py-2 font-medium">Common Name</th>
                <th className="text-left px-4 py-2 font-medium">Phylum</th>
                <th className="text-right px-4 py-2 font-medium">Observations</th>
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
                  <tr key={s.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 font-medium italic">{s.scientific_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{s.common_name ?? "—"}</td>
                    <td className="px-4 py-2">
                      {s.phylum ? (
                        <Badge variant="outline" className="text-xs">{s.phylum}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {s.observation_count?.toLocaleString() ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Showing first 100 of {filtered.length} results
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  Public client component                                                   */
/* -------------------------------------------------------------------------- */

export function MindexExplorerClient({ initialSpecies }: MindexExplorerClientProps) {
  const [activeTab, setActiveTab] = useState("species")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
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

      {/* Species list tab */}
      <TabsContent value="species">
        <SpeciesListTab species={initialSpecies} />
      </TabsContent>

      {/* Genome browser tab — uses the existing JBrowse viewer */}
      <TabsContent value="genome">
        <div className="grid grid-cols-1 gap-6">
          <GenomeTrackViewerLazy />
          <JBrowseViewerLazy />
        </div>
      </TabsContent>

      {/* Circular plot tab — uses the existing Circos viewer */}
      <TabsContent value="circos">
        <CircosViewerLazy />
      </TabsContent>

      {/* Spatial view tab — uses the existing Species Explorer (Vitessce) */}
      <TabsContent value="spatial">
        <SpeciesExplorerLazy className="border" />
      </TabsContent>
    </Tabs>
  )
}
