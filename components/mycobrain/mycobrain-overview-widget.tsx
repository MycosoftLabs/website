"use client"

import { useMycoBrain, getIAQLabel, formatUptime } from "@/hooks/use-mycobrain"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Cpu,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  Timer,
  MapPin,
} from "lucide-react"
import Link from "next/link"

export function MycoBrainOverviewWidget() {
  const { devices, loading, isConnected, lastUpdate, refresh } = useMycoBrain(3000)

  const primaryDevice = devices[0]
  const bme1 = primaryDevice?.sensor_data?.bme688_1
  const bme2 = primaryDevice?.sensor_data?.bme688_2
  const iaq1 = getIAQLabel(bme1?.iaq)

  // Calculate average values from both sensors
  const avgTemp = bme1 && bme2 ? (bme1.temperature + bme2.temperature) / 2 : bme1?.temperature || bme2?.temperature
  const avgHumidity = bme1 && bme2 ? (bme1.humidity + bme2.humidity) / 2 : bme1?.humidity || bme2?.humidity
  const avgPressure = bme1 && bme2 ? (bme1.pressure + bme2.pressure) / 2 : bme1?.pressure || bme2?.pressure

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Loading MycoBrain...</span>
        </CardContent>
      </Card>
    )
  }

  if (!primaryDevice) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Cpu className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No MycoBrain Connected</p>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Scan
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            <div>
              <CardTitle className="text-sm font-medium">MycoBrain Gateway</CardTitle>
              <CardDescription className="text-green-100 text-xs">
                {primaryDevice.port} • {(() => {
                  if (bme1 && bme2) return "2x BME688"
                  if (bme1) return "1x BME688"
                  // Check I2C addresses for BME688 (0x76=118, 0x77=119)
                  const i2cAddrs = primaryDevice.telemetry?.i2c_addresses || []
                  const bmeCount = i2cAddrs.filter((addr: number) => addr === 0x76 || addr === 0x77 || addr === 118 || addr === 119).length
                  if (bmeCount > 0) return `${bmeCount}x BME688`
                  return "No sensors"
                })()}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className={isConnected ? "bg-green-500/30" : "bg-red-500/30"}>
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Sensor Values Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className="p-1.5 rounded-md bg-orange-500/20">
              <Thermometer className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{avgTemp?.toFixed(1) || "--"}°C</p>
              <p className="text-xs text-muted-foreground">Temperature</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className="p-1.5 rounded-md bg-blue-500/20">
              <Droplets className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{avgHumidity?.toFixed(1) || "--"}%</p>
              <p className="text-xs text-muted-foreground">Humidity</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className="p-1.5 rounded-md bg-purple-500/20">
              <Wind className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{avgPressure?.toFixed(0) || "--"}</p>
              <p className="text-xs text-muted-foreground">hPa</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <div className={`p-1.5 rounded-md ${iaq1.bgColor}`}>
              <Activity className={`h-4 w-4 ${iaq1.color}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${iaq1.color}`}>{bme1?.iaq || "--"}</p>
              <p className="text-xs text-muted-foreground">IAQ</p>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3" />
              LoRa {primaryDevice.device_info?.lora_status === "ok" ? "✓" : "—"}
            </span>
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {formatUptime(primaryDevice.device_info?.uptime)}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href="/natureos/devices">
              View Details →
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Compact version for sidebar
export function MycoBrainCompactWidget() {
  const { devices, isConnected } = useMycoBrain(5000)
  const device = devices[0]
  const bme1 = device?.sensor_data?.bme688_1

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Cpu className={`h-4 w-4 ${isConnected ? "text-green-500" : "text-gray-500"}`} />
          <span className="text-sm font-medium">MycoBrain</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-500"}`} />
      </div>
      {bme1 && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Temp</span>
            <p className="font-mono">{bme1.temperature.toFixed(1)}°</p>
          </div>
          <div>
            <span className="text-muted-foreground">RH</span>
            <p className="font-mono">{bme1.humidity.toFixed(0)}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">IAQ</span>
            <p className="font-mono">{bme1.iaq || "—"}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Live sensor cards for analytics
export function MycoBrainSensorCards() {
  const { devices, isConnected } = useMycoBrain(2000)
  const device = devices[0]
  const bme1 = device?.sensor_data?.bme688_1
  const bme2 = device?.sensor_data?.bme688_2
  const iaq1 = getIAQLabel(bme1?.iaq)
  const iaq2 = getIAQLabel(bme2?.iaq)

  if (!device) return null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* BME688 Sensor 1 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              BME688 Sensor 1
            </CardTitle>
            <Badge variant="outline" className={isConnected ? "text-green-500" : ""}>
              {isConnected ? "Live" : "Offline"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="text-2xl font-bold">{bme1?.temperature?.toFixed(1) || "--"}°C</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="text-2xl font-bold">{bme1?.humidity?.toFixed(1) || "--"}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pressure</p>
              <p className="text-xl font-bold">{bme1?.pressure?.toFixed(0) || "--"} hPa</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Air Quality</p>
              <p className={`text-xl font-bold ${iaq1.color}`}>{bme1?.iaq || "--"}</p>
              <p className="text-xs text-muted-foreground">{iaq1.label}</p>
            </div>
          </div>
          {bme1?.gas_resistance && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Gas Resistance</p>
              <Progress value={Math.min((bme1.gas_resistance / 500000) * 100, 100)} className="h-2 mt-1" />
              <p className="text-xs text-right mt-1">{(bme1.gas_resistance / 1000).toFixed(1)} kΩ</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BME688 Sensor 2 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              BME688 Sensor 2
            </CardTitle>
            <Badge variant="outline" className={isConnected ? "text-green-500" : ""}>
              {isConnected ? "Live" : "Offline"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="text-2xl font-bold">{bme2?.temperature?.toFixed(1) || "--"}°C</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="text-2xl font-bold">{bme2?.humidity?.toFixed(1) || "--"}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pressure</p>
              <p className="text-xl font-bold">{bme2?.pressure?.toFixed(0) || "--"} hPa</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Air Quality</p>
              <p className={`text-xl font-bold ${iaq2.color}`}>{bme2?.iaq || "--"}</p>
              <p className="text-xs text-muted-foreground">{iaq2.label}</p>
            </div>
          </div>
          {bme2?.gas_resistance && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Gas Resistance</p>
              <Progress value={Math.min((bme2.gas_resistance / 500000) * 100, 100)} className="h-2 mt-1" />
              <p className="text-xs text-right mt-1">{(bme2.gas_resistance / 1000).toFixed(1)} kΩ</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
