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
  AlertTriangle,
  Wind,
  Boxes,
  Bug,
  MapPin,
  Siren,
  Lightbulb,
  ShieldAlert,
  Activity
} from "lucide-react"

interface AlarmWidgetProps {
  device: DeviceData
  onRefresh?: () => void
  className?: string
  compact?: boolean
}

// Alarm sensor definitions (air quality and pathogen detection)
const ALARM_SENSORS: SensorDisplay[] = [
  {
    key: "co2",
    label: "CO2",
    unit: "ppm",
    icon: <Wind className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(0) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v < 600) return "text-green-400"
      if (v < 1000) return "text-yellow-400"
      if (v < 2000) return "text-orange-400"
      return "text-red-400"
    }
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
      if (v < 3.0) return "text-orange-400"
      return "text-red-400"
    }
  },
  {
    key: "particulate",
    label: "PM2.5",
    unit: "µg/m³",
    icon: <Boxes className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(1) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v < 12) return "text-green-400"
      if (v < 35) return "text-yellow-400"
      if (v < 55) return "text-orange-400"
      return "text-red-400"
    }
  },
  {
    key: "aqi",
    label: "AQI",
    icon: <Activity className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(0) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v <= 50) return "text-green-400"
      if (v <= 100) return "text-yellow-400"
      if (v <= 150) return "text-orange-400"
      if (v <= 200) return "text-red-400"
      return "text-purple-400"
    }
  },
  {
    key: "pathogen_detected",
    label: "Pathogen",
    icon: <Bug className="h-3 w-3" />,
    format: (v) => {
      if (v === true) return "DETECTED"
      if (v === false) return "Clear"
      return "N/A"
    },
    color: (v) => {
      if (v === true) return "text-red-400"
      if (v === false) return "text-green-400"
      return "text-muted-foreground"
    }
  },
  {
    key: "threat_level",
    label: "Threat",
    icon: <ShieldAlert className="h-3 w-3" />,
    format: (v) => {
      if (typeof v === "number") {
        if (v === 0) return "None"
        if (v === 1) return "Low"
        if (v === 2) return "Medium"
        if (v === 3) return "High"
        return "Critical"
      }
      return "N/A"
    },
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v === 0) return "text-green-400"
      if (v === 1) return "text-yellow-400"
      if (v === 2) return "text-orange-400"
      return "text-red-400"
    }
  },
  {
    key: "gps_fix",
    label: "GPS",
    icon: <MapPin className="h-3 w-3" />,
    format: (v) => v ? "Fixed" : "No Fix",
    color: (v) => v ? "text-green-400" : "text-yellow-400"
  },
]

// Alarm control actions
const ALARM_CONTROLS: ControlAction[] = [
  {
    id: "test_siren",
    label: "Test Siren",
    icon: <Siren className="h-3 w-3 mr-1" />,
    color: "border-red-500/30 text-red-400 hover:bg-red-500/20",
    peripheral: "siren",
    action: "test",
    params: { duration_ms: 500 },
  },
  {
    id: "siren_off",
    label: "Siren Off",
    color: "border-gray-500/30 text-gray-400 hover:bg-gray-500/20",
    peripheral: "siren",
    action: "off",
  },
  {
    id: "led_red",
    label: "Red Alert",
    icon: <Lightbulb className="h-3 w-3 mr-1" />,
    color: "border-red-500/30 text-red-400 hover:bg-red-500/20",
    peripheral: "led_array",
    action: "pattern",
    params: { pattern: "alert_red" },
  },
  {
    id: "led_green",
    label: "All Clear",
    icon: <Lightbulb className="h-3 w-3 mr-1" />,
    color: "border-green-500/30 text-green-400 hover:bg-green-500/20",
    peripheral: "led_array",
    action: "pattern",
    params: { pattern: "all_clear" },
  },
  {
    id: "led_off",
    label: "LEDs Off",
    color: "border-gray-500/30 text-gray-400 hover:bg-gray-500/20",
    peripheral: "led_array",
    action: "off",
  },
  {
    id: "arm",
    label: "Arm",
    icon: <ShieldAlert className="h-3 w-3 mr-1" />,
    color: "border-orange-500/30 text-orange-400 hover:bg-orange-500/20",
    peripheral: "command",
    action: "arm",
    params: { cmd: "arm" },
  },
]

export function AlarmWidget({ device, onRefresh, className, compact }: AlarmWidgetProps) {
  const handleControl = useCallback(async (
    peripheral: string, 
    action: string, 
    params?: Record<string, unknown>
  ) => {
    if (!device.port) return
    const result = await sendDeviceControl(device.port, peripheral, action, params)
    if (!result.success) {
      console.error(`Alarm control failed: ${result.error}`)
    }
  }, [device.port])
  
  return (
    <DeviceWidgetBase
      device={device}
      title="ALARM"
      icon={<AlertTriangle className="h-4 w-4" />}
      sensors={ALARM_SENSORS}
      controls={ALARM_CONTROLS}
      onControl={handleControl}
      onRefresh={onRefresh}
      className={className}
      compact={compact}
    />
  )
}
