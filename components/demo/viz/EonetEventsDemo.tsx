"use client"

import { useEffect, useMemo, useState } from "react"
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre"
import maplibregl from "maplibre-gl"

interface EonetEvent {
  id: string
  title: string
  categories: { id: string; title: string }[]
  geometry: { date: string; type: string; coordinates: [number, number] }[]
}

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
        tiles: [
          `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` +
            `MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/` +
            `GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        ],
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

export default function EonetEventsDemo() {
  const [events, setEvents] = useState<EonetEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EonetEvent | null>(null)
  const [gibsDate, setGibsDate] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return
        setEvents(data.events || [])
      })
      .catch(() => {
        if (!isMounted) return
        setEvents([])
      })
      .finally(() => {
        if (!isMounted) return
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    setGibsDate(date)
  }, [])

  const mapStyle = useMemo(() => (gibsDate ? buildStyle(gibsDate) : null), [gibsDate])

  const markers = useMemo(() => {
    return events
      .map((event) => {
        const last = event.geometry?.[event.geometry.length - 1]
        if (!last?.coordinates) return null
        const [lng, lat] = last.coordinates
        return { event, lng, lat }
      })
      .filter(Boolean) as { event: EonetEvent; lng: number; lat: number }[]
  }, [events])

  return (
    <div className="absolute inset-0 w-full h-full min-h-[60vh]">
      <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur rounded-md p-2 border border-border text-xs">
        NASA EONET live events — {loading ? "Loading..." : `${markers.length} events`}
      </div>

      {mapStyle ? (
        <Map
        initialViewState={{ longitude: 0, latitude: 10, zoom: 1.3 }}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        maxZoom={9}
        minZoom={0}
        dragRotate={false}
        mapLib={maplibregl}
        >
          <NavigationControl position="bottom-right" showZoom showCompass={false} />
          {markers.map(({ event, lng, lat }) => (
            <Marker key={event.id} longitude={lng} latitude={lat} anchor="center">
              <button
                type="button"
                onClick={() => setSelected(event)}
                className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                aria-label={event.title}
              />
            </Marker>
          ))}

          {selected && (
            <Popup
              longitude={selected.geometry[selected.geometry.length - 1].coordinates[0]}
              latitude={selected.geometry[selected.geometry.length - 1].coordinates[1]}
              onClose={() => setSelected(null)}
              closeButton
              closeOnClick={false}
              anchor="top"
              className="text-xs"
            >
              <div className="font-medium">{selected.title}</div>
              <div className="text-muted-foreground">
                {selected.categories?.[0]?.title ?? "Event"}
              </div>
            </Popup>
          )}
        </Map>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Loading tiles...
        </div>
      )}
    </div>
  )
}
