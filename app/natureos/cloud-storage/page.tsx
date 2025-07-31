"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Cloud } from "lucide-react"

export default function CloudStoragePage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Cloud Storage" text="Manage your data storage" />
      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Cloud Storage</CardTitle>
            <CardDescription>View and manage your stored data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-md border bg-muted/50 flex items-center justify-center">
              <div className="text-center">
                <Cloud className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Cloud Storage Interface</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
