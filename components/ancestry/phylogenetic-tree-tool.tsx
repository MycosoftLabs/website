// components/ancestry/phylogenetic-tree-tool.tsx
"use client"

import { Button } from "@/components/ui/button"

export function PhylogeneticTreeTool() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Visualize phylogenetic trees from various data sources.</p>
      <Button variant="outline">View Phylogenetic Tree</Button>
    </div>
  )
}
