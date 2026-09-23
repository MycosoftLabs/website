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
  offline: "text-white",
  connecting: "text-amber-400",
  error: "text-red-400",
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  mycobrain: "MycoBrain",
  mushroom1: "Mushroom1",
  myconode: "MycoNode",
  sporebase: "SporeBase",
  fci: "FCI Probe",
}

const PROBE_TYPE_LABELS: Record<string, string> = {
  copper_steel: "Cu/Steel",
  silver_chloride: "Ag/AgCl",
  platinum_iridium: "Pt/Ir",
  carbon_fiber: "Carbon",
  agar_interface: "Agar",
}

function safeLabel(value: unknown, labels: Record<string, string>, fallback = "-"): string {
  if (value == null) return fallback
  const key = typeof value === "string" ? value : (typeof value === "object" && value !== null && "id" in value ? (value as { id?: string }).id ?? "" : String(value))
  return labels[key] ?? fallback
}

function safeSampleRate(value: unknown): string | number {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (typeof value === "object" && value !== null && "value" in value) return (value as { value?: number }).value ?? "-"
  return "-"
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
      <div className="fungi-empty-banner flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-3 text-center min-h-[44px]">
        <Radio className="h-6 w-6 text-amber-300 mb-0.5 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        <p className="text-sm font-semibold text-white tracking-wide">No FCI devices found</p>
        <p className="text-xs font-medium text-amber-100">
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
                  device.status === "online" ? "bg-emerald-500/20" : "bg-white/15"
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
                      isSelected ? "text-cyan-300" : "text-cyan-100"
                    )}
                  >
                    {device.name}
                  </span>
                  <span 
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      device.status === "online" 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-white/15 text-white"
                    )}
                  >
                    {device.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-cyan-200">
                    {safeLabel(device.type, DEVICE_TYPE_LABELS)}
                  </span>
                  <span className="text-cyan-200">•</span>
                  <span className="text-[10px] text-cyan-200">
                    {safeLabel(device.probeType, PROBE_TYPE_LABELS)}
                  </span>
                  <span className="text-cyan-200">•</span>
                  <span className="text-[10px] text-cyan-200">
                    {typeof device.channels === "number" ? device.channels : "-"}ch
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
                  {safeSampleRate(device.sampleRate)}
                </span>
                <span className="text-[10px] text-cyan-200 ml-0.5">Hz</span>
              </div>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

export default DeviceSelector
