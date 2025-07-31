"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Code } from "lucide-react"

export default function ApiConsolePage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="API Console" text="Interact with the Mycosoft API" />
      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>API Console</CardTitle>
            <CardDescription>Test and explore the Mycosoft API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-md border bg-muted/50 flex items-center justify-center">
              <div className="text-center">
                <Code className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">API Console Interface</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
