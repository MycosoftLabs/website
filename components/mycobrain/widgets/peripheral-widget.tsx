"use client"

import { useState, useEffect, useRef } from "react"
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
  Wind,
  FlaskConical,
} from "lucide-react"
import { SmellDetectionWidget } from "./smell-detection-widget"
import { AQIComparisonWidget } from "./aqi-comparison-widget"

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
        
        <div className={`p-4 rounded-lg bg-green-500/10 border border-green-500/20`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Gas Resistance</span>
          </div>
          <p className="text-2xl font-bold text-green-500">
            {typeof data.gas_resistance === "number" 
              ? (data.gas_resistance / 1000).toFixed(1) 
              : "--"}
            <span className="text-xs font-normal ml-1">kΩ</span>
          </p>
          {/* Show IAQ if available (requires BSEC library) */}
          {typeof data.iaq === "number" && (
            <div className="text-xs text-muted-foreground mt-1">
              IAQ: {data.iaq.toFixed(0)}
              {typeof data.iaq_accuracy === "number" && ` (acc: ${data.iaq_accuracy})`}
            </div>
          )}
        </div>
      </div>
      
      {/* VOC and CO2 - only show if available (requires BSEC library) */}
      {(typeof data.voc === "number" || typeof data.co2eq === "number" || typeof data.bvoc === "number") && (
        <div className="flex gap-4 text-sm pt-2 border-t border-border/50">
          {typeof data.bvoc === "number" && (
            <div>
              <span className="text-muted-foreground">bVOC:</span>{" "}
              <span className="font-medium">{data.bvoc.toFixed(2)} ppm</span>
            </div>
          )}
          {typeof data.voc === "number" && (
            <div>
              <span className="text-muted-foreground">VOC:</span>{" "}
              <span className="font-medium">{data.voc.toFixed(2)} ppm</span>
            </div>
          )}
          {typeof data.co2eq === "number" && (
            <div>
              <span className="text-muted-foreground">eCO₂:</span>{" "}
              <span className="font-medium">{data.co2eq.toFixed(0)} ppm</span>
            </div>
          )}
        </div>
      )}
      
      {/* Smell Detection - BSEC2 gas classification */}
      {typeof data.gas_class === "number" && data.gas_class >= 0 && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-muted-foreground">Smell Detection</span>
            <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/50">
              Class {data.gas_class}
            </Badge>
          </div>
          {typeof data.gas_probability === "number" && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Confidence</span>
                <span>{(data.gas_probability as number * 100).toFixed(0)}%</span>
              </div>
              <Progress value={(data.gas_probability as number) * 100} className="h-1.5" />
            </div>
          )}
        </div>
      )}
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
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasScannedRef = useRef(false)
  const lastSensorDataRef = useRef<Record<string, Record<string, unknown>>>({})
  
  // Keep track of last known sensor data to prevent blinking
  useEffect(() => {
    if (sensorData && Object.keys(sensorData).length > 0) {
      lastSensorDataRef.current = { ...lastSensorDataRef.current, ...sensorData }
    }
  }, [sensorData])
  
  // Use merged sensor data (current + cached) to prevent blinking
  const effectiveSensorData = { ...lastSensorDataRef.current, ...sensorData }
  
  const scanPeripherals = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/peripherals`, {
        signal: AbortSignal.timeout(15000),
      })
      const data = await res.json()
      if (data.peripherals && data.peripherals.length > 0) {
        setPeripherals(data.peripherals)
        hasScannedRef.current = true
      }
      // Never clear peripherals once we have them - prevents blinking
      if (data.error && !hasScannedRef.current) {
        setError(data.error)
      }
    } catch (e) {
      // Don't clear peripherals or show error if we already have data
      if (!hasScannedRef.current) {
        setError(String(e))
      }
    } finally {
      setInitialLoading(false)
    }
  }
  
  useEffect(() => {
    scanPeripherals(true)
    // Auto-rescan every 60 seconds (reduced to prevent blinking)
    const interval = setInterval(() => scanPeripherals(false), 60000)
    return () => clearInterval(interval)
  }, [deviceId])
  
  // Map sensor data to peripheral addresses
  // Handle both new format (by address) and legacy format (bme688_1, bme688_2)
  const getSensorDataForPeripheral = (peripheral: PeripheralWidgetProps["peripheral"]) => {
    // Use effectiveSensorData which includes cached values to prevent blinking
    const data = effectiveSensorData
    
    // Try direct address match first
    if (data?.[peripheral.address]) {
      return data[peripheral.address]
    }
    
    // Try legacy BME688 format - firmware uses:
    // bme1 (bme688_1) at 0x77 (AMB)
    // bme2 (bme688_2) at 0x76 (ENV)
    if (peripheral.type === "bme688" || peripheral.type?.includes("bme")) {
      const addressNum = parseInt(peripheral.address, 16)
      
      // Map 0x77 to bme688_1 (bme1/AMB)
      if (addressNum === 0x77 && data?.bme688_1) {
        return data.bme688_1
      }
      // Map 0x76 to bme688_2 (bme2/ENV)  
      if (addressNum === 0x76 && data?.bme688_2) {
        return data.bme688_2
      }
      
      // Fallback: use any available BME688 data
      return data?.bme688_1 || data?.bme688_2
    }
    
    // Try matching by type name
    const typeKey = peripheral.type?.toLowerCase().replace(/[^a-z0-9]/g, "_")
    if (typeKey && data?.[typeKey]) {
      return data[typeKey]
    }
    
    return undefined
  }
  
  if (initialLoading && peripherals.length === 0) {
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
        <Button variant="outline" onClick={() => scanPeripherals(true)}>
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
        <Button variant="ghost" size="sm" onClick={() => scanPeripherals(true)}>
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

























