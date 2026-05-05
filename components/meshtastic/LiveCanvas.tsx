"use client"

import { useMeshtasticStream } from "@/hooks/use-meshtastic-stream"
import { playMeshPacketTone } from "@/lib/meshtastic/sonify"

interface LiveCanvasProps {
  /** When true, plays a short tone on each SSE packet (respects mute in localStorage). */
  sonify?: boolean
}

export function LiveCanvas({ sonify = false }: LiveCanvasProps) {
  const { connected, lastPacket, error } = useMeshtasticStream({
    enabled: true,
    onPacket: sonify
      ? (pkt) => {
          void playMeshPacketTone({
            rx_rssi: pkt.rx_rssi,
            port_num: pkt.port_num,
            payload_text: pkt.payload_text ?? null,
          })
        }
      : undefined,
  })

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border/80 bg-background/80 p-4 md:p-6">
        <h2 className="text-base font-semibold md:text-lg">Stream</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Same-origin SSE from <code className="text-xs">/api/meshtastic/stream</code> (MAS Redis tail{" "}
          <code className="text-xs">mesh:packets</code>).
        </p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Connected</dt>
            <dd className="font-mono">{connected ? "yes" : "no"}</dd>
          </div>
          {error ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Last issue</dt>
              <dd className="font-mono text-amber-500">{error}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 md:p-6">
        <h2 className="text-base font-semibold md:text-lg">Latest packet</h2>
        {lastPacket ? (
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg bg-background p-3 text-xs leading-relaxed">
            {JSON.stringify(lastPacket, null, 2)}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Waiting for packets…</p>
        )}
      </div>
    </div>
  )
}
