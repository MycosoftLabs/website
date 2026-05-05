"use client"

import { useCallback, useEffect, useState } from "react"

import { useMeshtasticStream } from "@/hooks/use-meshtastic-stream"
import {
  isMeshtasticAudioMuted,
  playMeshPacketTone,
  setMeshtasticAudioMuted,
} from "@/lib/meshtastic/sonify"

export function AudioLab() {
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    setMuted(isMeshtasticAudioMuted())
  }, [])

  const toggleMute = useCallback(() => {
    const next = !muted
    setMuted(next)
    setMeshtasticAudioMuted(next)
  }, [muted])

  const { connected, lastPacket } = useMeshtasticStream({
    enabled: !muted,
    onPacket: (pkt) => {
      void playMeshPacketTone({
        rx_rssi: pkt.rx_rssi,
        port_num: pkt.port_num,
        payload_text: pkt.payload_text ?? null,
      })
    },
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 md:p-6">
        <h2 className="text-base font-semibold md:text-lg">Sonification</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          RSSI maps to pitch; port name hints timbre; when <code className="text-xs">payload_text</code> is present on the
          SSE event, note length and a small detune follow the real characters (sonification, not speech). Unmute to hear;
          preference persists in <code className="text-xs">localStorage</code>.
        </p>
        <button
          type="button"
          onClick={toggleMute}
          className="mt-4 min-h-[44px] w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-base font-medium touch-manipulation sm:w-auto"
        >
          {muted ? "Unmute live packets" : "Mute"}
        </button>
        <button
          type="button"
          className="mt-3 min-h-[44px] w-full rounded-lg border px-4 py-3 text-base touch-manipulation sm:w-auto"
          onClick={() => void playMeshPacketTone({ rx_rssi: -82, port_num: "POSITION_APP" })}
        >
          Test tone
        </button>
        <p className="mt-4 text-sm text-muted-foreground">
          Stream: {muted ? "paused while muted" : connected ? "connected" : "connecting…"}
        </p>
      </div>
      <div className="rounded-xl border border-border/80 bg-background/80 p-4 md:p-6">
        <h2 className="text-base font-semibold md:text-lg">Last packet (reference)</h2>
        {lastPacket && !muted ? (
          <div className="mt-3 space-y-2">
            {lastPacket.payload_text ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="text-xs font-semibold text-muted-foreground">payload_text</div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{lastPacket.payload_text}</p>
              </div>
            ) : null}
            <pre className="max-h-[280px] overflow-auto rounded-lg bg-muted/30 p-3 text-xs">
              {JSON.stringify(lastPacket, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {muted ? "Unmute to attach SSE and hear packets." : "Waiting…"}
          </p>
        )}
      </div>
    </div>
  )
}
