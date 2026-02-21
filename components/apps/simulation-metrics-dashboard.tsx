"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface SimulationMetricsDashboardProps {
  metrics: Record<string, number>
}

export function SimulationMetricsDashboard({ metrics }: SimulationMetricsDashboardProps) {
  const entries = Object.entries(metrics)

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Simulation Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No metrics available.</p>
        ) : (
          entries.map(([label, value], index) => (
            <div key={label} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>{label.replace(/_/g, " ")}</span>
                <span className="font-mono">{value.toFixed(4)}</span>
              </div>
              {index < entries.length - 1 ? <Separator /> : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
