"use client"

import { useMemo, useState } from "react"
import Map, { NavigationControl } from "react-map-gl/maplibre"
import maplibregl from "maplibre-gl"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const GIBS_LAYERS = [
  {
    id: "truecolor",
    label: "MODIS Terra True Color",
    layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
    tileMatrix: "GoogleMapsCompatible_Level9",
    format: "jpg",
    isStatic: false,
    dateLagDays: 1,
    maxZoom: 9,
  },
  {
    id: "viirs",
    label: "VIIRS Night Lights",
    layer: "VIIRS_CityLights_2012",
    tileMatrix: "GoogleMapsCompatible_Level8",
    format: "jpg",
    isStatic: true,
    fixedDate: "2012-01-01",
    maxZoom: 8,
  },
  {
    id: "airs",
    label: "AIRS CO (Daily)",
    layer: "AIRS_L3_Carbon_Monoxide_500hPa_Volume_Mixing_Ratio_Daily_Day",
    format: "png",
    isStatic: false,
    dateLagDays: 3,
    maxZoom: 5,
    useWms: true,
    omitTime: true,
  },
] as const

type GibsLayer = (typeof GIBS_LAYERS)[number]

function resolveLayerDate(layer: GibsLayer) {
  const l = layer as any
  if (l.isStatic) return l.fixedDate ?? "2012-01-01"
  if (l.fixedDate) return l.fixedDate
  const lag = l.dateLagDays ?? 1
  return new Date(Date.now() - lag * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function buildGibsStyle(layer: GibsLayer, date: string) {
  const l = layer as any
  const tiles = l.useWms
    ? [
        `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi` +
          `?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1` +
          `&LAYERS=${l.layer}&STYLES=&FORMAT=image/${l.format}` +
          `&TRANSPARENT=TRUE&HEIGHT=256&WIDTH=256&SRS=EPSG:3857` +
          `&BBOX={bbox-epsg-3857}` +
          (l.omitTime ? "" : `&TIME=${date}`),
      ]
    : [
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${l.layer}/default/${date}/${l.tileMatrix}/{z}/{y}/{x}.${l.format}`,
      ]

  return {
    version: 8,
    sources: {
      base: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        scheme: "xyz",
      },
      gibs: {
        type: "raster",
        tiles,
        tileSize: 256,
        minzoom: 0,
        maxzoom: l.maxZoom,
        scheme: "xyz",
      },
    },
    layers: [
      {
        id: "base",
        type: "raster",
        source: "base",
        minzoom: 0,
        maxzoom: 19,
      },
      {
        id: "gibs",
        type: "raster",
        source: "gibs",
        minzoom: 0,
        maxzoom: l.maxZoom,
        paint: {
          "raster-opacity": 0.75,
        },
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  } as const
}

export default function SatelliteTilesDemo() {
  const [layerId, setLayerId] = useState<(typeof GIBS_LAYERS)[number]["id"]>("truecolor")
  const activeLayer = GIBS_LAYERS.find((l) => l.id === layerId) ?? GIBS_LAYERS[0]

  const gibsDate = useMemo(() => resolveLayerDate(activeLayer), [activeLayer])

  const mapStyle = useMemo(
    () => buildGibsStyle(activeLayer, gibsDate),
    [activeLayer, gibsDate]
  )

  return (
    <div className="absolute inset-0 w-full h-full min-h-[60vh]">
      <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur rounded-md p-2 border border-border">
        <div className="text-xs text-muted-foreground mb-1">GIBS Layer</div>
        <Select value={layerId} onValueChange={(v) => setLayerId(v as typeof layerId)}>
          <SelectTrigger className="w-[220px]" size="sm">
            <SelectValue placeholder="Select layer" />
          </SelectTrigger>
          <SelectContent>
            {GIBS_LAYERS.map((layer) => (
              <SelectItem key={layer.id} value={layer.id}>
                {layer.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-[11px] text-muted-foreground mt-2">
          Date: {gibsDate ?? "Loading..."}
        </div>
      </div>

      {mapStyle ? (
        <Map
        initialViewState={{ longitude: 0, latitude: 0, zoom: 1.2 }}
        mapStyle={mapStyle as any}
        style={{ width: "100%", height: "100%" }}
        maxZoom={(activeLayer as any).maxZoom}
        minZoom={0}
        dragRotate={false}
        mapLib={maplibregl}
        >
          <NavigationControl position="bottom-right" showZoom showCompass={false} />
        </Map>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Loading tiles...
        </div>
      )}
    </div>
  )
}
