"use client"

import useSWR from "swr"
import { Activity, Cpu, Loader2, Radio, Shield, TriangleAlert } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface ApiResponse<T> {
  data: T
  meta?: { total?: number }
}

interface Device {
  id: string
  name: string
  type: string
  status: string
  lastSeen: string
  firmwareVersion?: string
  location?: { latitude: number; longitude: number; region?: string }
}

function fetcher(url: string) {
  return fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

export function FCIDeviceMonitor({ className }: { className?: string }) {
  const devices = useSWR<ApiResponse<Device[]>>("/api/mindex/devices?page=1&pageSize=50", fetcher, { refreshInterval: 20_000 })

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-purple-400" />
          Devices & FCI Monitoring
        </CardTitle>
        <CardDescription>
          Device inventory + readiness for Fungal Computer Interface (FCI) streams. (FCI channel telemetry requires a device bridge to publish readings.)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {devices.isLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading devices…
          </div>
        ) : devices.error ? (
          <div className="text-xs text-yellow-200/80 border border-yellow-500/20 bg-yellow-500/10 rounded-md px-3 py-2 flex items-start gap-2">
            <TriangleAlert className="h-4 w-4 mt-0.5" />
            <div>
              <div className="font-medium">Devices unavailable</div>
              <div className="text-yellow-200/70">
                This panel requires a live MINDEX backend for <span className="font-mono">/api/mindex/devices</span>.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <Stat label="devices" value={String(devices.data?.data?.length ?? 0)} icon={Radio} />
              <Stat label="fcI_ready" value="bridge_required" icon={Shield} />
              <Stat label="streams" value="mycorrhizae+sse" icon={Activity} />
            </div>

            <ScrollArea className="h-[320px] rounded-2xl border border-white/10 bg-black/20">
              <div className="p-3 space-y-2">
                {(devices.data?.data ?? []).map((d) => (
                  <div key={d.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{d.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {d.id} • {d.type} • {d.status}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          lastSeen {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "—"}
                        </div>
                        {d.location ? (
                          <div className="text-xs text-muted-foreground font-mono">
                            {d.location.latitude.toFixed(4)}, {d.location.longitude.toFixed(4)}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {d.firmwareVersion ? <div className="font-mono">fw {d.firmwareVersion}</div> : null}
                      </div>
                    </div>
                  </div>
                ))}

                {(devices.data?.data ?? []).length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">No devices.</div>
                ) : null}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card className="border-white/10 bg-black/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-purple-300" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm font-mono">{value}</div>
      </CardContent>
    </Card>
  )
}

