'use client'

import { useState, useEffect } from 'react'
import { useDeviceStatus, useSafetyAlerts } from '@/hooks/realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Bell, Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react'

interface TelemetryPoint {
  timestamp: number
  value: number
  unit: string
}

interface DeviceTelemetry {
  deviceId: string
  deviceName: string
  temperature?: TelemetryPoint
  humidity?: TelemetryPoint
  co2?: TelemetryPoint
  light?: TelemetryPoint
  status: 'online' | 'offline' | 'busy' | 'error'
}

export function LiveTelemetryDashboard() {
  const { devices, isConnected } = useDeviceStatus()
  const { alerts, clearAlerts } = useSafetyAlerts()
  const [telemetry, setTelemetry] = useState<DeviceTelemetry[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)

  // Simulate telemetry data
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTelemetry([
        {
          deviceId: 'mushroom1',
          deviceName: 'Mushroom1 IoT',
          temperature: { timestamp: now, value: 23.5 + Math.random() * 2, unit: 'Â°C' },
          humidity: { timestamp: now, value: 85 + Math.random() * 5, unit: '%' },
          co2: { timestamp: now, value: 800 + Math.random() * 200, unit: 'ppm' },
          light: { timestamp: now, value: 150 + Math.random() * 50, unit: 'lux' },
          status: 'online',
        },
        {
          deviceId: 'sporebase',
          deviceName: 'SporeBase Station',
          temperature: { timestamp: now, value: 4.2 + Math.random() * 0.5, unit: 'Â°C' },
          humidity: { timestamp: now, value: 95 + Math.random() * 3, unit: '%' },
          status: 'online',
        },
        {
          deviceId: 'myconode-1',
          deviceName: 'MycoNode Soil #1',
          temperature: { timestamp: now, value: 18 + Math.random() * 3, unit: 'Â°C' },
          humidity: { timestamp: now, value: 70 + Math.random() * 10, unit: '%' },
          status: 'online',
        },
        {
          deviceId: 'petraeus',
          deviceName: 'Petraeus FCI',
          status: 'busy',
        },
      ])
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const warningAlerts = alerts.filter(a => a.severity === 'warning')

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? 'default' : 'destructive'} className="flex items-center gap-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? 'Real-time Connected' : 'Disconnected'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {telemetry.filter(d => d.status === 'online').length}/{telemetry.length} devices online
          </span>
        </div>
        <div className="flex items-center gap-2">
          {criticalAlerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {criticalAlerts.length} Critical
            </Badge>
          )}
          {warningAlerts.length > 0 && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              {warningAlerts.length} Warnings
            </Badge>
          )}
          <Button size="sm" variant="ghost" onClick={clearAlerts}>
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {alerts.slice(-5).reverse().map((alert, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                    {alert.severity}
                  </Badge>
                  <span>{alert.message}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {telemetry.map((device) => (
          <Card 
            key={device.deviceId} 
            className={`cursor-pointer transition-all ${selectedDevice === device.deviceId ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedDevice(device.deviceId === selectedDevice ? null : device.deviceId)}
          >
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{device.deviceName}</CardTitle>
                <Badge variant={device.status === 'online' ? 'default' : device.status === 'busy' ? 'secondary' : 'destructive'}>
                  {device.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="py-2 space-y-2">
              {device.temperature && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ðŸŒ¡ï¸ Temp</span>
                  <span className="font-mono">{device.temperature.value.toFixed(1)}{device.temperature.unit}</span>
                </div>
              )}
              {device.humidity && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ðŸ’§ Humidity</span>
                  <span className="font-mono">{device.humidity.value.toFixed(0)}{device.humidity.unit}</span>
                </div>
              )}
              {device.co2 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ðŸ’¨ COâ‚‚</span>
                  <span className="font-mono">{device.co2.value.toFixed(0)} {device.co2.unit}</span>
                </div>
              )}
              {device.light && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">â˜€ï¸ Light</span>
                  <span className="font-mono">{device.light.value.toFixed(0)} {device.light.unit}</span>
                </div>
              )}
              {device.status === 'busy' && (
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-3 w-3 animate-pulse text-blue-500" />
                  <span className="text-blue-500">Recording...</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Telemetry Chart (selected device) */}
      {selectedDevice && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              Telemetry History: {telemetry.find(d => d.deviceId === selectedDevice)?.deviceName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Real-time telemetry chart will render here with Recharts
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
