"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Zap } from "lucide-react"

export default function EnergyPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Energy Usage" text="Monitor energy consumption" />
      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Energy Usage</CardTitle>
            <CardDescription>Track energy consumption across your network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-md border bg-muted/50 flex items-center justify-center">
              <div className="text-center">
                <Zap className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Energy Usage Visualization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
