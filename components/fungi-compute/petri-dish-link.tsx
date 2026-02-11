/**
 * Petri Dish Link Component - Ultra Compact
 */

"use client"

import { FlaskConical, Link2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function PetriDishLink() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-1.5 p-2">
      <div className="relative">
        <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-md" />
        <FlaskConical className="relative h-6 w-6 text-purple-400" />
      </div>
      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-purple-500/30 text-purple-400">
        <Link2 className="h-2 w-2 mr-1" />
        Synced
      </Badge>
      <span className="text-[8px] text-cyan-400/40">Sim #42</span>
    </div>
  )
}
