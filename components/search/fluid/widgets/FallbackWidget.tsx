/**
 * FallbackWidget — Mar 14, 2026
 *
 * Generic widget for result buckets that have no dedicated widget (missing-widget detection).
 * Renders a simple card list so new answer types from MAS still show in the UI.
 */

"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { WidgetType } from "@/lib/search/widget-registry"

interface FallbackWidgetProps {
  title?: string
  bucketKey: string
  items: Array<Record<string, unknown>>
  className?: string
  size?: "sm" | "md" | "lg"
  widgetType?: WidgetType
  onViewOnMap?: (item: Record<string, unknown>) => void
}

function readNumber(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = key.split(".").reduce<unknown>((acc, part) => {
      if (!acc || typeof acc !== "object") return undefined
      return (acc as Record<string, unknown>)[part]
    }, item)
    const num = Number(value)
    if (Number.isFinite(num)) return num
  }
  return null
}

function isEarthquakeItem(item: Record<string, unknown>) {
  const type = String(item.type ?? item.category ?? "").toLowerCase()
  const title = String(item.title ?? item.name ?? "").toLowerCase()
  return type === "earthquake" || title.includes("earthquake")
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const r = 6371
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(x))
}

function EarthquakeEventsList({
  items,
  onViewOnMap,
}: {
  items: Array<Record<string, unknown>>
  onViewOnMap?: (item: Record<string, unknown>) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const normalized = useMemo(
    () =>
      items.map((item, i) => {
        const lat = readNumber(item, ["lat", "latitude", "location.latitude"])
        const lng = readNumber(item, ["lng", "lon", "longitude", "location.longitude"])
        const magnitude = readNumber(item, ["magnitude", "mag", "properties.mag"])
        const depth = readNumber(item, ["depth", "location.depth", "properties.depth"])
        const title = String(item.title ?? item.name ?? "Earthquake")
        const locationName = String(item.locationName ?? item.place ?? "")
        const timestamp = typeof item.timestamp === "string" ? item.timestamp : typeof item.time === "string" ? item.time : undefined
        const timeMs = timestamp ? new Date(timestamp).getTime() : 0
        return {
          item,
          id: String(item.id ?? item.uuid ?? `${title}-${i}`),
          lat,
          lng,
          magnitude,
          depth,
          title,
          locationName,
          timestamp,
          timeMs,
          link: typeof item.link === "string" ? item.link : typeof item.url === "string" ? item.url : undefined,
          sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : undefined,
          source: String(item.source ?? "USGS"),
          severity: String(item.severity ?? ""),
        }
      }),
    [items],
  )

  return (
    <div className="h-full space-y-2 overflow-y-auto pr-1">
      {normalized.slice(0, 12).map((event) => {
        const expanded = expandedId === event.id
        const aftershocks = normalized
          .filter((candidate) => {
            if (candidate.id === event.id || event.lat == null || event.lng == null || candidate.lat == null || candidate.lng == null) return false
            const closeEnough = distanceKm(event.lat, event.lng, candidate.lat, candidate.lng) <= 120
            const afterMain = !event.timeMs || !candidate.timeMs || candidate.timeMs >= event.timeMs
            const smallerOrEqual = event.magnitude == null || candidate.magnitude == null || candidate.magnitude <= event.magnitude
            return closeEnough && afterMain && smallerOrEqual
          })
          .slice(0, 5)
        const mapImage = event.lat != null && event.lng != null
          ? `/api/search/map-preview?lat=${encodeURIComponent(String(event.lat))}&lng=${encodeURIComponent(String(event.lng))}&mag=${encodeURIComponent(String(event.magnitude ?? 0))}&depth=${encodeURIComponent(String(event.depth ?? ""))}&zoom=${expanded ? 8 : 6}&title=${encodeURIComponent(event.title)}`
          : null

        return (
          <article
            key={event.id}
            className="overflow-hidden rounded-md border border-amber-500/25 bg-black/25"
          >
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => {
                setExpandedId(expanded ? null : event.id)
                if (event.lat != null && event.lng != null) onViewOnMap?.({ ...event.item, lat: event.lat, lng: event.lng, title: event.title, zoom: 9.5 })
              }}
              aria-expanded={expanded}
            >
              {mapImage && (
                <img
                  src={mapImage}
                  alt={`Map preview for ${event.title}`}
                  className={cn("w-full object-cover opacity-90", expanded ? "h-32" : "h-24")}
                  loading="lazy"
                />
              )}
            </button>
            <div className="space-y-2 p-2">
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  setExpandedId(expanded ? null : event.id)
                  if (event.lat != null && event.lng != null) onViewOnMap?.({ ...event.item, lat: event.lat, lng: event.lng, title: event.title, zoom: 9.5 })
                }}
                aria-expanded={expanded}
              >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{event.title}</div>
                  {event.locationName && <div className="truncate text-[11px] text-muted-foreground">{event.locationName}</div>}
                </div>
                {event.magnitude != null && (
                  <div className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
                    M{event.magnitude.toFixed(1)}
                  </div>
                )}
              </div>
              </button>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="rounded bg-muted/30 px-2 py-1">
                  <span className="text-muted-foreground">Lat</span>{" "}
                  <span className="font-mono">{event.lat != null ? event.lat.toFixed(4) : "N/A"}</span>
                </div>
                <div className="rounded bg-muted/30 px-2 py-1">
                  <span className="text-muted-foreground">Lng</span>{" "}
                  <span className="font-mono">{event.lng != null ? event.lng.toFixed(4) : "N/A"}</span>
                </div>
                <div className="rounded bg-muted/30 px-2 py-1">
                  <span className="text-muted-foreground">Depth</span>{" "}
                  <span className="font-mono">{event.depth != null ? `${event.depth.toFixed(1)} km` : "N/A"}</span>
                </div>
                <div className="rounded bg-muted/30 px-2 py-1">
                  <span className="text-muted-foreground">Scale</span>{" "}
                  <span className="font-mono">{event.magnitude != null ? `M${event.magnitude.toFixed(1)}` : "N/A"}</span>
                </div>
              </div>
              {expanded && (
                <div className="space-y-2 rounded border border-amber-500/20 bg-amber-500/5 p-2 text-[11px]">
                  <div className="grid grid-cols-2 gap-1.5">
                    <div><span className="text-muted-foreground">Severity:</span> {event.severity || "N/A"}</div>
                    <div><span className="text-muted-foreground">Source:</span> {event.source}</div>
                    <div><span className="text-muted-foreground">Event ID:</span> <span className="font-mono">{event.id}</span></div>
                    <div><span className="text-muted-foreground">Likely aftershocks:</span> {aftershocks.length}</div>
                  </div>
                  <div>
                    <div className="mb-1 font-medium text-foreground">Nearby later/smaller events</div>
                    {aftershocks.length > 0 ? (
                      <ul className="space-y-1">
                        {aftershocks.map((shock) => (
                          <li key={shock.id} className="flex justify-between gap-2 rounded bg-black/20 px-2 py-1">
                            <span className="truncate">{shock.title}</span>
                            <span className="shrink-0 font-mono">{shock.magnitude != null ? `M${shock.magnitude.toFixed(1)}` : "M?"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No nearby aftershock candidates in the loaded feed.</p>
                    )}
                  </div>
                  <details className="rounded bg-black/20 px-2 py-1">
                    <summary className="cursor-pointer text-cyan-300">Raw source fields</summary>
                    <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground">
                      {JSON.stringify(event.item, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">{event.timestamp ? new Date(event.timestamp).toLocaleString() : "Time unavailable"}</span>
                {(event.link || event.sourceUrl) && (
                  <a className="shrink-0 text-cyan-300 hover:text-cyan-200" href={event.link || event.sourceUrl} target="_blank" rel="noreferrer">
                    USGS details
                  </a>
                )}
              </div>
            </div>
          </article>
        )
      })}
      {items.length > 12 && (
        <p className="text-xs text-muted-foreground">+{items.length - 12} more earthquakes</p>
      )}
    </div>
  )
}

export function FallbackWidget({
  title,
  bucketKey,
  items,
  className,
  size = "md",
  widgetType = "fallback",
  onViewOnMap,
}: FallbackWidgetProps) {
  if (!items?.length) {
    return (
      <Card className={cn("overflow-hidden", className)} data-widget-type={widgetType}>
        <CardHeader className="py-3">
          <span className="text-sm font-medium text-muted-foreground">
            {title || bucketKey}
          </span>
        </CardHeader>
        <CardContent className="py-2">
          <p className="text-sm text-muted-foreground">No results</p>
        </CardContent>
      </Card>
    )
  }

  const earthquakeItems = bucketKey === "events" ? items.filter(isEarthquakeItem) : []
  if (earthquakeItems.length > 0) {
    return (
      <Card className={cn("overflow-hidden h-full", className)} data-widget-type={widgetType}>
        <CardContent className="h-full overflow-hidden p-2 sm:p-3">
          <EarthquakeEventsList items={earthquakeItems} onViewOnMap={onViewOnMap} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)} data-widget-type={widgetType}>
      <CardHeader className="py-3">
        <span className="text-sm font-medium">
          {title || bucketKey}
        </span>
        <span className="text-xs text-muted-foreground ml-2">({items.length})</span>
      </CardHeader>
      <CardContent className="py-2">
        <ul className={cn(
          "space-y-2",
          size === "sm" && "text-xs",
          size === "lg" && "text-base"
        )}>
          {items.slice(0, 10).map((item, i) => (
            <li
              key={(item.id ?? item.uuid ?? i) as string}
              className="rounded-md border border-border/50 bg-muted/30 text-sm"
            >
              <button
                type="button"
                className="block w-full px-2 py-1.5 text-left transition hover:bg-background/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
                onClick={() => onViewOnMap?.(item)}
              >
              {typeof item.title === "string" && item.title}
              {typeof item.name === "string" && item.name}
              {typeof item.scientific_name === "string" && item.scientific_name}
              {!item.title && !item.name && !item.scientific_name && (
                <span className="text-muted-foreground truncate block">
                  {JSON.stringify(item).slice(0, 80)}…
                </span>
              )}
              </button>
            </li>
          ))}
        </ul>
        {items.length > 10 && (
          <p className="text-xs text-muted-foreground mt-2">+{items.length - 10} more</p>
        )}
      </CardContent>
    </Card>
  )
}
