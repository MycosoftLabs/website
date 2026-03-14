"use client"

import { useMemo } from "react"
import useSWR from "swr"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Terminal } from "lucide-react"

interface NetworkDevice {
  device_id: string
  device_name?: string
  device_display_name?: string
  device_role?: string
  host?: string
  port?: number
  status?: string
  openclaw_url?: string | null
}

interface HostEntry {
  host: string
  openclaw_url: string
  devices: NetworkDevice[]
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Request failed")
  return response.json()
}

function formatDeviceLabel(device: NetworkDevice) {
  return (
    device.device_display_name ||
    device.device_name ||
    device.device_role ||
    device.device_id
  )
}

export function OnSiteAIPanel() {
  const { data, error, isLoading } = useSWR<{ devices?: NetworkDevice[] }>(
    "/api/devices/network?include_offline=true",
    fetcher,
    { refreshInterval: 15000 }
  )

  const hosts = useMemo<HostEntry[]>(() => {
    const devices = Array.isArray(data?.devices) ? data.devices : []
    const byHost = new Map<string, NetworkDevice[]>()
    for (const d of devices) {
      if (d.openclaw_url && d.host) {
        const list = byHost.get(d.host) ?? []
        list.push(d)
        byHost.set(d.host, list)
      }
    }
    return Array.from(byHost.entries()).map(([host, devs]) => ({
      host,
      openclaw_url: devs[0]!.openclaw_url!,
      devices: devs,
    }))
  }, [data?.devices])

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load devices. Ensure MAS is reachable.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Loading devices...</p>
        </CardContent>
      </Card>
    )
  }

  if (hosts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>On-Site AI (OpenClaw)</CardTitle>
          <CardDescription>
            No gateway devices with OpenClaw detected. OpenClaw runs on the same host as your
            MycoBrain gateway. Deploy OpenClaw to your Jetson or gateway host, then devices
            with a host address will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Run <code className="rounded bg-muted px-1 py-0.5">install_openclaw.sh</code> on
            your Jetson to enable On-Site AI.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>On-Site AI (OpenClaw)</CardTitle>
          <CardDescription>
            Manage MycoBrain devices via OpenClaw from your browser. Open the Control UI for
            chat, config, logs, and shell. You must be on the same LAN or VPN as the device.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {hosts.map((entry) => (
          <Card key={entry.host}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{entry.host}</CardTitle>
              <CardDescription>
                {entry.devices.length} device(s):{" "}
                {entry.devices.map((d) => formatDeviceLabel(d)).join(", ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <a
                    href={entry.openclaw_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open OpenClaw
                  </a>
                </Button>
              </div>
              <div className="rounded-md border bg-muted/50 p-3 text-xs">
                <p className="mb-1 flex items-center gap-1 font-medium">
                  <Terminal className="h-3 w-3" />
                  Shell (SSH)
                </p>
                <code className="block break-all">
                  ssh mycosoft@{entry.host}
                </code>
                <p className="mt-1 text-muted-foreground">
                  Then run OpenClaw commands in the terminal.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
