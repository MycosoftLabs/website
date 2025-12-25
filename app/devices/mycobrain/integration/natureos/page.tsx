import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "MycoBrain â†’ NatureOS Integration - Mycosoft",
  description: "MycoBrain widget guidance for NatureOS",
}

export default function MycoBrainNatureOSIntegrationPage() {
  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/devices/mycobrain/integration">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <h1 className="text-4xl font-bold mb-4">NatureOS Integration</h1>
      <p className="text-xl text-muted-foreground mb-8">Build a dashboard widget + control panel for MycoBrain.</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Widget</CardTitle>
            <CardDescription>Realâ€‘time telemetry visualization</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Subscribe to MycoBrain telemetry via Mycorrhizae Protocol channels and render charts for AI1..AI4 voltages,
            BME688 readings, MOSFET state, and IÂ²C device list.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Reliable commands via MAS agent</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Provide actions to toggle MOSFET outputs, set telemetry interval, and trigger an IÂ²C scan. Commands should be
            sent through MAS (ACK + retry on the command channel).
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
