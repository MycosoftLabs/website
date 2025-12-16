import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "MycoBrain â†’ MAS Integration - Mycosoft",
  description: "Device agents and ingestion guidance for MycoBrain in MAS",
}

export default function MycoBrainMASIntegrationPage() {
  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/devices/mycobrain/integration">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <h1 className="text-4xl font-bold mb-4">MAS Integration</h1>
      <p className="text-xl text-muted-foreground mb-8">Build a Device Agent + ingestion service for MycoBrain.</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>MDP v1 library</CardTitle>
            <CardDescription>Shared framing + CRC + parsing code</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Extract COBS + CRC16 handling and MDP v1 encode/decode into a reusable library for MAS microservices.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Agent</CardTitle>
            <CardDescription>Reliable command delivery + telemetry events</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Maintain a device connection (LoRa/UART), implement ACK + retry for commands, emit telemetry/events to the MAS
            event bus, and expose a highâ€‘level API to orchestration layers.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
