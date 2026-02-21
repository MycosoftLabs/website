"use client"

import { EarthSimulatorContainer } from "@/components/earth-simulator/earth-simulator-container"

export function EarthSimulatorEmbed() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black text-white">
      <EarthSimulatorContainer variant="embedded" />
    </div>
  )
}
