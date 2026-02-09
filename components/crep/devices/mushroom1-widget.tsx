"use client"

import { useCallback } from "react"
import { 
  DeviceWidgetBase, 
  DeviceData, 
  SensorDisplay, 
  ControlAction,
  sendDeviceControl 
} from "./device-widget-base"
import { 
  Thermometer,
  Droplets,
  Gauge,
  Wind,
  Activity,
  Zap,
  Rainbow,
  Bell,
  Footprints,
  Radio
} from "lucide-react"

interface Mushroom1WidgetProps {
  device: DeviceData
  onRefresh?: () => void
  className?: string
  compact?: boolean
}

// Mushroom 1 sensor definitions
const MUSHROOM1_SENSORS: SensorDisplay[] = [
  {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    icon: <Thermometer className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(1) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v < 15) return "text-blue-400"
      if (v < 25) return "text-green-400"
      if (v < 35) return "text-yellow-400"
      return "text-red-400"
    }
  },
  {
    key: "humidity",
    label: "Humidity",
    unit: "%",
    icon: <Droplets className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(1) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v < 30) return "text-yellow-400"
      if (v < 70) return "text-green-400"
      return "text-blue-400"
    }
  },
  {
    key: "pressure",
    label: "Pressure",
    unit: "hPa",
    icon: <Gauge className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(0) : "N/A",
  },
  {
    key: "voc",
    label: "VOC",
    unit: "ppm",
    icon: <Wind className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(2) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v < 0.5) return "text-green-400"
      if (v < 1.0) return "text-yellow-400"
      return "text-red-400"
    }
  },
  {
    key: "bioelectric",
    label: "Bioelectric",
    unit: "mV",
    icon: <Zap className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(1) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v > 50) return "text-purple-400"
      if (v > 20) return "text-cyan-400"
      return "text-gray-400"
    }
  },
  {
    key: "iaq",
    label: "IAQ",
    icon: <Activity className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(0) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v <= 50) return "text-green-400"
      if (v <= 100) return "text-emerald-400"
      if (v <= 150) return "text-yellow-400"
      if (v <= 200) return "text-orange-400"
      return "text-red-400"
    }
  },
]

// Mushroom 1 control actions
const MUSHROOM1_CONTROLS: ControlAction[] = [
  {
    id: "rainbow",
    label: "Rainbow",
    icon: <Rainbow className="h-3 w-3 mr-1" />,
    color: "border-green-500/30 text-green-400 hover:bg-green-500/20",
    peripheral: "neopixel",
    action: "rainbow",
  },
  {
    id: "beep",
    label: "Beep",
    icon: <Bell className="h-3 w-3 mr-1" />,
    color: "border-amber-500/30 text-amber-400 hover:bg-amber-500/20",
    peripheral: "buzzer",
    action: "beep",
    params: { frequency: 1000, duration_ms: 100 },
  },
  {
    id: "led_off",
    label: "LED Off",
    color: "border-red-500/30 text-red-400 hover:bg-red-500/20",
    peripheral: "neopixel",
    action: "off",
  },
  {
    id: "leg_forward",
    label: "Forward",
    icon: <Footprints className="h-3 w-3 mr-1" />,
    color: "border-blue-500/30 text-blue-400 hover:bg-blue-500/20",
    peripheral: "leg_control",
    action: "forward",
  },
  {
    id: "lora_ping",
    label: "LoRa Ping",
    icon: <Radio className="h-3 w-3 mr-1" />,
    color: "border-purple-500/30 text-purple-400 hover:bg-purple-500/20",
    peripheral: "command",
    action: "lora_ping",
    params: { cmd: "lora ping" },
  },
]

export function Mushroom1Widget({ device, onRefresh, className, compact }: Mushroom1WidgetProps) {
  const handleControl = useCallback(async (
    peripheral: string, 
    action: string, 
    params?: Record<string, unknown>
  ) => {
    if (!device.port) return
    const result = await sendDeviceControl(device.port, peripheral, action, params)
    if (!result.success) {
      console.error(`Mushroom1 control failed: ${result.error}`)
    }
  }, [device.port])
  
  return (
    <DeviceWidgetBase
      device={device}
      title="Mushroom 1"
      icon={<span className="text-lg">🍄</span>}
      sensors={MUSHROOM1_SENSORS}
      controls={MUSHROOM1_CONTROLS}
      onControl={handleControl}
      onRefresh={onRefresh}
      className={className}
      compact={compact}
    />
  )
}
