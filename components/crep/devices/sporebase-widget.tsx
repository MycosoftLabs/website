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
  Sparkles,
  Wind,
  Boxes,
  Camera,
  RotateCw,
  HardDrive,
  MapPin,
  Disc
} from "lucide-react"

interface SporeBaseWidgetProps {
  device: DeviceData
  onRefresh?: () => void
  className?: string
  compact?: boolean
}

// SporeBase sensor definitions
const SPOREBASE_SENSORS: SensorDisplay[] = [
  {
    key: "spore_count",
    label: "Spore Count",
    unit: "/m³",
    icon: <Sparkles className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toLocaleString() : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v > 10000) return "text-purple-400"
      if (v > 5000) return "text-cyan-400"
      return "text-green-400"
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
      return "text-red-400"
    }
  },
  {
    key: "particle_count",
    label: "Particles",
    unit: "/m³",
    icon: <Boxes className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toLocaleString() : "N/A",
  },
  {
    key: "sample_count",
    label: "Samples",
    icon: <Disc className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toString() : "N/A",
  },
  {
    key: "storage_percent",
    label: "Storage",
    unit: "%",
    icon: <HardDrive className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(0) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v > 90) return "text-red-400"
      if (v > 70) return "text-yellow-400"
      return "text-green-400"
    }
  },
  {
    key: "tape_health",
    label: "Tape Health",
    unit: "%",
    icon: <Disc className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(0) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v < 20) return "text-red-400"
      if (v < 50) return "text-yellow-400"
      return "text-green-400"
    }
  },
  {
    key: "smell_detected",
    label: "Smell",
    icon: <Wind className="h-3 w-3" />,
    format: (v) => v ? String(v) : "None",
    color: (v) => v ? "text-purple-400" : "text-muted-foreground"
  },
  {
    key: "gps_fix",
    label: "GPS",
    icon: <MapPin className="h-3 w-3" />,
    format: (v) => v ? "Fixed" : "No Fix",
    color: (v) => v ? "text-green-400" : "text-yellow-400"
  },
]

// SporeBase control actions
const SPOREBASE_CONTROLS: ControlAction[] = [
  {
    id: "capture",
    label: "Capture",
    icon: <Camera className="h-3 w-3 mr-1" />,
    color: "border-purple-500/30 text-purple-400 hover:bg-purple-500/20",
    peripheral: "tape_imaging",
    action: "capture",
  },
  {
    id: "collect",
    label: "Collect",
    icon: <RotateCw className="h-3 w-3 mr-1" />,
    color: "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20",
    peripheral: "collection_motor",
    action: "collect",
    params: { duration_ms: 5000 },
  },
  {
    id: "motor_stop",
    label: "Stop Motor",
    color: "border-red-500/30 text-red-400 hover:bg-red-500/20",
    peripheral: "collection_motor",
    action: "stop",
  },
  {
    id: "advance_tape",
    label: "Advance Tape",
    icon: <Disc className="h-3 w-3 mr-1" />,
    color: "border-green-500/30 text-green-400 hover:bg-green-500/20",
    peripheral: "tape_imaging",
    action: "advance",
    params: { steps: 1 },
  },
]

export function SporeBaseWidget({ device, onRefresh, className, compact }: SporeBaseWidgetProps) {
  const handleControl = useCallback(async (
    peripheral: string, 
    action: string, 
    params?: Record<string, unknown>
  ) => {
    if (!device.port) return
    const result = await sendDeviceControl(device.port, peripheral, action, params)
    if (!result.success) {
      console.error(`SporeBase control failed: ${result.error}`)
    }
  }, [device.port])
  
  return (
    <DeviceWidgetBase
      device={device}
      title="SporeBase"
      icon={<Sparkles className="h-4 w-4" />}
      sensors={SPOREBASE_SENSORS}
      controls={SPOREBASE_CONTROLS}
      onControl={handleControl}
      onRefresh={onRefresh}
      className={className}
      compact={compact}
    />
  )
}
