"use client"

import dynamic from "next/dynamic"
import { GlassCard } from "@/components/ui/glowing-border"

const AdvancedTopology3D = dynamic(
  () => import("@/components/mas/topology/advanced-topology-3d").then((m) => ({ default: m.AdvancedTopology3D })),
  { ssr: false, loading: () => <div className="h-[480px] flex items-center justify-center text-gray-500 text-sm">Loading topology…</div> },
)

export function AgentsSection() {
  return (
    <div className="space-y-4">
      <GlassCard color="purple">
        <p className="text-sm text-gray-400 mb-4">
          MAS agent mesh (same 3D topology as AI Studio). Node data is fetched from the live MAS registry when the
          topology component mounts — not a decorative mock graph.
        </p>
        <div className="h-[min(70vh,640px)] min-h-[360px] rounded-lg border border-purple-500/25 overflow-hidden bg-black/50">
          <AdvancedTopology3D className="h-full w-full" fullScreen={false} />
        </div>
      </GlassCard>
    </div>
  )
}
