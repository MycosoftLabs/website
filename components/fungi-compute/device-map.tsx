/**
 * Device Map Component - Ultra Compact
 */

"use client"

import { MapPin, Radio } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function DeviceMap() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-1.5 p-2">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md" />
        <MapPin className="relative h-6 w-6 text-emerald-400" />
      </div>
      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-400">
        1 Device
      </Badge>
      <span className="text-[8px] text-cyan-400/40 text-center">Lab A, Station 3</span>
    </div>
  )
}
