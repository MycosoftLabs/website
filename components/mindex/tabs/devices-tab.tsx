"use client"

import useSWR from "swr"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlassCard } from "@/components/ui/glowing-border"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FCIDeviceMonitor } from "@/components/mindex/fci-device-monitor"

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json())

export function DevicesSection() {
  const inventory = useSWR("/api/mindex/devices-inventory/inventory?limit=80", fetcher, { refreshInterval: 120_000 })
  const deployed = useSWR("/api/mindex/devices-inventory/inventory/deployed?limit=80", fetcher, { refreshInterval: 120_000 })
  const suggestions = useSWR("/api/mindex/devices-inventory/suggestions?limit=50", fetcher, { refreshInterval: 120_000 })
  const summary = useSWR("/api/mindex/devices-inventory/inventory/deployed/summary", fetcher, { refreshInterval: 120_000 })

  return (
    <div className="space-y-6">
      <Tabs defaultValue="fleet" className="w-full">
        <TabsList className="flex h-auto min-h-[48px] w-full flex-wrap gap-1 bg-white/5 p-1">
          <TabsTrigger value="fleet" className="min-h-[44px] flex-1 text-base sm:flex-none sm:text-sm">
            Fleet (FCI)
          </TabsTrigger>
          <TabsTrigger value="inventory" className="min-h-[44px] flex-1 text-base sm:flex-none sm:text-sm">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="deployed" className="min-h-[44px] flex-1 text-base sm:flex-none sm:text-sm">
            Deployed
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="min-h-[44px] flex-1 text-base sm:flex-none sm:text-sm">
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="summary" className="min-h-[44px] flex-1 text-base sm:flex-none sm:text-sm">
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="mt-4">
          <FCIDeviceMonitor />
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <GlassCard color="cyan">
            <p className="text-sm text-gray-400 mb-2 font-mono">GET /api/mindex/devices-inventory/inventory</p>
            {inventory.isLoading ? <p className="text-sm text-gray-500">Loading…</p> : null}
            {inventory.error ? <p className="text-sm text-amber-300">Request failed.</p> : null}
            <ScrollArea className="h-64 rounded-md border border-white/10 mt-2">
              <pre className="text-xs font-mono p-3 text-gray-300 whitespace-pre-wrap break-all">
                {JSON.stringify(inventory.data ?? {}, null, 2).slice(0, 12000)}
              </pre>
            </ScrollArea>
          </GlassCard>
        </TabsContent>

        <TabsContent value="deployed" className="mt-4">
          <GlassCard color="green">
            <p className="text-sm text-gray-400 mb-2 font-mono">GET /api/mindex/devices-inventory/inventory/deployed</p>
            {deployed.isLoading ? <p className="text-sm text-gray-500">Loading…</p> : null}
            <ScrollArea className="h-64 rounded-md border border-white/10 mt-2">
              <pre className="text-xs font-mono p-3 text-gray-300 whitespace-pre-wrap break-all">
                {JSON.stringify(deployed.data ?? {}, null, 2).slice(0, 12000)}
              </pre>
            </ScrollArea>
          </GlassCard>
        </TabsContent>

        <TabsContent value="suggestions" className="mt-4">
          <GlassCard color="purple">
            <p className="text-sm text-gray-400 mb-2 font-mono">GET /api/mindex/devices-inventory/suggestions</p>
            {suggestions.isLoading ? <p className="text-sm text-gray-500">Loading…</p> : null}
            <ScrollArea className="h-64 rounded-md border border-white/10 mt-2">
              <pre className="text-xs font-mono p-3 text-gray-300 whitespace-pre-wrap break-all">
                {JSON.stringify(suggestions.data ?? {}, null, 2).slice(0, 12000)}
              </pre>
            </ScrollArea>
          </GlassCard>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <GlassCard color="orange">
            <p className="text-sm text-gray-400 mb-2 font-mono">GET /api/mindex/devices-inventory/inventory/deployed/summary</p>
            <ScrollArea className="h-48 rounded-md border border-white/10 mt-2">
              <pre className="text-xs font-mono p-3 text-gray-300 whitespace-pre-wrap break-all">
                {JSON.stringify(summary.data ?? {}, null, 2)}
              </pre>
            </ScrollArea>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
