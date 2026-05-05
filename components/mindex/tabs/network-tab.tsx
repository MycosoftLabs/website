"use client"

import useSWR from "swr"
import { GlassCard } from "@/components/ui/glowing-border"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MycorrhizalNetworkViz } from "@/components/mindex/mycorrhizal-network-viz"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function NetworkSection() {
  const { data, error, isLoading } = useSWR("/api/mindex/network/nodes", fetcher, { refreshInterval: 60_000 })

  return (
    <div className="space-y-6">
      <GlassCard color="green">
        <h3 className="text-lg font-semibold text-white mb-2">Storage / network nodes</h3>
        <p className="text-sm text-gray-400 mb-2">
          Live <span className="font-mono">GET /api/mindex/network/nodes</span> (BFF). Map overlays ship in CREP; this list is
          the operational inventory slice.
        </p>
        {isLoading ? <p className="text-sm text-gray-500">Loading…</p> : null}
        {error ? <p className="text-sm text-amber-300">Failed to load nodes.</p> : null}
        <ScrollArea className="h-48 rounded-md border border-white/10 mt-2">
          <pre className="text-xs font-mono p-3 text-gray-300 whitespace-pre-wrap break-all">
            {JSON.stringify(data ?? {}, null, 2).slice(0, 8000)}
          </pre>
        </ScrollArea>
      </GlassCard>
      <MycorrhizalNetworkViz />
    </div>
  )
}
