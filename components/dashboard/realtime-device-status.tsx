/**
 * Real-time Device Status Component
 * 
 * Displays live telemetry data from MycoBrain devices
 */

'use client'

import { useRealtimeTelemetry, useDevicePresence } from '@/hooks/use-realtime-telemetry'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Activity } from 'lucide-react'

interface RealtimeDeviceStatusProps {
  deviceId: string
  deviceName?: string
}

export function RealtimeDeviceStatus({ deviceId, deviceName }: RealtimeDeviceStatusProps) {
  const { telemetry, isConnected, error } = useRealtimeTelemetry(deviceId)
  const { isOnline, lastSeen } = useDevicePresence(deviceId)

  const latestTelemetry = telemetry[0]

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{deviceName || deviceId}</CardTitle>
            <CardDescription>Real-time telemetry data</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? 'default' : 'secondary'}>
              {isOnline ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Online
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
            <Badge variant={isConnected ? 'default' : 'outline'}>
              <Activity className="h-3 w-3 mr-1" />
              {isConnected ? 'Connected' : 'Connecting...'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {latestTelemetry ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {latestTelemetry.temperature !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Temperature</p>
                <p className="text-2xl font-bold">{latestTelemetry.temperature.toFixed(1)}°C</p>
              </div>
            )}
            {latestTelemetry.humidity !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Humidity</p>
                <p className="text-2xl font-bold">{latestTelemetry.humidity.toFixed(1)}%</p>
              </div>
            )}
            {latestTelemetry.pressure !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Pressure</p>
                <p className="text-2xl font-bold">{latestTelemetry.pressure.toFixed(1)} hPa</p>
              </div>
            )}
            {latestTelemetry.air_quality !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Air Quality</p>
                <p className="text-2xl font-bold">{latestTelemetry.air_quality.toFixed(1)}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No telemetry data available</p>
        )}
        {lastSeen && (
          <p className="text-xs text-muted-foreground mt-4">
            Last seen: {new Date(lastSeen).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
