"use client"

import { useEffect, useMemo, useState } from "react"
import Map, { NavigationControl } from "react-map-gl/maplibre"
import maplibregl from "maplibre-gl"

const TILE_TEMPLATE = (date: string) =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` +
  `MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/` +
  `GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`

function buildStyle(date: string) {
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
        tiles: [TILE_TEMPLATE(date)],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 9,
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
        maxzoom: 9,
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  } as const
}

export default function DeckGibsDemo() {
  const [gibsDate, setGibsDate] = useState<string | null>(null)

  useEffect(() => {
    const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    setGibsDate(date)
  }, [])

  const mapStyle = useMemo(() => (gibsDate ? buildStyle(gibsDate) : null), [gibsDate])

  return (
    <div className="absolute inset-0 w-full h-full min-h-[60vh] bg-black">
      {mapStyle ? (
        <Map
          initialViewState={{ longitude: 0, latitude: 10, zoom: 2.2 }}
          mapStyle={mapStyle}
          style={{ width: "100%", height: "100%" }}
          maxZoom={9}
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
      <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur rounded-md p-2 border border-border text-xs">
        Raster Zoom — MODIS True Color (NASA GIBS)<br />
        Date: {gibsDate ?? "Loading..."}
      </div>
    </div>
  )
}
