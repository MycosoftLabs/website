"use client"

import { Button } from "@/components/ui/button"

export function DNAVisualizerTool() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Visualize DNA sequences using an external tool.</p>
      <Button variant="outline" asChild>
        <a href="https://dnavisualization.org/" target="_blank" rel="noopener noreferrer">
          Open DNA Visualizer
        </a>
      </Button>
    </div>
  )
}
