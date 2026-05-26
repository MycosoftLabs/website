"use client"

import { useEffect, useState, useMemo } from "react"
import useSWR from "swr"
import Link from "next/link"
import { DevicePageShell } from "@/components/natureos/device-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink } from "lucide-react"

interface PresencePayload {
  device_id: string
  nickname?: string
  host_kind?: string
  host_ip?: string
  agent_url?: string
  agent_version?: string
  side_a_fw?: string
  side_b_fw?: string
  openclaw_available?: boolean
  online: boolean
  last_seen?: string
}

interface PresenceResponse {
  devices: PresencePayload[]
  ts: string
  source: string
}

const fetcher = async (url: string): Promise<PresenceResponse> => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("fetch_failed")
  return res.json()
}

export default function MqttLivePage() {
  const { data, error, isLoading } = useSWR<PresenceResponse>(
    "/api/devices/mqtt/presence",
    fetcher,
    { refreshInterval: 5000 }
  )

  const devices = useMemo(() => data?.devices ?? [], [data])
  const onlineCount = devices.filter((d) => d.online).length

  return (
    <DevicePageShell
      heading="MQTT Live Fleet"
      text="Mirror of mqtt-status.mycosoft.com inside NatureOS. Subscribes to mycosoft/devices/+/presence and shows every paired MycoBrain in real time. Gated to @mycosoft.org/.com."
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-sm">
          <Badge variant={onlineCount > 0 ? "default" : "secondary"}>
            {onlineCount} / {devices.length} online
          </Badge>
          {data?.ts && (
            <span className="text-muted-foreground text-xs">
              updated {new Date(data.ts).toLocaleTimeString()}
            </span>
          )}
          {data?.source && (
            <span className="text-muted-foreground text-xs">via {data.source}</span>
          )}
        </div>
        <a
          href="https://mqtt-status.mycosoft.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"
        >
          public mirror <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6 text-destructive">
            Failed to load presence stream.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && devices.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            No retained presence records on mycosoft/devices/+/presence yet. Bring a MycoBrain
            agent online (`sudo systemctl start mycobrain-agent`) and refresh.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <Link
            key={d.device_id}
            href={`/natureos/devices/${encodeURIComponent(d.device_id)}`}
            className="block"
          >
            <Card className="hover:border-primary transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {d.nickname || d.device_id}
                  </CardTitle>
                  <Badge variant={d.online ? "default" : "secondary"} className="text-[10px]">
                    {d.online ? "online" : "offline"}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {d.device_id}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">host</span>
                  <span className="font-mono">{d.host_ip || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">kind</span>
                  <span>{d.host_kind || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">side A fw</span>
                  <span className="font-mono">{d.side_a_fw || "—"}</span>
                </div>
                {d.side_b_fw && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">side B fw</span>
                    <span className="font-mono">{d.side_b_fw}</span>
                  </div>
                )}
                {d.openclaw_available && (
                  <Badge variant="outline" className="text-[10px]">OpenClaw</Badge>
                )}
                {d.last_seen && (
                  <div className="text-muted-foreground text-[10px] pt-1">
                    last seen {new Date(d.last_seen).toLocaleTimeString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </DevicePageShell>
  )
}
