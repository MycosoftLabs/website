// components/ancestry/phylogenetic-tree-tool.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import PhylogenyVisualization from "@/app/ancestry/phylogeny/3d-visualization"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function PhylogeneticTreeTool() {
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(null)
  const [dataSource, setDataSource] = useState("itol")

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Phylogenetic Tree Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Visualize the phylogenetic relationships between fungal species.
          </p>
          <div className="flex gap-2">
            <Select value={dataSource} onValueChange={setDataSource}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Data Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="itol">iTOL</SelectItem>
                <SelectItem value="phylopic">PhyloPic</SelectItem>
                <SelectItem value="ncbi">NCBI Tree Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">View Phylogenetic Tree</Button>
          </div>
          <PhylogenyVisualization rootSpeciesId={47170} />
        </CardContent>
      </Card>
    </div>
  )
}
