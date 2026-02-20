"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  Thermometer,
  Droplets,
  Sun,
  Bell,
  Cpu,
  Zap,
  Link2,
} from "lucide-react"
import Link from "next/link"

export default function SimulationPage() {
  const [loading, setLoading] = useState(false)

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Simulation"
        text="Simulink models, hardware-in-the-loop testing, and control validation"
      >
        <Button variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Environmental Control
              </CardTitle>
              <CardDescription>Temperature/humidity control loops</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">Simulink</Badge>
              <p className="text-xs text-muted-foreground mt-2">
                environmentalControl.slx
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Irrigation System
              </CardTitle>
              <CardDescription>Smart irrigation control</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">Simulink</Badge>
              <p className="text-xs text-muted-foreground mt-2">
                irrigationSystem.slx
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Lighting Control
              </CardTitle>
              <CardDescription>Growth chamber lighting</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">Simulink</Badge>
              <p className="text-xs text-muted-foreground mt-2">
                lightingControl.slx
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Alert System
              </CardTitle>
              <CardDescription>Multi-sensor alert logic</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">Simulink</Badge>
              <p className="text-xs text-muted-foreground mt-2">
                alertSystem.slx
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Cpu className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="hil" className="gap-2">
              <Zap className="h-4 w-4" />
              Hardware-in-the-Loop
            </TabsTrigger>
            <TabsTrigger value="integration" className="gap-2">
              <Link2 className="h-4 w-4" />
              Integration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Simulink Models</CardTitle>
                <CardDescription>
                  MATLAB Simulink models for environmental control and device validation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Simulink models are stored in the NatureOS repository under{" "}
                  <code className="rounded bg-muted px-1 py-0.5">simulink/</code>.
                  Use Simulink Real-Time for hardware-in-the-loop testing with MycoBrain
                  ESP32 devices. Control algorithms can be validated before deployment.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge>environmentalControl.slx</Badge>
                  <Badge>irrigationSystem.slx</Badge>
                  <Badge>lightingControl.slx</Badge>
                  <Badge>alertSystem.slx</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hil" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Hardware-in-the-Loop Testing</CardTitle>
                <CardDescription>
                  Connect Simulink to real MycoBrain devices via serial/MQTT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  HIL testing validates control logic before deploying firmware to
                  embedded devices. Connect via serial (MycoBrain gateway) or MQTT.
                  Use Simulink Real-Time for real-time simulation.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integration" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration</CardTitle>
                <CardDescription>
                  Links to MATLAB AI Studio and device management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button asChild variant="outline">
                    <Link href="/natureos/ai-studio">
                      <Cpu className="h-4 w-4 mr-2" />
                      AI Studio
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/natureos">
                      <Zap className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
