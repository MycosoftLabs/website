import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "MycoBrain â†’ MINDEX Integration - Mycosoft",
  description: "MycoBrain device schema + ingestion agent flow for MINDEX",
}

export default function MycoBrainMINDEXIntegrationPage() {
  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/devices/mycobrain/integration">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <h1 className="text-4xl font-bold mb-4">MINDEX Integration</h1>
      <p className="text-xl text-muted-foreground mb-8">Schema mapping, ingestion, auth, and command roundâ€‘trip.</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Device schema</CardTitle>
            <CardDescription>Track identity, firmware, discovered sensors, and IO labeling</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Add a MycoBrain device type with serial number, Sideâ€‘A/Sideâ€‘B firmware versions, IÂ²C scan results, analog
            channel labels (AI1..AI4), MOSFET states, and power status.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingestion agent</CardTitle>
            <CardDescription>MAS service that converts MDP v1 frames into MINDEX API calls</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Subscribe to Sideâ€‘B telemetry (LoRa or UART via Gateway), decode COBS, verify CRC16, and map fields into MINDEX
            tables. Use sequence + timestamp for idempotent inserts.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commands</CardTitle>
            <CardDescription>MINDEX desired state â†’ MAS â†’ MycoBrain</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Store desired setpoints or schedules in MINDEX. MAS reads pending commands and sends them to MycoBrain using
            the reliable command channel (ACK + retry) routed by Sideâ€‘B.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
