"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3 } from "lucide-react"
import { useEffect, useState } from "react"

export default function AnalyticsPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Analytics" text="Analyze your fungal intelligence network data" />
      <div className="grid gap-5">
        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="species">Species</TabsTrigger>
            <TabsTrigger value="compounds">Compounds</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Network Growth Trends</CardTitle>
                  <CardDescription>Mycelial network expansion over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] rounded-md border bg-muted/50 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Growth Analytics Visualization</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                  <CardDescription>Performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Network Efficiency", value: "92%", change: "+5%" },
                      { label: "Data Processing", value: "1.8TB", change: "+0.3TB" },
                      { label: "Signal Strength", value: "87%", change: "+12%" },
                      { label: "Node Connectivity", value: "99.2%", change: "+0.7%" },
                      { label: "Response Time", value: "42ms", change: "-8ms" },
                    ].map((metric, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{metric.label}</p>
                          <p className="text-sm text-muted-foreground">{metric.value}</p>
                        </div>
                        <div className={`text-sm ${metric.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}>
                          {metric.change}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Network Analysis</CardTitle>
                <CardDescription>Detailed insights into network performance</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Network analysis content here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="species" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Species Analysis</CardTitle>
                <CardDescription>Detailed insights into species distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Species analysis content here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compounds" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Compound Analysis</CardTitle>
                <CardDescription>Detailed insights into compound distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Compound analysis content here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
