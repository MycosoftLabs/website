"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { PipetteIcon } from "lucide-react"

export default function PetriDishSimPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Petri Dish Simulator" text="Simulate and analyze fungal growth patterns" />
      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Petri Dish Simulation</CardTitle>
            <CardDescription>Visualize fungal growth in a virtual environment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-md border bg-muted/50 flex items-center justify-center">
              <div className="text-center">
                <PipetteIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Petri Dish Simulation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
