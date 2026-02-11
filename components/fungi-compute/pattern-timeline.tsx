/**
 * Pattern Timeline - Micro View
 */

"use client"

import { Clock } from "lucide-react"

interface PatternTimelineProps {
  patterns?: any[]
  stats?: any
  className?: string
}

const COLORS: Record<string, string> = {
  growth: "#10b981",
  stress: "#f97316",
  spike: "#ec4899",
  communication: "#06b6d4",
  baseline: "#6b7280",
}

export function PatternTimeline({ patterns = [] }: PatternTimelineProps) {
  if (!patterns || patterns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Clock className="h-3 w-3 text-cyan-400/20" />
      </div>
    )
  }
  
  return (
    <div className="h-full flex items-center gap-0.5 px-1 justify-center">
      {patterns.slice(0, 30).map((p, i) => (
        <div
          key={p.id || i}
          className="w-0.5 h-6 rounded-full hover:h-8 transition-all"
          style={{
            backgroundColor: COLORS[p.type] || COLORS.baseline,
            opacity: 1 - (i / 30) * 0.6,
            boxShadow: `0 0 4px ${COLORS[p.type] || COLORS.baseline}`,
          }}
        />
      ))}
    </div>
  )
}
