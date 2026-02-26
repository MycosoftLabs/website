/**
 * Connection Status Component
 * 
 * WebSocket connection status indicator with glow effects.
 */

"use client"

import { cn } from "@/lib/utils"
import { ConnectionStatus as ConnectionStatusType } from "@/lib/fungi-compute"
import { Wifi, WifiOff, Loader2, AlertCircle, RefreshCw } from "lucide-react"

interface ConnectionStatusProps {
  status: ConnectionStatusType
  className?: string
}

const STATUS_CONFIG = {
  disconnected: {
    icon: WifiOff,
    label: "Disconnected",
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
    glowColor: "transparent",
  },
  connecting: {
    icon: Loader2,
    label: "Connecting...",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    glowColor: "rgba(245, 158, 11, 0.3)",
    animate: true,
  },
  connected: {
    icon: Wifi,
    label: "Connected",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    glowColor: "rgba(16, 185, 129, 0.4)",
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    glowColor: "rgba(239, 68, 68, 0.3)",
  },
  reconnecting: {
    icon: RefreshCw,
    label: "Reconnecting...",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    glowColor: "rgba(245, 158, 11, 0.3)",
    animate: true,
  },
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  const statusKey = typeof status === "string" ? status : "disconnected"
  const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.disconnected
  const Icon = config.icon

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg",
        config.bgColor,
        "border border-opacity-30",
        className
      )}
      style={{
        boxShadow: config.glowColor !== "transparent" ? `0 0 15px ${config.glowColor}` : undefined,
        borderColor: config.glowColor,
      }}
    >
      {/* Animated Pulse Dot */}
      <div className="relative">
        <div 
          className={cn(
            "h-2 w-2 rounded-full",
            statusKey === "connected" && "bg-emerald-400",
            statusKey === "connecting" && "bg-amber-400",
            statusKey === "reconnecting" && "bg-amber-400",
            statusKey === "error" && "bg-red-400",
            statusKey === "disconnected" && "bg-gray-400"
          )}
          style={{
            boxShadow: statusKey === "connected" 
              ? `0 0 8px ${config.glowColor}` 
              : undefined
          }}
        />
        {(statusKey === "connected" || statusKey === "connecting" || statusKey === "reconnecting") && (
          <div 
            className={cn(
              "absolute inset-0 rounded-full animate-ping",
              statusKey === "connected" && "bg-emerald-400",
              (statusKey === "connecting" || statusKey === "reconnecting") && "bg-amber-400"
            )}
            style={{ animationDuration: "2s" }}
          />
        )}
      </div>

      {/* Icon */}
      <Icon 
        className={cn(
          "h-4 w-4",
          config.color,
          config.animate && "animate-spin"
        )}
        style={{
          filter: statusKey === "connected" 
            ? `drop-shadow(0 0 4px ${config.glowColor})` 
            : undefined
        }}
      />

      {/* Label */}
      <span 
        className={cn(
          "text-xs font-medium",
          config.color
        )}
        style={{
          textShadow: statusKey === "connected" 
            ? `0 0 8px ${config.glowColor}` 
            : undefined
        }}
      >
        {config.label}
      </span>
    </div>
  )
}

export default ConnectionStatus
