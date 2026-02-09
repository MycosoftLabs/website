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
  Droplets,
  FlaskConical,
  Zap,
  MapPin,
  TrendingUp,
  Percent,
  Radio,
  Bluetooth,
  Activity
} from "lucide-react"

interface MycoNodeWidgetProps {
  device: DeviceData
  onRefresh?: () => void
  className?: string
  compact?: boolean
}

// MycoNode sensor definitions (soil/substrate monitoring)
const MYCONODE_SENSORS: SensorDisplay[] = [
  {
    key: "soil_moisture",
    label: "Soil Moisture",
    unit: "%",
    icon: <Droplets className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(1) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v < 20) return "text-red-400"
      if (v < 40) return "text-yellow-400"
      if (v < 70) return "text-green-400"
      return "text-blue-400"
    }
  },
  {
    key: "soil_ph",
    label: "Soil pH",
    icon: <FlaskConical className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(1) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v < 5.5) return "text-red-400"
      if (v < 6.0) return "text-yellow-400"
      if (v < 7.5) return "text-green-400"
      return "text-purple-400"
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
      if (v > 100) return "text-purple-400"
      if (v > 50) return "text-cyan-400"
      return "text-gray-400"
    }
  },
  {
    key: "growth_rate",
    label: "Growth Rate",
    unit: "%/day",
    icon: <TrendingUp className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(1) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v > 5) return "text-green-400"
      if (v > 2) return "text-cyan-400"
      return "text-yellow-400"
    }
  },
  {
    key: "colonization",
    label: "Colonization",
    unit: "%",
    icon: <Percent className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(0) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v > 80) return "text-green-400"
      if (v > 50) return "text-cyan-400"
      if (v > 20) return "text-yellow-400"
      return "text-orange-400"
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

// MycoNode control actions
const MYCONODE_CONTROLS: ControlAction[] = [
  {
    id: "stimulate_low",
    label: "Stim Low",
    icon: <Zap className="h-3 w-3 mr-1" />,
    color: "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20",
    peripheral: "stimulation",
    action: "pulse",
    params: { intensity: 25, duration_ms: 1000 },
  },
  {
    id: "stimulate_high",
    label: "Stim High",
    icon: <Activity className="h-3 w-3 mr-1" />,
    color: "border-purple-500/30 text-purple-400 hover:bg-purple-500/20",
    peripheral: "stimulation",
    action: "pulse",
    params: { intensity: 75, duration_ms: 2000 },
  },
  {
    id: "stimulate_stop",
    label: "Stop Stim",
    color: "border-red-500/30 text-red-400 hover:bg-red-500/20",
    peripheral: "stimulation",
    action: "stop",
  },
  {
    id: "ble_broadcast",
    label: "BLE Broadcast",
    icon: <Bluetooth className="h-3 w-3 mr-1" />,
    color: "border-blue-500/30 text-blue-400 hover:bg-blue-500/20",
    peripheral: "ble",
    action: "broadcast",
  },
  {
    id: "lora_send",
    label: "LoRa Send",
    icon: <Radio className="h-3 w-3 mr-1" />,
    color: "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20",
    peripheral: "command",
    action: "lora_send",
    params: { cmd: "lora send status" },
  },
]

export function MycoNodeWidget({ device, onRefresh, className, compact }: MycoNodeWidgetProps) {
  const handleControl = useCallback(async (
    peripheral: string, 
    action: string, 
    params?: Record<string, unknown>
  ) => {
    if (!device.port) return
    const result = await sendDeviceControl(device.port, peripheral, action, params)
    if (!result.success) {
      console.error(`MycoNode control failed: ${result.error}`)
    }
  }, [device.port])
  
  return (
    <DeviceWidgetBase
      device={device}
      title="MycoNode"
      icon={<Droplets className="h-4 w-4" />}
      sensors={MYCONODE_SENSORS}
      controls={MYCONODE_CONTROLS}
      onControl={handleControl}
      onRefresh={onRefresh}
      className={className}
      compact={compact}
    />
  )
}
