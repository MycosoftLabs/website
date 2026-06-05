/**
 * FallbackWidget — Mar 14, 2026
 *
 * Generic widget for result buckets that have no dedicated widget (missing-widget detection).
 * Renders a simple card list so new answer types from MAS still show in the UI.
 */

"use client"

import { useEffect, useMemo, useState } from "react"
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
  focusedId?: string | null
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

function readItemId(item: Record<string, unknown>, fallback: string) {
  return String(
    item.id ??
      item.uuid ??
      item.icao24 ??
      item.mmsi ??
      item.noradId ??
      item.satelliteId ??
      item.callsign ??
      item.registration ??
      item.name ??
      item.title ??
      fallback,
  )
}

function formatMetric(value: unknown, unit = "", digits = 1) {
  const num = Number(value)
  if (!Number.isFinite(num)) return "N/A"
  return `${num.toFixed(digits)}${unit}`
}

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
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
  focusedId,
}: {
  items: Array<Record<string, unknown>>
  onViewOnMap?: (item: Record<string, unknown>) => void
  focusedId?: string | null
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

  useEffect(() => {
    if (!focusedId) return
    setExpandedId(focusedId)
    const node = document.querySelector(`[data-search-event-id="${CSS.escape(focusedId)}"]`)
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [focusedId])

  const visibleEvents = useMemo(() => {
    const top = normalized.slice(0, 12)
    if (!focusedId || top.some((event) => event.id === focusedId)) return top
    const focused = normalized.find((event) => event.id === focusedId)
    return focused ? [focused, ...top.slice(0, 11)] : top
  }, [focusedId, normalized])

  return (
    <div className="h-full space-y-2 overflow-y-auto pr-1">
      {visibleEvents.map((event) => {
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
            data-search-event-id={event.id}
            aria-selected={focusedId === event.id}
            className={cn(
              "overflow-hidden rounded-md border border-amber-500/25 bg-black/25 transition-all duration-200",
              focusedId === event.id && "animate-pulse border-rose-300 bg-rose-500/10 shadow-[0_0_24px_rgba(244,63,94,0.38)] ring-2 ring-rose-300/60",
            )}
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

/** Pull a handful of human-readable numeric/short-string fields off an arbitrary record for the metrics grid. */
function deriveGenericMetrics(item: Record<string, unknown>): Array<{ label: string; value: string }> {
  const skip = new Set(["id", "uuid", "title", "name", "description", "type", "category", "source", "timestamp", "link", "url", "sourceUrl"])
  const metrics: Array<{ label: string; value: string }> = []
  const lat = readNumber(item, ["lat", "latitude", "location.latitude", "location.lat"])
  const lng = readNumber(item, ["lng", "lon", "longitude", "location.longitude", "location.lng"])
  for (const [key, raw] of Object.entries(item)) {
    if (metrics.length >= 4) break
    if (skip.has(key) || /^(lat|lng|lon|latitude|longitude)$/i.test(key)) continue
    if (raw == null || typeof raw === "object") continue
    const label = key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 18)
    const value = typeof raw === "number" ? (Number.isInteger(raw) ? raw.toLocaleString() : raw.toFixed(2)) : String(raw).slice(0, 28)
    if (value.trim()) metrics.push({ label, value })
  }
  if (lat != null) metrics.push({ label: "Lat", value: lat.toFixed(4) })
  if (lng != null) metrics.push({ label: "Lng", value: lng.toFixed(4) })
  return metrics
}

function GenericItemsList({
  items,
  onViewOnMap,
  focusedId,
}: {
  items: Array<Record<string, unknown>>
  onViewOnMap?: (item: Record<string, unknown>) => void
  focusedId?: string | null
}) {
  const entities = useMemo<DetailEntity[]>(
    () =>
      items.map((item, i) => {
        const title = String(
          item.title ??
            item.name ??
            item.callsign ??
            item.registration ??
            item.mmsi ??
            item.noradId ??
            item.scientific_name ??
            "Result",
        )
        const lat = readNumber(item, ["lat", "latitude", "location.latitude", "location.lat"])
        const lng = readNumber(item, ["lng", "lon", "longitude", "location.longitude", "location.lng"])
        const description = String(item.description ?? item.summary ?? item.place ?? item.locationName ?? "").trim()
        return {
          item,
          id: readItemId(item, `${title}-${i}`),
          title,
          subtitle: description || undefined,
          lat,
          lng,
          badge: typeof item.severity === "string" ? item.severity : typeof item.type === "string" ? item.type : undefined,
          kind: String(item.type ?? item.category ?? "result").toLowerCase(),
          zoom: 8,
          source: String(item.source ?? "Live source"),
          timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
          link: typeof item.link === "string" ? item.link : typeof item.url === "string" ? item.url : typeof item.sourceUrl === "string" ? item.sourceUrl : undefined,
          metrics: deriveGenericMetrics(item),
        }
      }),
    [items],
  )

  return <DetailEntityList entities={entities} accent="border-border/50" onViewOnMap={onViewOnMap} focusedId={focusedId} />
}

/** Shared map-preview tile for any geolocated entity (reuses the earthquake preview endpoint). */
function mapPreviewUrl(lat: number, lng: number, title: string, zoom: number) {
  return `/api/search/map-preview?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&zoom=${zoom}&title=${encodeURIComponent(title)}`
}

/** m/s → km/h (live aircraft/vessel feeds report velocity in m/s). */
function msToKmh(value: unknown) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return num * 3.6
}

interface DetailEntity {
  item: Record<string, unknown>
  id: string
  title: string
  subtitle?: string
  lat: number | null
  lng: number | null
  badge?: string
  metrics: Array<{ label: string; value: string }>
  source: string
  timestamp?: string
  link?: string
  kind: string
  zoom: number
}

/**
 * Generic rich-detail list used by aircraft / vessels / satellites. Mirrors the earthquake card:
 * map preview, a metrics grid, expandable raw source fields, click-to-focus on the Earth widget,
 * and a synced selection event so the globe highlights the same entity.
 */
function DetailEntityList({
  entities,
  accent,
  onViewOnMap,
  focusedId,
}: {
  entities: DetailEntity[]
  accent: string
  onViewOnMap?: (item: Record<string, unknown>) => void
  focusedId?: string | null
}) {
  const [localFocusedId, setLocalFocusedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const activeFocusedId = focusedId || localFocusedId

  useEffect(() => {
    if (!focusedId) return
    setLocalFocusedId(focusedId)
    setExpandedId(focusedId)
    const node = document.querySelector(`[data-search-item-id="${CSS.escape(focusedId)}"]`)
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [focusedId])

  const visibleItems = useMemo(() => {
    const top = entities.slice(0, 12)
    if (!activeFocusedId || top.some((entity) => entity.id === activeFocusedId)) return top
    const focused = entities.find((entity) => entity.id === activeFocusedId)
    return focused ? [focused, ...top.slice(0, 11)] : top
  }, [activeFocusedId, entities])

  return (
    <div className="h-full space-y-2 overflow-y-auto pr-1">
      {visibleItems.map((entity) => {
        const selected = activeFocusedId === entity.id
        const expanded = expandedId === entity.id
        const focusEntity = () => {
          setLocalFocusedId(entity.id)
          setExpandedId(expanded ? null : entity.id)
          if (entity.lat != null && entity.lng != null) {
            onViewOnMap?.({ ...entity.item, lat: entity.lat, lng: entity.lng, title: entity.title, zoom: entity.zoom })
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("search:earth-feature-selected", {
                  detail: {
                    id: entity.id,
                    kind: entity.kind,
                    title: entity.title,
                    detail: entity.subtitle || entity.metrics.map((m) => `${m.label} ${m.value}`).join(" · "),
                    source: entity.source,
                    timestamp: entity.timestamp,
                  },
                }),
              )
            }
          }
        }
        const preview = entity.lat != null && entity.lng != null
          ? mapPreviewUrl(entity.lat, entity.lng, entity.title, expanded ? 7 : 5)
          : null
        return (
          <article
            key={entity.id}
            data-search-item-id={entity.id}
            data-search-map-focus="true"
            data-search-map-kind={entity.kind}
            data-search-map-lat={entity.lat ?? ""}
            data-search-map-lng={entity.lng ?? ""}
            data-search-map-title={entity.title}
            aria-selected={selected}
            role="button"
            tabIndex={0}
            onClick={focusEntity}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                focusEntity()
              }
            }}
            className={cn(
              "pointer-events-auto cursor-pointer overflow-hidden rounded-md border bg-black/25 transition-all duration-200",
              accent,
              selected && "animate-pulse border-cyan-300 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.32)] ring-2 ring-cyan-300/50",
            )}
          >
            {preview && (
              <img
                src={preview}
                alt={`Map preview for ${entity.title}`}
                className={cn("w-full object-cover opacity-90", expanded ? "h-32" : "h-20")}
                loading="lazy"
              />
            )}
            <div className="space-y-2 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{entity.title}</div>
                  {entity.subtitle && <div className="truncate text-[11px] text-muted-foreground">{entity.subtitle}</div>}
                </div>
                {entity.badge && (
                  <span className="shrink-0 rounded border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 text-[11px] font-semibold text-cyan-200">
                    {entity.badge}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {entity.metrics.map((metric) => (
                  <div key={metric.label} className="rounded bg-muted/30 px-2 py-1">
                    <span className="text-muted-foreground">{metric.label}</span>{" "}
                    <span className="font-mono">{metric.value}</span>
                  </div>
                ))}
              </div>
              {expanded && (
                <details open className="rounded bg-black/20 px-2 py-1 text-[11px]">
                  <summary className="cursor-pointer text-cyan-300">Raw source fields</summary>
                  <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground">
                    {JSON.stringify(entity.item, null, 2)}
                  </pre>
                </details>
              )}
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">{entity.timestamp ? formatDateTime(entity.timestamp) : entity.source}</span>
                {entity.link && (
                  <a className="shrink-0 text-cyan-300 hover:text-cyan-200" href={entity.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    Source
                  </a>
                )}
              </div>
            </div>
          </article>
        )
      })}
      {entities.length > 12 && (
        <p className="text-xs text-muted-foreground">+{entities.length - 12} more</p>
      )}
    </div>
  )
}

function AircraftItemsList(props: {
  items: Array<Record<string, unknown>>
  onViewOnMap?: (item: Record<string, unknown>) => void
  focusedId?: string | null
}) {
  const entities = useMemo<DetailEntity[]>(
    () =>
      props.items.map((item, i) => {
        const callsign = String(item.callsign ?? item.flightNumber ?? item.flight ?? "").trim()
        const registration = String(item.registration ?? item.icao24 ?? item.icao ?? item.hex ?? "").trim()
        const title = callsign || registration || "Aircraft"
        const lat = readNumber(item, ["lat", "latitude", "location.latitude", "location.lat"])
        const lng = readNumber(item, ["lng", "lon", "longitude", "location.longitude", "location.lng"])
        const altitude = readNumber(item, ["altitude", "alt", "geo_altitude", "baro_altitude"])
        const velocity = readNumber(item, ["velocity", "speed", "groundSpeed"])
        const speedKmh = msToKmh(velocity)
        const heading = readNumber(item, ["heading", "track", "true_track"])
        const onGround = Boolean(item.onGround ?? item.on_ground ?? false)
        const origin = String(item.origin ?? item.originCountry ?? item.origin_country ?? item.country ?? "").trim()
        const destination = String(item.destination ?? "").trim()
        return {
          item,
          id: readItemId(item, `${title}-${i}`),
          title,
          subtitle: [origin, destination ? `→ ${destination}` : ""].filter(Boolean).join(" ") || (registration && registration !== title ? registration : undefined),
          lat,
          lng,
          badge: onGround ? "On ground" : altitude != null ? `${Math.round(altitude).toLocaleString()} m` : undefined,
          kind: "aircraft",
          zoom: 7,
          source: String(item.source ?? "OpenSky Network"),
          metrics: [
            { label: "Altitude", value: altitude != null ? `${Math.round(altitude).toLocaleString()} m` : "N/A" },
            { label: "Speed", value: speedKmh != null ? `${Math.round(speedKmh).toLocaleString()} km/h` : "N/A" },
            { label: "Heading", value: heading != null ? `${Math.round(heading)}°` : "N/A" },
            { label: "Reg", value: registration || "N/A" },
            { label: "Lat", value: lat != null ? lat.toFixed(4) : "N/A" },
            { label: "Lng", value: lng != null ? lng.toFixed(4) : "N/A" },
          ],
        }
      }),
    [props.items],
  )
  return <DetailEntityList entities={entities} accent="border-sky-400/25" onViewOnMap={props.onViewOnMap} focusedId={props.focusedId} />
}

function VesselItemsList(props: {
  items: Array<Record<string, unknown>>
  onViewOnMap?: (item: Record<string, unknown>) => void
  focusedId?: string | null
}) {
  const entities = useMemo<DetailEntity[]>(
    () =>
      props.items.map((item, i) => {
        const title = String(item.name ?? item.vessel_name ?? item.mmsi ?? "Vessel").trim()
        const mmsi = String(item.mmsi ?? "").trim()
        const shipType = String(item.shipType ?? item.ship_type ?? item.type ?? "").trim()
        const lat = readNumber(item, ["lat", "latitude", "location.latitude", "location.lat"])
        const lng = readNumber(item, ["lng", "lon", "longitude", "location.longitude", "location.lng"])
        const speed = readNumber(item, ["speed", "sog", "velocity"])
        const heading = readNumber(item, ["heading", "cog", "course"])
        const destination = String(item.destination ?? "").trim()
        return {
          item,
          id: readItemId(item, `${title}-${i}`),
          title,
          subtitle: [shipType, destination ? `→ ${destination}` : ""].filter(Boolean).join(" · ") || undefined,
          lat,
          lng,
          badge: shipType || undefined,
          kind: "vessel",
          zoom: 8,
          source: String(item.source ?? "AISstream"),
          metrics: [
            { label: "Speed", value: speed != null ? `${speed.toFixed(1)} kn` : "N/A" },
            { label: "Heading", value: heading != null ? `${Math.round(heading)}°` : "N/A" },
            { label: "MMSI", value: mmsi || "N/A" },
            { label: "Type", value: shipType || "N/A" },
            { label: "Lat", value: lat != null ? lat.toFixed(4) : "N/A" },
            { label: "Lng", value: lng != null ? lng.toFixed(4) : "N/A" },
          ],
        }
      }),
    [props.items],
  )
  return <DetailEntityList entities={entities} accent="border-cyan-400/25" onViewOnMap={props.onViewOnMap} focusedId={props.focusedId} />
}

function SatelliteItemsList(props: {
  items: Array<Record<string, unknown>>
  onViewOnMap?: (item: Record<string, unknown>) => void
  focusedId?: string | null
}) {
  const entities = useMemo<DetailEntity[]>(
    () =>
      props.items.map((item, i) => {
        const title = String(item.name ?? item.satelliteId ?? item.noradId ?? "Satellite").trim()
        const noradId = String(item.noradId ?? item.norad_id ?? "").trim()
        const category = String(item.category ?? "").trim()
        const lat = readNumber(item, ["lat", "latitude", "location.latitude", "location.lat"])
        const lng = readNumber(item, ["lng", "lon", "longitude", "location.longitude", "location.lng"])
        const altitude = readNumber(item, ["altitude", "alt"])
        const velocity = readNumber(item, ["velocity", "speed"])
        return {
          item,
          id: readItemId(item, `${title}-${i}`),
          title,
          subtitle: category || undefined,
          lat,
          lng,
          badge: altitude != null ? `${Math.round(altitude).toLocaleString()} km` : undefined,
          kind: "satellite",
          zoom: 4,
          source: String(item.source ?? "CelesTrak"),
          metrics: [
            { label: "Altitude", value: altitude != null ? `${Math.round(altitude).toLocaleString()} km` : "N/A" },
            { label: "Velocity", value: velocity != null ? `${velocity.toFixed(2)} km/s` : "N/A" },
            { label: "NORAD", value: noradId || "N/A" },
            { label: "Category", value: category || "N/A" },
            { label: "Lat", value: lat != null ? lat.toFixed(4) : "N/A" },
            { label: "Lng", value: lng != null ? lng.toFixed(4) : "N/A" },
          ],
        }
      }),
    [props.items],
  )
  return <DetailEntityList entities={entities} accent="border-violet-400/25" onViewOnMap={props.onViewOnMap} focusedId={props.focusedId} />
}

function DeviceItemsList({
  items,
  onViewOnMap,
  focusedId,
}: {
  items: Array<Record<string, unknown>>
  onViewOnMap?: (item: Record<string, unknown>) => void
  focusedId?: string | null
}) {
  const [localFocusedId, setLocalFocusedId] = useState<string | null>(null)
  const normalized = useMemo(
    () =>
      items.map((item, i) => {
        const name = String(item.name ?? item.title ?? item.id ?? "MycoBrain Device")
        const lat = readNumber(item, ["lat", "latitude", "location.latitude", "location.lat"])
        const lng = readNumber(item, ["lng", "lon", "longitude", "location.longitude", "location.lng"])
        return {
          item,
          id: readItemId(item, `${name}-${i}`),
          name,
          lat,
          lng,
          deviceType: String(item.deviceType ?? item.type ?? "mycobrain"),
          status: String(item.status ?? "unknown"),
          source: String(item.source ?? "MycoBrain"),
          lastSeen: item.lastSeen ?? item.last_seen,
          temperature: item.temperature,
          humidity: item.humidity,
          airQuality: item.airQuality ?? item.iaq,
          pressure: item.pressure,
          eco2: item.eco2 ?? item.eco2_ppm ?? item.co2Equivalent,
          gasResistance: item.gasResistance ?? item.gas_resistance_ohm,
          sporeCount: item.sporeCount,
          registryId: item.registryId ?? item.registry_id,
          agentUrl: item.agentUrl ?? item.agent_url,
          host: item.host,
          locationLabel: item.locationLabel ?? item.location_label,
          sensorSlot: item.sensorSlot ?? item.sensor_slot,
        }
      }),
    [items],
  )

  const activeFocusedId = focusedId || localFocusedId

  useEffect(() => {
    if (!focusedId) return
    setLocalFocusedId(focusedId)
  }, [focusedId])

  useEffect(() => {
    if (!activeFocusedId) return
    const node = document.querySelector(`[data-search-item-id="${CSS.escape(activeFocusedId)}"]`)
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activeFocusedId])

  const visibleItems = useMemo(() => {
    const top = normalized.slice(0, 10)
    if (!activeFocusedId || top.some((item) => item.id === activeFocusedId)) return top
    const focused = normalized.find((item) => item.id === activeFocusedId)
    return focused ? [focused, ...top.slice(0, 9)] : top
  }, [activeFocusedId, normalized])

  return (
    <div className="h-full space-y-2 overflow-y-auto pr-1">
      {visibleItems.map((device) => {
        const selected = activeFocusedId === device.id
        const online = /online|connected|live/i.test(device.status)
        const focusDevice = () => {
          if (device.lat != null && device.lng != null) {
            const detail = { ...device.item, id: device.id, type: "device", lat: device.lat, lng: device.lng, title: device.name, zoom: 10.5 }
            setLocalFocusedId(device.id)
            onViewOnMap?.(detail)
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("search:earth-feature-selected", {
                detail: {
                  id: device.id,
                  kind: "device",
                  title: device.name,
                  detail: `${device.deviceType} ${device.status}`,
                  source: device.source,
                  timestamp: typeof device.lastSeen === "string" ? device.lastSeen : undefined,
                },
              }))
            }
          }
        }
        return (
          <article
            key={device.id}
            data-search-item-id={device.id}
            data-search-map-focus="true"
            data-search-map-kind="device"
            data-search-map-lat={device.lat ?? ""}
            data-search-map-lng={device.lng ?? ""}
            data-search-map-title={device.name}
            aria-selected={selected}
            role="button"
            tabIndex={0}
            onFocus={() => setLocalFocusedId(device.id)}
            onMouseDown={(event) => {
              event.stopPropagation()
              focusDevice()
            }}
            onPointerDown={(event) => {
              event.stopPropagation()
              focusDevice()
            }}
            onClick={focusDevice}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                focusDevice()
              }
            }}
            className={cn(
              "pointer-events-auto relative z-10 cursor-pointer rounded-md border border-emerald-400/25 bg-black/25 p-2 text-sm transition-all duration-200",
              selected && "animate-pulse border-cyan-300 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.32)] ring-2 ring-cyan-300/50",
            )}
          >
            <button
              type="button"
              className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
              onPointerDown={(event) => {
                event.stopPropagation()
                focusDevice()
              }}
              onMouseDown={(event) => {
                event.stopPropagation()
                focusDevice()
              }}
              onClick={focusDevice}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{device.name}</div>
                  <div className="truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{device.deviceType}</div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                    online
                      ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-200"
                      : "border-amber-300/40 bg-amber-400/10 text-amber-200",
                  )}
                >
                  {device.status}
                </span>
              </div>
            </button>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="rounded bg-muted/30 px-2 py-1">
                <span className="text-muted-foreground">Temp</span>{" "}
                <span className="font-mono">{formatMetric(device.temperature, " C")}</span>
              </div>
              <div className="rounded bg-muted/30 px-2 py-1">
                <span className="text-muted-foreground">Humidity</span>{" "}
                <span className="font-mono">{formatMetric(device.humidity, "%")}</span>
              </div>
              <div className="rounded bg-muted/30 px-2 py-1">
                <span className="text-muted-foreground">IAQ</span>{" "}
                <span className="font-mono">{formatMetric(device.airQuality, "", 0)}</span>
              </div>
              <div className="rounded bg-muted/30 px-2 py-1">
                <span className="text-muted-foreground">eCO2</span>{" "}
                <span className="font-mono">{formatMetric(device.eco2, " ppm", 0)}</span>
              </div>
              <div className="rounded bg-muted/30 px-2 py-1">
                <span className="text-muted-foreground">Pressure</span>{" "}
                <span className="font-mono">{formatMetric(device.pressure, " hPa")}</span>
              </div>
              <div className="rounded bg-muted/30 px-2 py-1">
                <span className="text-muted-foreground">Gas</span>{" "}
                <span className="font-mono">{formatMetric(device.gasResistance, " ohm", 0)}</span>
              </div>
              <div className="rounded bg-muted/30 px-2 py-1">
                <span className="text-muted-foreground">Spores</span>{" "}
                <span className="font-mono">{formatMetric(device.sporeCount, "", 0)}</span>
              </div>
              <div className="rounded bg-muted/30 px-2 py-1">
                <span className="text-muted-foreground">Lat</span>{" "}
                <span className="font-mono">{device.lat != null ? device.lat.toFixed(4) : "N/A"}</span>
              </div>
              <div className="rounded bg-muted/30 px-2 py-1">
                <span className="text-muted-foreground">Lng</span>{" "}
                <span className="font-mono">{device.lng != null ? device.lng.toFixed(4) : "N/A"}</span>
              </div>
            </div>
            <div className="mt-2 space-y-1 rounded border border-cyan-300/15 bg-cyan-400/5 p-2 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Site</span>
                <span className="truncate text-right">{String(device.locationLabel ?? "Field device")}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Registry</span>
                <span className="truncate font-mono text-right">{String(device.registryId ?? device.id)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Agent</span>
                <span className="truncate font-mono text-right">{String(device.agentUrl ?? device.host ?? "MAS heartbeat")}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Sensor slot</span>
                <span className="truncate font-mono text-right">{String(device.sensorSlot ?? "BME688")}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">{device.source}</span>
              <span className="shrink-0 font-mono">{formatDateTime(device.lastSeen)}</span>
            </div>
          </article>
        )
      })}
      {items.length > 10 && (
        <p className="text-xs text-muted-foreground">+{items.length - 10} more devices</p>
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
  focusedId,
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
          <EarthquakeEventsList items={earthquakeItems} onViewOnMap={onViewOnMap} focusedId={focusedId} />
        </CardContent>
      </Card>
    )
  }

  if (bucketKey === "devices") {
    return (
      <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)} data-widget-type={widgetType}>
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-1">
          <span className="text-sm font-semibold">{title || bucketKey}</span>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-100">{items.length} live</span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <DeviceItemsList items={items} onViewOnMap={onViewOnMap} focusedId={focusedId} />
        </div>
      </div>
    )
  }

  // Rich detail lists for live moving entities — parity with the earthquake card.
  if (bucketKey === "aircraft" || bucketKey === "flights" || bucketKey === "transport" || bucketKey === "vessels" || bucketKey === "marine" || bucketKey === "satellites" || bucketKey === "space_assets") {
    const List =
      bucketKey === "vessels" || bucketKey === "marine"
        ? VesselItemsList
        : bucketKey === "satellites" || bucketKey === "space_assets"
          ? SatelliteItemsList
          : AircraftItemsList
    const accentBadge =
      bucketKey === "vessels" || bucketKey === "marine"
        ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
        : bucketKey === "satellites" || bucketKey === "space_assets"
          ? "border-violet-300/20 bg-violet-400/10 text-violet-100"
          : "border-sky-300/20 bg-sky-400/10 text-sky-100"
    return (
      <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)} data-widget-type={widgetType}>
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-1">
          <span className="text-sm font-semibold">{title || bucketKey}</span>
          <span className={cn("rounded-full border px-2 py-0.5 text-xs", accentBadge)}>{items.length} tracked</span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <List items={items} onViewOnMap={onViewOnMap} focusedId={focusedId} />
        </div>
      </div>
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
        <div className={cn(
          "space-y-2",
          size === "sm" && "text-xs",
          size === "lg" && "text-base"
        )}>
          <GenericItemsList items={items} onViewOnMap={onViewOnMap} focusedId={focusedId} />
        </div>
      </CardContent>
    </Card>
  )
}
