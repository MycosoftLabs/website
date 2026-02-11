/**
 * Earth Correlation Component - Ultra Compact
 */

"use client"

import { Globe, TrendingUp, CloudRain } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function EarthCorrelation() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-1.5 p-2">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-md" />
        <Globe className="relative h-6 w-6 text-blue-400" />
      </div>
      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-500/30 text-blue-400">
        <TrendingUp className="h-2 w-2 mr-1" />
        0.73
      </Badge>
      <span className="text-[8px] text-cyan-400/40 flex items-center gap-1">
        <CloudRain className="h-2.5 w-2.5" />
        Rain +2h
      </span>
    </div>
  )
}
