import type { Metadata } from "next"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Database, Layers, Network } from "lucide-react"

export const metadata: Metadata = {
  title: "MycoBrain Integration Guide - Mycosoft",
  description: "Integrate MycoBrain V1 with MINDEX, NatureOS, MAS, and the Mycorrhizae Protocol",
}

export default function MycoBrainIntegrationPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">MycoBrain Integration Guide</h1>
        <p className="text-xl text-muted-foreground">
          MycoBrain V1 is a dualâ€‘ESP32â€‘S3 board (Sideâ€‘A sensors, Sideâ€‘B routing) with SX1262 LoRa. Telemetry and commands
          use MDP v1 (COBS + CRC16).
        </p>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        <Badge variant="outline">MycoBrain V1</Badge>
        <Badge variant="outline">MDP v1</Badge>
        <Badge variant="outline">COBS</Badge>
        <Badge variant="outline">CRC16</Badge>
        <Badge variant="outline">MINDEX</Badge>
        <Badge variant="outline">NatureOS</Badge>
        <Badge variant="outline">MAS</Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mindex">MINDEX</TabsTrigger>
          <TabsTrigger value="natureos">NatureOS</TabsTrigger>
          <TabsTrigger value="mas">MAS</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Architecture</CardTitle>
              <CardDescription>Two MCUs, one clear contract</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Sideâ€‘A</strong>: sensors, IÂ²C scan, analog inputs, MOSFET control.</li>
                <li><strong>Sideâ€‘B</strong>: UARTâ†”LoRa routing, ACK + retry command channel.</li>
                <li><strong>Telemetry</strong>: bestâ€‘effort. <strong>Commands</strong>: reliable.</li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/devices/mycobrain/integration/mindex">
                    <Database className="mr-2 h-4 w-4" />
                    MINDEX Guide
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/devices/mycobrain/integration/natureos">
                    <Layers className="mr-2 h-4 w-4" />
                    NatureOS Guide
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/devices/mycobrain/integration/mas">
                    <Network className="mr-2 h-4 w-4" />
                    MAS Guide
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/protocols/mycorrhizae">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Mycorrhizae Protocol
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mindex" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MINDEX</CardTitle>
              <CardDescription>Schema + ingestion + idempotency</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Define a MycoBrain device schema in MINDEX. Ingest Sideâ€‘B telemetry via MAS (decode COBS, verify CRC16), map
              into MINDEX tables, and use sequence + timestamp for idempotent inserts. Store desired setpoints/schedules
              in MINDEX for downlink control.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="natureos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>NatureOS</CardTitle>
              <CardDescription>Widget + controls</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Build a MycoBrain widget that graphs AI1..AI4 voltages, shows BME688 readings and MOSFET state, and provides
              control actions (toggle MOSFET, set telemetry period, trigger IÂ²C scan) using the reliable command channel.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>MAS</CardTitle>
              <CardDescription>Device agents + event routing</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              MAS agents maintain device connections (LoRa/UART), implement ACK + retry, and expose a highâ€‘level API.
              Telemetry/events flow into MAS event bus for alerting, storage, and ML pipelines.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
