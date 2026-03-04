"use client"

interface VesselBadgeProps {
  stage: string
  className?: string
}

const VESSEL_COLORS: Record<string, string> = {
  animal: "bg-gray-600/50 text-gray-300",
  baby: "bg-blue-600/50 text-blue-200",
  child: "bg-green-600/50 text-green-200",
  teenager: "bg-amber-600/50 text-amber-200",
  adult: "bg-purple-600/50 text-purple-200",
  machine: "bg-cyan-600/50 text-cyan-200",
}

export function VesselBadge({ stage, className = "" }: VesselBadgeProps) {
  const key = stage?.toLowerCase() ?? ""
  const color = VESSEL_COLORS[key] ?? "bg-gray-700 text-gray-400"
  const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : "Unknown"
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color} ${className}`}
    >
      {label}
    </span>
  )
}
