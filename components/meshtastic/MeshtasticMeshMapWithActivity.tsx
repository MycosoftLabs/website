"use client"

import type { FeatureCollection } from "geojson"
import { useMemo } from "react"

import { MeshMap, type MeshMapProps } from "@/components/meshtastic/MeshMap"
import { useMeshtasticNodes } from "@/hooks/use-meshtastic-nodes"
import { useMeshtasticPackets } from "@/hooks/use-meshtastic-packets"
import { packetRowsToStreamPackets } from "@/lib/meshtastic/packet-to-stream"
import { packetsToLinkGeoJson, streamPacketsToSignalGeoJson } from "@/lib/meshtastic/signal-geo"
import { cn } from "@/lib/utils"

export interface MeshtasticMeshMapWithActivityProps extends Omit<
  MeshMapProps,
  "signalGeoJson" | "linkGeoJson" | "showHeatStyle" | "showGhostStyle"
> {
  /** Max packets to pull for activity overlay (default 800). */
  packetLimit?: number
}

/**
 * TennMesh-style density: overlays recent packet-derived RX positions (cyan/orange)
 * and hop arcs when both endpoints have coordinates in MINDEX nodes.
 */
export function MeshtasticMeshMapWithActivity({
  packetLimit = 800,
  className,
  ...meshProps
}: MeshtasticMeshMapWithActivityProps) {
  const { packets } = useMeshtasticPackets({ limit: packetLimit })
  const { nodes } = useMeshtasticNodes()

  const streamLike = useMemo(() => packetRowsToStreamPackets(packets), [packets])

  const signalGeoJson = useMemo(
    () => streamPacketsToSignalGeoJson(streamLike),
    [streamLike]
  ) as FeatureCollection

  const linkGeoJson = useMemo(
    () => packetsToLinkGeoJson(streamLike, nodes),
    [streamLike, nodes]
  ) as FeatureCollection

  const activityPoints = signalGeoJson.features.length

  return (
    <div className={cn("space-y-3", className)}>
      <MeshMap
        {...meshProps}
        signalGeoJson={signalGeoJson}
        linkGeoJson={linkGeoJson}
        showHeatStyle={activityPoints > 0}
        showGhostStyle={activityPoints > 0}
        colorByHash={meshProps.colorByHash ?? true}
      />
      {activityPoints > 0 ? (
        <p className="text-xs text-muted-foreground">
          {activityPoints} activity points from recent packets with decoded positions; arcs link RX toward known node
          coords when available.
        </p>
      ) : null}
    </div>
  )
}
