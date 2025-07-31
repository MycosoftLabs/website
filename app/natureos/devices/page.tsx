"use client"

import { CardFooter } from "@/components/ui/card"

import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Bug, Database, MouseIcon, Network, PipetteIcon } from "lucide-react"
import { useEffect, useState } from "react"

export default function DevicesPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Devices" text="Manage your connected Mycosoft devices" />
      <div className="grid gap-5">
        <Tabs defaultValue="all" className="space-y-5">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="all">All Devices</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="development">Development</TabsTrigger>
            </TabsList>
            <Button size="sm">Add Device</Button>
          </div>

          <TabsContent value="all" className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Mushroom 1</CardTitle>
                    <Badge>Active</Badge>
                  </div>
                  <CardDescription>Ground-Based Fungal Intelligence Station</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <MouseIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Operational</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Deployed</span>
                        <span>1,245 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Signal</span>
                        <span>Strong</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Battery</span>
                        <span>87%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>ALARM</CardTitle>
                    <Badge>Active</Badge>
                  </div>
                  <CardDescription>Environmental Safety Device</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Operational</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Deployed</span>
                        <span>2,156 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Alerts</span>
                        <span>12 today</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Battery</span>
                        <span>92%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>SporeBase</CardTitle>
                    <Badge>Active</Badge>
                  </div>
                  <CardDescription>Distributed Spore Collection Network</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <Database className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Operational</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Deployed</span>
                        <span>879 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Data</span>
                        <span>1.2TB collected</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Battery</span>
                        <span>76%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>TruffleBot</CardTitle>
                    <Badge variant="secondary">Maintenance</Badge>
                  </div>
                  <CardDescription>Handheld Fungal Detection System</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <Bug className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Maintenance</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Deployed</span>
                        <span>432 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Findings</span>
                        <span>5,432 species</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Battery</span>
                        <span>54%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Petreus</CardTitle>
                    <Badge variant="secondary">Testing</Badge>
                  </div>
                  <CardDescription>Computational Petri Dish Platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <PipetteIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Testing</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Deployed</span>
                        <span>78 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Experiments</span>
                        <span>124 active</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Uptime</span>
                        <span>99.2%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>MycoTenna</CardTitle>
                    <Badge variant="secondary">Development</Badge>
                  </div>
                  <CardDescription>Fungal Network Communication System</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <Network className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Development</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Prototypes</span>
                        <span>12 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Range</span>
                        <span>1.2km</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Progress</span>
                        <span>76%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Mushroom 1</CardTitle>
                    <Badge>Active</Badge>
                  </div>
                  <CardDescription>Ground-Based Fungal Intelligence Station</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <MouseIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Operational</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Deployed</span>
                        <span>1,245 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Signal</span>
                        <span>Strong</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Battery</span>
                        <span>87%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>ALARM</CardTitle>
                    <Badge>Active</Badge>
                  </div>
                  <CardDescription>Environmental Safety Device</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Operational</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Deployed</span>
                        <span>2,156 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Alerts</span>
                        <span>12 today</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Battery</span>
                        <span>92%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>SporeBase</CardTitle>
                    <Badge>Active</Badge>
                  </div>
                  <CardDescription>Distributed Spore Collection Network</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <Database className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Operational</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Deployed</span>
                        <span>879 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Data</span>
                        <span>1.2TB collected</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Battery</span>
                        <span>76%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>TruffleBot</CardTitle>
                    <Badge variant="secondary">Maintenance</Badge>
                  </div>
                  <CardDescription>Handheld Fungal Detection System</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <Bug className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Maintenance</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Deployed</span>
                        <span>432 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Findings</span>
                        <span>5,432 species</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Battery</span>
                        <span>54%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="development" className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>MycoTenna</CardTitle>
                    <Badge variant="secondary">Development</Badge>
                  </div>
                  <CardDescription>Fungal Network Communication System</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-[120px] rounded-md border bg-muted/50 flex items-center justify-center">
                      <Network className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Status</span>
                        <span>Development</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Prototypes</span>
                        <span>12 units</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Range</span>
                        <span>1.2km</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Progress</span>
                        <span>76%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
