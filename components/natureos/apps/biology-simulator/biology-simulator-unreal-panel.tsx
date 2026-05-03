"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface BridgePayload {
  bridge: string
  enabled: boolean
  pixelStreamUrl: string | null
  signalingUrl: string | null
  message: string
}

export function BiologySimulatorUnrealPanel() {
  const [payload, setPayload] = useState<BridgePayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/natureos/biology-simulator/unreal-bridge", { cache: "no-store" })
        const json = (await res.json()) as BridgePayload
        if (!cancelled) setPayload(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "bridge_fetch_failed")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className="border-border/80">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg sm:text-xl">Unreal / Pixel Streaming bridge</CardTitle>
          {payload ? (
            <Badge variant={payload.enabled ? "default" : "secondary"}>
              {payload.enabled ? "Configured" : "Not configured"}
            </Badge>
          ) : null}
        </div>
        <CardDescription className="text-base">
          Configuration comes from{" "}
          <code className="text-xs bg-muted px-1 rounded">/api/natureos/biology-simulator/unreal-bridge</code> — no
          placeholder viewport or fake stream.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm sm:text-base">
        {error ? <p className="text-destructive">{error}</p> : null}
        {!payload && !error ? <p className="text-muted-foreground">Loading bridge status…</p> : null}
        {payload ? (
          <>
            <p className="text-muted-foreground">{payload.message}</p>
            {payload.enabled && payload.pixelStreamUrl ? (
              <p className="text-xs text-muted-foreground break-all font-mono">{payload.pixelStreamUrl}</p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
