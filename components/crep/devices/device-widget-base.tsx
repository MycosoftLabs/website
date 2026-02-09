"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  MapPin,
  Clock,
  Cpu
} from "lucide-react"

export interface DeviceData {
  id: string
  port?: string
  type: string
  name?: string
  status: "online" | "offline" | "unknown"
  lastSeen?: string
  location?: {
    lat: number
    lng: number
    name?: string
  }
  sensorData?: Record<string, unknown>
  firmwareVersion?: string
  uptime?: number
}

export interface ControlAction {
  id: string
  label: string
  icon?: React.ReactNode
  color?: string
  peripheral: string
  action: string
  params?: Record<string, unknown>
}

export interface SensorDisplay {
  key: string
  label: string
  unit?: string
  icon?: React.ReactNode
  format?: (value: unknown) => string
  color?: (value: unknown) => string
}

interface DeviceWidgetBaseProps {
  device: DeviceData
  title: string
  icon: React.ReactNode
  sensors: SensorDisplay[]
  controls: ControlAction[]
  onControl?: (peripheral: string, action: string, params?: Record<string, unknown>) => Promise<void>
  onRefresh?: () => void
  className?: string
  compact?: boolean
}

export function DeviceWidgetBase({
  device,
  title,
  icon,
  sensors,
  controls,
  onControl,
  onRefresh,
  className,
  compact = false,
}: DeviceWidgetBaseProps) {
  const [controlLoading, setControlLoading] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  const isOnline = device.status === "online"
  
  const handleControl = useCallback(async (control: ControlAction) => {
    if (!onControl || controlLoading) return
    
    setControlLoading(control.id)
    try {
      await onControl(control.peripheral, control.action, control.params)
    } catch (error) {
      console.error(`Control ${control.id} failed:`, error)
    } finally {
      setControlLoading(null)
    }
  }, [onControl, controlLoading])
  
  const formatUptime = (seconds?: number): string => {
    if (!seconds) return "N/A"
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }
  
  const getSensorValue = (key: string): unknown => {
    return device.sensorData?.[key]
  }
  
  const formatSensorValue = (sensor: SensorDisplay): string => {
    const value = getSensorValue(sensor.key)
    if (value === undefined || value === null) return "N/A"
    if (sensor.format) return sensor.format(value)
    if (typeof value === "number") {
      return value.toFixed(sensor.unit ? 1 : 0)
    }
    return String(value)
  }
  
  useEffect(() => {
    setLastUpdate(new Date())
  }, [device.sensorData])
  
  if (compact) {
    return (
      <div className={cn(
        "p-3 rounded-lg border bg-card/50 backdrop-blur-sm",
        isOnline ? "border-green-500/30" : "border-red-500/30",
        className
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded",
              isOnline ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              {icon}
            </div>
            <div>
              <div className="text-sm font-medium">{device.name || title}</div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {device.port || device.id}
              </div>
            </div>
          </div>
          <Badge variant={isOnline ? "default" : "destructive"} className="text-[10px]">
            {isOnline ? "Online" : "Offline"}
          </Badge>
        </div>
        
        {/* Compact sensor display */}
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          {sensors.slice(0, 4).map(sensor => (
            <div key={sensor.key} className="flex justify-between">
              <span className="text-muted-foreground">{sensor.label}:</span>
              <span className="font-mono">
                {formatSensorValue(sensor)}
                {sensor.unit && <span className="text-muted-foreground ml-0.5">{sensor.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <Card className={cn(
      "border backdrop-blur-sm",
      isOnline ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              isOnline ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-sm">{device.name || title}</CardTitle>
              <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2">
                <span>{device.port || device.id}</span>
                {device.firmwareVersion && (
                  <>
                    <span>•</span>
                    <span>v{device.firmwareVersion}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isOnline ? "default" : "destructive"} 
              className="flex items-center gap-1"
            >
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? "Online" : "Offline"}
            </Badge>
            {onRefresh && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sensor Readings */}
        <div className="space-y-2">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Sensors
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sensors.map(sensor => {
              const value = getSensorValue(sensor.key)
              const colorClass = sensor.color ? sensor.color(value) : "text-foreground"
              
              return (
                <div 
                  key={sensor.key}
                  className="p-2 rounded-lg bg-background/50 border border-border/50"
                >
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    {sensor.icon}
                    <span>{sensor.label}</span>
                  </div>
                  <div className={cn("text-lg font-mono", colorClass)}>
                    {formatSensorValue(sensor)}
                    {sensor.unit && (
                      <span className="text-xs text-muted-foreground ml-1">{sensor.unit}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Controls */}
        {controls.length > 0 && isOnline && (
          <div className="space-y-2">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Controls
            </div>
            <div className="flex flex-wrap gap-1.5">
              {controls.map(control => (
                <Button
                  key={control.id}
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-7 px-2 text-[10px]",
                    control.color
                  )}
                  disabled={controlLoading !== null}
                  onClick={() => handleControl(control)}
                >
                  {controlLoading === control.id ? "..." : (
                    <>
                      {control.icon}
                      {control.label}
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Device Info Footer */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[9px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Uptime: {formatUptime(device.uptime)}</span>
          </div>
          {device.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{device.location.name || `${device.location.lat.toFixed(2)}, ${device.location.lng.toFixed(2)}`}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper to send control commands
export async function sendDeviceControl(
  port: string,
  peripheral: string,
  action: string,
  params?: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    const response = await fetch(`/api/mycobrain/${encodeURIComponent(port)}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peripheral, action, ...params }),
    })
    
    const result = await response.json()
    
    if (!response.ok || !result.success) {
      return { success: false, error: result.error || "Control failed" }
    }
    
    return { success: true, result }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
