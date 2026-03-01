"use client"

import { useMemo, useState } from "react"
import Map, { NavigationControl } from "react-map-gl/maplibre"
import maplibregl from "maplibre-gl"
const DEFAULT_DATE = "2000-12-01"
const VALID_DATES = [
  "2000-12-01",
  "1999-12-01",
  "1998-12-01",
  "1990-12-01",
  "1989-12-01",
  "1988-12-01",
  "1985-12-01",
  "1984-12-01",
  "1983-12-01",
]

const LANDSAT_LAYER = "Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual"
const LANDSAT_MATRIX = "GoogleMapsCompatible_Level12"

function buildLandsatStyle(date: string) {
  const tiles = [
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${LANDSAT_LAYER}/default/${date}/${LANDSAT_MATRIX}/{z}/{y}/{x}.jpeg`,
  ]

  return {
    version: 8,
    sources: {
      landsat: {
        type: "raster",
        tiles,
        tileSize: 256,
        minzoom: 0,
        maxzoom: 12,
        scheme: "xyz",
      },
    },
    layers: [
      {
        id: "landsat",
        type: "raster",
        source: "landsat",
        minzoom: 0,
        maxzoom: 12,
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  } as const
}

export default function LandsatViewerDemo() {
  const [date, setDate] = useState(DEFAULT_DATE)
  const mapStyle = useMemo(() => buildLandsatStyle(date), [date])

  return (
    <div className="absolute inset-0 w-full h-full min-h-[60vh]">
      <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur rounded-md p-2 border border-border text-xs space-y-1">
        <div className="font-medium">Landsat WELD True Color</div>
        <div className="text-muted-foreground">GIBS layer: {LANDSAT_LAYER}</div>
        <label className="block text-[11px] text-muted-foreground">
          Available dates (historic only)
        </label>
        <select
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 text-xs rounded border border-border bg-background px-2"
        >
          {VALID_DATES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <Map
        initialViewState={{ longitude: 0, latitude: 10, zoom: 1.2 }}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        maxZoom={12}
        minZoom={0}
        dragRotate={false}
        mapLib={maplibregl}
      >
        <NavigationControl position="bottom-right" showZoom showCompass={false} />
      </Map>
    </div>
  )
}
