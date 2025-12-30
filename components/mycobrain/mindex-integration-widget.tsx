"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, Activity, MapPin, Clock } from "lucide-react"

interface MINDEXIntegrationWidgetProps {
  deviceId: string
}

interface DeviceRegistration {
  registered: boolean
  registered_at?: string
  last_seen?: string
  location?: { lat: number; lon: number }
  metadata?: Record<string, any>
}

interface TelemetryStats {
  count: number
  latest?: string
  sensors?: string[]
}

export function MINDEXIntegrationWidget({ deviceId }: MINDEXIntegrationWidgetProps) {
  const [registration, setRegistration] = useState<DeviceRegistration | null>(null)
  const [telemetryStats, setTelemetryStats] = useState<TelemetryStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    loadRegistrationStatus()
    loadTelemetryStats()
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadRegistrationStatus()
      loadTelemetryStats()
    }, 30000)
    return () => clearInterval(interval)
  }, [deviceId])

  const loadRegistrationStatus = async () => {
    try {
      const res = await fetch(`/api/natureos/devices/mycobrain`)
      if (res.ok) {
        const data = await res.json()
        const device = data.devices?.find((d: any) => d.device_id === deviceId)
        if (device) {
          setRegistration({
            registered: device.registered || false,
            registered_at: device.registered_at,
            last_seen: device.last_seen,
            location: device.location,
            metadata: device.metadata,
          })
        }
      }
    } catch (error) {
      console.error("Failed to load registration status:", error)
    }
  }

  const loadTelemetryStats = async () => {
    try {
      const res = await fetch(`/api/mindex/telemetry?device_id=${encodeURIComponent(deviceId)}&limit=1`)
      if (res.ok) {
        const data = await res.json()
        setTelemetryStats({
          count: data.count || 0,
          latest: data.telemetry?.[0]?.timestamp,
        })
      }
    } catch (error) {
      // MINDEX endpoint might not exist yet
      console.debug("Telemetry stats not available:", error)
    }
  }

  const handleRegister = async () => {
    setRegistering(true)
    try {
      const res = await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          serial_number: deviceId,
          firmware_version: "unknown",
        }),
      })
      if (res.ok) {
        await loadRegistrationStatus()
      }
    } catch (error) {
      console.error("Failed to register device:", error)
    } finally {
      setRegistering(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          MINDEX Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Registration Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Registration:</span>
            <Badge variant={registration?.registered ? "default" : "secondary"}>
              {registration?.registered ? "Registered" : "Not Registered"}
            </Badge>
          </div>
          {!registration?.registered && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegister}
              disabled={registering}
            >
              {registering ? "Registering..." : "Register"}
            </Button>
          )}
        </div>

        {/* Registration Details */}
        {registration?.registered && (
          <div className="space-y-2 text-sm">
            {registration.registered_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Registered: {new Date(registration.registered_at).toLocaleDateString()}</span>
              </div>
            )}
            {registration.last_seen && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>Last seen: {new Date(registration.last_seen).toLocaleString()}</span>
              </div>
            )}
            {registration.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>
                  Location: {registration.location.lat.toFixed(4)}, {registration.location.lon.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Telemetry Stats */}
        {telemetryStats && telemetryStats.count > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-3 w-3" />
              <span className="text-muted-foreground">
                {telemetryStats.count} telemetry records in MINDEX
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
