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
  Network,
  Users,
  Signal,
  Router,
  Radio,
  Send,
  RefreshCw,
  Cpu
} from "lucide-react"

interface Hyphae1WidgetProps {
  device: DeviceData
  onRefresh?: () => void
  className?: string
  compact?: boolean
}

// Hyphae 1 sensor definitions (mesh network gateway)
const HYPHAE1_SENSORS: SensorDisplay[] = [
  {
    key: "node_count",
    label: "Connected Nodes",
    icon: <Users className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toString() : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v > 10) return "text-green-400"
      if (v > 5) return "text-cyan-400"
      return "text-yellow-400"
    }
  },
  {
    key: "mesh_health",
    label: "Mesh Health",
    unit: "%",
    icon: <Network className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(0) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v > 80) return "text-green-400"
      if (v > 50) return "text-yellow-400"
      return "text-red-400"
    }
  },
  {
    key: "signal_strength",
    label: "Signal",
    unit: "dBm",
    icon: <Signal className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toFixed(0) : "N/A",
    color: (v) => {
      if (typeof v !== "number") return "text-muted-foreground"
      if (v > -50) return "text-green-400"
      if (v > -70) return "text-yellow-400"
      return "text-red-400"
    }
  },
  {
    key: "packets_relayed",
    label: "Packets Relayed",
    icon: <Send className="h-3 w-3" />,
    format: (v) => typeof v === "number" ? v.toLocaleString() : "N/A",
  },
  {
    key: "gateway_status",
    label: "Gateway",
    icon: <Router className="h-3 w-3" />,
    format: (v) => v === true ? "Active" : v === false ? "Standby" : "N/A",
    color: (v) => v === true ? "text-green-400" : "text-yellow-400"
  },
  {
    key: "edge_compute_active",
    label: "Edge Compute",
    icon: <Cpu className="h-3 w-3" />,
    format: (v) => v === true ? "Running" : v === false ? "Idle" : "N/A",
    color: (v) => v === true ? "text-purple-400" : "text-muted-foreground"
  },
]

// Hyphae 1 control actions
const HYPHAE1_CONTROLS: ControlAction[] = [
  {
    id: "scan_network",
    label: "Scan Network",
    icon: <RefreshCw className="h-3 w-3 mr-1" />,
    color: "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20",
    peripheral: "command",
    action: "scan_network",
    params: { cmd: "mesh scan" },
  },
  {
    id: "lora_broadcast",
    label: "Broadcast",
    icon: <Radio className="h-3 w-3 mr-1" />,
    color: "border-purple-500/30 text-purple-400 hover:bg-purple-500/20",
    peripheral: "lora_relay",
    action: "broadcast",
    params: { message: "ping" },
  },
  {
    id: "enable_gateway",
    label: "Enable Gateway",
    icon: <Router className="h-3 w-3 mr-1" />,
    color: "border-green-500/30 text-green-400 hover:bg-green-500/20",
    peripheral: "lora_gateway",
    action: "enable",
  },
  {
    id: "edge_compute",
    label: "Run Edge",
    icon: <Cpu className="h-3 w-3 mr-1" />,
    color: "border-orange-500/30 text-orange-400 hover:bg-orange-500/20",
    peripheral: "edge_compute",
    action: "start",
  },
]

export function Hyphae1Widget({ device, onRefresh, className, compact }: Hyphae1WidgetProps) {
  const handleControl = useCallback(async (
    peripheral: string, 
    action: string, 
    params?: Record<string, unknown>
  ) => {
    if (!device.port) return
    const result = await sendDeviceControl(device.port, peripheral, action, params)
    if (!result.success) {
      console.error(`Hyphae1 control failed: ${result.error}`)
    }
  }, [device.port])
  
  return (
    <DeviceWidgetBase
      device={device}
      title="Hyphae 1"
      icon={<Network className="h-4 w-4" />}
      sensors={HYPHAE1_SENSORS}
      controls={HYPHAE1_CONTROLS}
      onControl={handleControl}
      onRefresh={onRefresh}
      className={className}
      compact={compact}
    />
  )
}
