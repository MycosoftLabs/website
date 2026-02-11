/**
 * Device Selector Component
 * 
 * FCI device selection with status indicators.
 */

"use client"

import { cn } from "@/lib/utils"
import { FCIDevice, FUNGI_COLORS } from "@/lib/fungi-compute"
import { GlassCard } from "./glass-panel"
import { Radio, Wifi, WifiOff, AlertCircle, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface DeviceSelectorProps {
  devices: FCIDevice[]
  selectedId: string | null
  onSelect: (id: string) => void
  loading?: boolean
}

const STATUS_ICONS = {
  online: Wifi,
  offline: WifiOff,
  connecting: Loader2,
  error: AlertCircle,
}

const STATUS_COLORS = {
  online: "text-emerald-400",
  offline: "text-gray-400",
  connecting: "text-amber-400",
  error: "text-red-400",
}

const DEVICE_TYPE_LABELS = {
  mycobrain: "MycoBrain",
  mushroom1: "Mushroom1",
  myconode: "MycoNode",
  sporebase: "SporeBase",
}

const PROBE_TYPE_LABELS = {
  copper_steel: "Cu/Steel",
  silver_chloride: "Ag/AgCl",
  platinum_iridium: "Pt/Ir",
  carbon_fiber: "Carbon",
  agar_interface: "Agar",
}

export function DeviceSelector({ devices, selectedId, onSelect, loading }: DeviceSelectorProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 rounded-lg bg-cyan-500/10" />
        <Skeleton className="h-16 rounded-lg bg-cyan-500/10" />
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Radio className="h-8 w-8 text-cyan-500/30 mb-2" />
        <p className="text-sm text-cyan-400/50">No FCI devices found</p>
        <p className="text-xs text-cyan-400/30 mt-1">
          Connect a MycoBrain or MycoNode device
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
      {devices.map(device => {
        const StatusIcon = STATUS_ICONS[device.status]
        const isSelected = device.id === selectedId

        return (
          <GlassCard
            key={device.id}
            onClick={() => onSelect(device.id)}
            active={isSelected}
          >
            <div className="flex items-center gap-3">
              {/* Status Icon */}
              <div 
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  device.status === "online" ? "bg-emerald-500/20" : "bg-gray-500/20"
                )}
              >
                <StatusIcon 
                  className={cn(
                    "h-4 w-4",
                    STATUS_COLORS[device.status],
                    device.status === "connecting" && "animate-spin"
                  )}
                />
              </div>

              {/* Device Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span 
                    className={cn(
                      "text-sm font-medium truncate",
                      isSelected ? "text-cyan-300" : "text-cyan-400/80"
                    )}
                  >
                    {device.name}
                  </span>
                  <span 
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      device.status === "online" 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-gray-500/20 text-gray-400"
                    )}
                  >
                    {device.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-cyan-400/50">
                    {DEVICE_TYPE_LABELS[device.type]}
                  </span>
                  <span className="text-cyan-500/30">•</span>
                  <span className="text-[10px] text-cyan-400/50">
                    {PROBE_TYPE_LABELS[device.probeType]}
                  </span>
                  <span className="text-cyan-500/30">•</span>
                  <span className="text-[10px] text-cyan-400/50">
                    {device.channels}ch
                  </span>
                </div>
              </div>

              {/* Sample Rate */}
              <div className="text-right">
                <span 
                  className="text-xs font-mono"
                  style={{ 
                    color: isSelected ? FUNGI_COLORS.glow : "rgba(0, 200, 255, 0.5)",
                    textShadow: isSelected ? `0 0 8px ${FUNGI_COLORS.glow}` : "none"
                  }}
                >
                  {device.sampleRate}
                </span>
                <span className="text-[10px] text-cyan-400/40 ml-0.5">Hz</span>
              </div>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

export default DeviceSelector
