"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Thermometer, 
  Droplets, 
  Gauge, 
  Activity,
  Monitor,
  Mic,
  Radar,
  Camera,
  Sun,
  Vibrate,
  HelpCircle,
  RefreshCw,
  Loader2,
} from "lucide-react"

interface PeripheralWidgetProps {
  deviceId: string
  peripheral: {
    address: string
    type: string
    widget: {
      widget: string
      icon: string
      controls: string[]
      telemetryFields: string[]
      charts: string[]
      modems?: string[]
    }
  }
  sensorData?: Record<string, unknown>
}

// Icon mapping
const ICONS: Record<string, React.ReactNode> = {
  thermometer: <Thermometer className="h-5 w-5" />,
  monitor: <Monitor className="h-5 w-5" />,
  mic: <Mic className="h-5 w-5" />,
  radar: <Radar className="h-5 w-5" />,
  camera: <Camera className="h-5 w-5" />,
  sun: <Sun className="h-5 w-5" />,
  vibrate: <Vibrate className="h-5 w-5" />,
  lightbulb: <Activity className="h-5 w-5" />,
  "help-circle": <HelpCircle className="h-5 w-5" />,
}

// Environmental sensor widget (BME688) - with matching UI/UX colors
function EnvironmentalSensorWidget({ 
  peripheral, 
  sensorData 
}: { 
  peripheral: PeripheralWidgetProps["peripheral"]
  sensorData?: Record<string, unknown> 
}) {
  const data = sensorData || {}
  
  // Determine color scheme based on peripheral address for visual distinction
  const addressNum = parseInt(peripheral.address, 16)
  const isFirst = addressNum === 0x76 || addressNum % 2 === 0
  const primaryColor = isFirst ? "blue" : "purple"
  const colorClasses = {
    blue: {
      bg: "bg-blue-500/20",
      border: "border-blue-500/20",
      text: "text-blue-500",
      icon: "text-blue-500"
    },
    purple: {
      bg: "bg-purple-500/20",
      border: "border-purple-500/20",
      text: "text-purple-500",
      icon: "text-purple-500"
    }
  }
  const colors = colorClasses[primaryColor as keyof typeof colorClasses] || colorClasses.blue
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-4 rounded-lg bg-orange-500/10 border border-orange-500/20`}>
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">Temperature</span>
          </div>
          <p className="text-3xl font-bold">
            {typeof data.temperature === "number" ? data.temperature.toFixed(1) : "--"}°C
          </p>
        </div>
        
        <div className={`p-4 rounded-lg bg-blue-500/10 border border-blue-500/20`}>
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Humidity</span>
          </div>
          <p className="text-3xl font-bold">
            {typeof data.humidity === "number" ? data.humidity.toFixed(1) : "--"}%
          </p>
        </div>
        
        <div className={`p-4 rounded-lg bg-purple-500/10 border border-purple-500/20`}>
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Pressure</span>
          </div>
          <p className="text-3xl font-bold">
            {typeof data.pressure === "number" ? data.pressure.toFixed(0) : "--"}
            <span className="text-xs font-normal ml-1">hPa</span>
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${colors.bg} border ${colors.border}`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className={`h-4 w-4 ${colors.icon}`} />
            <span className="text-sm text-muted-foreground">Air Quality</span>
          </div>
          <p className={`text-3xl font-bold ${colors.text}`}>
            {typeof data.iaq === "number" ? data.iaq.toFixed(0) : "--"}
          </p>
          {typeof data.iaq_accuracy === "number" && (
            <Badge variant="outline" className="text-xs mt-1">
              acc: {data.iaq_accuracy}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Gas Resistance Bar */}
      {typeof data.gas_resistance === "number" && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Gas Resistance</span>
            <span className="font-mono">{(data.gas_resistance / 1000).toFixed(1)} kΩ</span>
          </div>
          <Progress 
            value={Math.min(100, (data.gas_resistance / 100000) * 100)} 
            className="h-2"
          />
        </div>
      )}
      
      {/* VOC and CO2 */}
      <div className="flex gap-4 text-sm">
        {typeof data.voc === "number" && (
          <div>
            <span className="text-muted-foreground">VOC:</span>{" "}
            <span className="font-medium">{data.voc.toFixed(2)} ppm</span>
          </div>
        )}
        {typeof data.co2eq === "number" && (
          <div>
            <span className="text-muted-foreground">CO₂eq:</span>{" "}
            <span className="font-medium">{data.co2eq.toFixed(0)} ppm</span>
          </div>
        )}
      </div>
    </div>
  )
}

// LiDAR widget
function LidarWidget({ sensorData }: { sensorData?: Record<string, unknown> }) {
  const data = sensorData || {}
  
  return (
    <div className="space-y-4">
      <div className="text-center p-6 rounded-lg bg-muted/50">
        <p className="text-4xl font-bold">
          {typeof data.distance_mm === "number" 
            ? (data.distance_mm / 10).toFixed(1) 
            : "--"}
          <span className="text-lg font-normal ml-1">cm</span>
        </p>
        <p className="text-muted-foreground text-sm mt-2">Distance</p>
      </div>
      
      {typeof data.signal_strength === "number" && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Signal Strength</span>
            <span>{data.signal_strength}%</span>
          </div>
          <Progress value={data.signal_strength} />
        </div>
      )}
    </div>
  )
}

// Display widget (OLED)
function DisplayWidget({ deviceId }: { deviceId: string }) {
  const [text, setText] = useState("")
  
  const sendText = async () => {
    try {
      await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          peripheral: "display", 
          action: "text", 
          text 
        }),
      })
    } catch { /* ignore */ }
  }
  
  return (
    <div className="space-y-4">
      <div className="aspect-[2/1] rounded-lg bg-black border-2 border-gray-700 p-2">
        <div className="w-full h-full flex items-center justify-center text-green-400 font-mono text-sm">
          {text || "OLED Display"}
        </div>
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text..."
          className="flex-1 px-3 py-2 border rounded-md text-sm"
        />
        <Button onClick={sendText} size="sm">Send</Button>
      </div>
    </div>
  )
}

// Generic/Unknown widget
function GenericWidget({ peripheral }: { peripheral: PeripheralWidgetProps["peripheral"] }) {
  return (
    <div className="text-center py-6">
      <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground">
        Peripheral at {peripheral.address}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Type: {peripheral.type}
      </p>
      <Badge variant="outline" className="mt-2">
        Awaiting data plane
      </Badge>
    </div>
  )
}

export function PeripheralWidget({ deviceId, peripheral, sensorData }: PeripheralWidgetProps) {
  const [loading, setLoading] = useState(false)
  
  const icon = ICONS[peripheral.widget.icon] || ICONS["help-circle"]
  
  // Determine color scheme based on peripheral type/address for visual distinction
  const addressNum = parseInt(peripheral.address, 16)
  const isFirst = addressNum % 2 === 0
  const primaryColor = isFirst ? "blue" : "purple"
  const colorClasses = {
    blue: {
      bg: "bg-blue-500/20",
      border: "border-blue-500/20",
      text: "text-blue-500",
      icon: "text-blue-500"
    },
    purple: {
      bg: "bg-purple-500/20",
      border: "border-purple-500/20",
      text: "text-purple-500",
      icon: "text-purple-500"
    }
  }
  const colors = colorClasses[primaryColor as keyof typeof colorClasses] || colorClasses.blue
  
  const renderWidget = () => {
    switch (peripheral.widget.widget) {
      case "environmental_sensor":
        return <EnvironmentalSensorWidget peripheral={peripheral} sensorData={sensorData} />
      case "lidar":
        return <LidarWidget sensorData={sensorData} />
      case "display":
        return <DisplayWidget deviceId={deviceId} />
      default:
        return <GenericWidget peripheral={peripheral} />
    }
  }
  
  const hasData = sensorData && Object.keys(sensorData).length > 0
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <div className={colors.icon}>
                {icon}
              </div>
            </div>
            <span className="capitalize">{peripheral.type.replace(/_/g, " ")}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasData && (
              <Badge variant="outline" className="text-green-500">
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                Live
              </Badge>
            )}
            <Badge variant="outline" className="font-mono text-xs">
              {peripheral.address}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderWidget()}
      </CardContent>
    </Card>
  )
}

// Peripheral auto-discovery grid
export function PeripheralGrid({ 
  deviceId, 
  sensorData 
}: { 
  deviceId: string
  sensorData?: Record<string, Record<string, unknown>>
}) {
  const [peripherals, setPeripherals] = useState<PeripheralWidgetProps["peripheral"][]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const scanPeripherals = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/peripherals`)
      const data = await res.json()
      if (data.peripherals) {
        setPeripherals(data.peripherals)
      }
      if (data.error) {
        setError(data.error)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    scanPeripherals()
    // Auto-rescan every 5 seconds to detect new peripherals
    const interval = setInterval(scanPeripherals, 5000)
    return () => clearInterval(interval)
  }, [deviceId])
  
  // Map sensor data to peripheral addresses
  // Handle both new format (by address) and legacy format (bme688_1, bme688_2)
  const getSensorDataForPeripheral = (peripheral: PeripheralWidgetProps["peripheral"]) => {
    // Try direct address match first
    if (sensorData?.[peripheral.address]) {
      return sensorData[peripheral.address]
    }
    
    // Try legacy BME688 format
    if (peripheral.type === "bme688" || peripheral.type?.includes("bme")) {
      // Check if this is the first or second BME688
      const addressNum = parseInt(peripheral.address, 16)
      // Common BME688 addresses: 0x76, 0x77
      if (sensorData?.bme688_1) {
        // If address is 0x76 or first detected, use bme688_1
        if (addressNum === 0x76 || peripherals.findIndex(p => p.type === "bme688") === 0) {
          return sensorData.bme688_1
        }
      }
      if (sensorData?.bme688_2) {
        // If address is 0x77 or second detected, use bme688_2
        if (addressNum === 0x77 || peripherals.findIndex(p => p.type === "bme688") === 1) {
          return sensorData.bme688_2
        }
      }
      // Fallback: use first available BME688 data
      return sensorData?.bme688_1 || sensorData?.bme688_2
    }
    
    // Try matching by type name
    const typeKey = peripheral.type?.toLowerCase().replace(/[^a-z0-9]/g, "_")
    if (typeKey && sensorData?.[typeKey]) {
      return sensorData[typeKey]
    }
    
    return undefined
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Scanning peripherals...</span>
      </div>
    )
  }
  
  if (peripherals.length === 0) {
    return (
      <div className="text-center py-12">
        <Radar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">No peripherals detected</p>
        <Button variant="outline" onClick={scanPeripherals}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Scan Again
        </Button>
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {peripherals.length} peripheral(s) detected
        </p>
        <Button variant="ghost" size="sm" onClick={scanPeripherals}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Rescan
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {peripherals.map((p) => {
          const peripheralData = getSensorDataForPeripheral(p)
          return (
            <PeripheralWidget
              key={p.address}
              deviceId={deviceId}
              peripheral={p}
              sensorData={peripheralData}
            />
          )
        })}
      </div>
    </div>
  )
}

