import type { Metadata } from "next"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata: Metadata = {
  title: "Mycorrhizae Protocol - Mycosoft",
  description: "Schema + channel layer bridging MINDEX and NatureOS (via MAS)",
}

export default function MycorrhizaeProtocolPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Mycorrhizae Protocol</h1>
        <p className="text-xl text-muted-foreground">
          A standard schema + channel layer that makes device telemetry (via MAS + MINDEX) easy to consume in NatureOS.
        </p>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        <Badge variant="outline">MINDEX</Badge>
        <Badge variant="outline">NatureOS</Badge>
        <Badge variant="outline">MAS</Badge>
        <Badge variant="outline">MycoBrain</Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="flow">Flow</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Two layers</CardTitle>
              <CardDescription>MDP v1 (transport) vs Mycorrhizae Protocol (ecosystem schema)</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              MycoBrain speaks MDP v1 on-device (COBS + CRC16). MAS ingests/normalizes and MINDEX stores. The Mycorrhizae
              Protocol defines app-friendly payload shapes and topics for NatureOS and other consumers.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data flow</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Device â†’ MAS Device Agent â†’ MINDEX â†’ Mycorrhizae Protocol â†’ NatureOS
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Suggested channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><code>mycobrain:{'{device_id}'}:telemetry</code></li>
                <li><code>mycobrain:{'{device_id}'}:events</code></li>
                <li><code>mycobrain:{'{device_id}'}:commands</code> (reliable via MAS)</li>
              </ul>
              <Button variant="outline" asChild>
                <Link href="/devices/mycobrain/integration">MycoBrain Integration Guide</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
