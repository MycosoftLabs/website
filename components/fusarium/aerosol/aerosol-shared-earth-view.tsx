"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Globe2, Map as MapIcon, RadioTower } from "lucide-react"
import CREPDashboardLoader from "@/app/dashboard/crep/CREPDashboardLoader"
import { SporeDispersalLayer } from "@/components/crep/earth2/spore-dispersal-layer"
import { WindVectorLayer } from "@/components/crep/earth2/wind-vector-layer"
import FieldRasterLayer from "@/components/crep/layers/field-raster-layer"
import FieldWindLayer from "@/components/crep/layers/field-wind-layer"
import MindexEnvPointsLayer from "@/components/crep/layers/mindex-env-points-layer"
import { AerosolParticulateLayer } from "./aerosol-particulate-layer"
import { fieldLayerList } from "@/lib/crep/fields/registry"
import type { FieldPlaybackSnapshot } from "@/lib/crep/fields/field-playback"
import type { AerosolLayerId } from "@/lib/fusarium/aerosol/contracts"
import {
  sharedCrepLayerIdsForAerosolLayers,
  type SharedEarthLayerStatus,
} from "@/lib/fusarium/aerosol/shared-earth-contracts"
import styles from "./aerosol-map-workbench.module.css"

type ProjectionMode = "globe" | "mercator"

const ARRAYLAKE_FIELD_LAYERS = fieldLayerList()

interface AerosolSharedEarthViewProps {
  enabledLayers: readonly AerosolLayerId[]
  enabledFieldLayerIds: readonly string[]
  statuses: readonly SharedEarthLayerStatus[]
  fieldPlayback?: {
    layerId: string
    playing: boolean
    scrubIndex: number | null
    onStateChange: (snapshot: FieldPlaybackSnapshot) => void
  }
}

function usable(status: SharedEarthLayerStatus | undefined) {
  return status?.state === "available" || status?.state === "stale"
}

export function AerosolSharedEarthView({ enabledLayers, enabledFieldLayerIds, statuses, fieldPlayback }: AerosolSharedEarthViewProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [projection, setProjection] = useState<ProjectionMode>("globe")
  const sharedLayerIds = useMemo(
    () => sharedCrepLayerIdsForAerosolLayers(enabledLayers),
    [enabledLayers],
  )
  const enabledFieldLayers = useMemo(
    () => {
      const selected = new Set(enabledFieldLayerIds)
      return ARRAYLAKE_FIELD_LAYERS.filter((field) => selected.has(field.layerId))
    },
    [enabledFieldLayerIds],
  )
  const sporeStatus = statuses.find((status) => status.layerId === "modeled-spore-dispersal")
  const particulateStatus = statuses.find((status) => status.layerId === "particulate")
  const windStatus = statuses.find((status) => status.layerId === "wind")

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const discover = () => {
      if (cancelled) return
      const candidate = (window as typeof window & { __crep_map?: any }).__crep_map
      const canvas = candidate?.getCanvas?.()
      if (candidate && canvas && rootRef.current?.contains(canvas)) {
        setMap(candidate)
        const current = candidate.getProjection?.()
        const currentType = current?.type || current?.name
        if (currentType === "mercator" || currentType === "globe") setProjection(currentType)
        return
      }
      attempts += 1
      if (attempts < 160) window.setTimeout(discover, 250)
    }
    discover()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!map) return
    const apply = () => {
      try { map.setProjection?.({ type: projection }) } catch { /* style may still be settling */ }
    }
    apply()
    map.on?.("style.load", apply)
    return () => { try { map.off?.("style.load", apply) } catch { /* map teardown */ } }
  }, [map, projection])

  return (
    <div ref={rootRef} className={styles.sharedEarthRoot} data-testid="aerosol-shared-earth-view">
      <CREPDashboardLoader
        embedded
        enabledLayerIds={sharedLayerIds}
        homeHref="/fusarium"
        homeLabel="FUSARIUM"
      />

      {map ? enabledFieldLayers.map(({ dataset, variable, layerId }) => (
        variable.render === "wind" ? (
          <FieldWindLayer
            key={layerId}
            map={map}
            dataset={dataset.id}
            variable={variable.key}
            enabled
            minZoom={dataset.minZoom ?? 0}
          />
        ) : (
          <FieldRasterLayer
            key={layerId}
            map={map}
            dataset={dataset.id}
            variable={variable.key}
            enabled
            playing={fieldPlayback?.layerId === layerId ? fieldPlayback.playing : undefined}
            scrubIndex={fieldPlayback?.layerId === layerId ? fieldPlayback.scrubIndex : null}
            onPlaybackStateChange={fieldPlayback?.layerId === layerId ? fieldPlayback.onStateChange : undefined}
            minZoom={dataset.minZoom ?? 0}
          />
        )
      )) : null}

      {map && enabledLayers.includes("modeled-spore-dispersal") && usable(sporeStatus) ? (
        <SporeDispersalLayer
          map={map}
          visible
          forecastHours={24}
          opacity={0.72}
          showConcentrationGradient
        />
      ) : null}
      {map && enabledLayers.includes("particulate") && usable(particulateStatus) ? (
        <AerosolParticulateLayer map={map} visible />
      ) : null}
      {map && enabledLayers.includes("wind") && windStatus?.source === "earth2-wind" && usable(windStatus) ? (
        <WindVectorLayer
          map={map}
          visible
          forecastHours={0}
          opacity={0.8}
          resolutionDeg={0.5}
          density="medium"
          animated
        />
      ) : null}
      {map && enabledLayers.includes("wind") && windStatus?.source === "mindex-weather" && usable(windStatus) ? (
        <MindexEnvPointsLayer
          map={map}
          enabled
          opacity={0.82}
          endpoint="/api/crep/environment/weather"
          idBase="fusarium-aerosol-mindex-wind"
          color="#66a8ff"
          heatRamp={["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.2, "rgba(66,153,225,0.35)", 0.5, "rgba(55,198,224,0.62)", 0.78, "rgba(129,230,217,0.82)", 1, "rgba(235,255,251,0.95)"]}
          heatRadius={[6, 14, 28, 50]}
          heatIntensity={[0.5, 1.2, 2]}
          popupTitle="Wind observation"
          popupFields={[
            { key: "windSpeedMs", label: "speed", suffix: " m/s" },
            { key: "windDirection", label: "direction", suffix: "°" },
            { key: "source", label: "source" },
            { key: "observedAt", label: "observed" },
          ]}
        />
      ) : null}

      <div className={styles.sharedProjectionControl} aria-label="Shared Earth projection">
        <span><RadioTower size={12} /> Earth Simulator renderer</span>
        <button
          type="button"
          data-active={projection === "mercator"}
          onClick={() => setProjection("mercator")}
          aria-pressed={projection === "mercator"}
          title="Map projection"
        >
          <MapIcon size={15} /> Map
        </button>
        <button
          type="button"
          data-active={projection === "globe"}
          onClick={() => setProjection("globe")}
          aria-pressed={projection === "globe"}
          title="Globe projection"
        >
          <Globe2 size={15} /> Globe
        </button>
        <b data-ready={map ? "true" : "false"}>{map ? "renderer ready" : "renderer loading"}</b>
      </div>
    </div>
  )
}
