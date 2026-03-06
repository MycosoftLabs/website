"use client"

/**
 * LiveMapContent - Live device map using MapLibre GL
 *
 * Displays real device locations from MAS Device Registry.
 * No mock data: if no device locations are available, shows empty state.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, MapPin, RefreshCw, Radio } from "lucide-react"

const DEVICE_COLORS: Record<string, string> = {
  mycobrain: "#00d4ff",
  sporebase: "#7fffcc",
  alarm: "#ff6b9d",
  gateway: "#8b5cf6",
  unknown: "#94a3b8",
}

const STATUS_COLORS: Record<string, string> = {
  online: "#00ff88",
  offline: "#ff4466",
  stale: "#ffad14",
  degraded: "#ffad14",
}

interface RegistryDevice {
  device_id: string
  device_name?: string
  device_display_name?: string | null
  device_role?: string
  status?: string
  location?: string | null
  extra?: Record<string, unknown>
}

interface DevicePoint {
  id: string
  type: string
  status: string
  position: [number, number]
  label: string
  metadata: RegistryDevice
}

function parseLocation(raw?: string | null): [number, number] | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed) && parsed.length >= 2) {
        const [lng, lat] = parsed.map(Number)
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat]
      }
      if (typeof parsed === "object" && parsed) {
        const lat = Number((parsed as any).lat ?? (parsed as any).latitude)
        const lng = Number((parsed as any).lng ?? (parsed as any).longitude)
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat]
      }
    }
  } catch {
    // fall through to text parsing
  }

  const parts = trimmed.split(",").map((part) => Number(part.trim()))
  if (parts.length >= 2 && parts.every((part) => Number.isFinite(part))) {
    const [first, second] = parts
    if (Math.abs(first) <= 180 && Math.abs(second) <= 90) return [first, second]
    if (Math.abs(first) <= 90 && Math.abs(second) <= 180) return [second, first]
  }

  return null
}

function buildDevicePoints(devices: RegistryDevice[]): DevicePoint[] {
  return devices
    .map((device) => {
      const position = parseLocation(device.location ?? null)
      if (!position) return null
      const type = device.device_role?.toLowerCase() || "unknown"
      return {
        id: device.device_id,
        type,
        status: device.status || "offline",
        position,
        label:
          device.device_display_name ||
          device.device_name ||
          device.device_role ||
          device.device_id,
        metadata: device,
      } satisfies DevicePoint
    })
    .filter((value): value is DevicePoint => Boolean(value))
}

function parseGeofence(raw: unknown): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  if (!raw) return null
  if (typeof raw === "string") {
    try {
      return parseGeofence(JSON.parse(raw))
    } catch {
      return null
    }
  }
  if (typeof raw === "object") {
    const geom = raw as any
    if (geom.type === "Polygon" || geom.type === "MultiPolygon") return geom
    if (geom.geometry && (geom.geometry.type === "Polygon" || geom.geometry.type === "MultiPolygon")) {
      return geom.geometry
    }
  }
  return null
}

function buildGeofenceFeatures(devices: RegistryDevice[]) {
  return devices
    .map((device) => {
      const geofence = parseGeofence(device.extra?.geofence ?? (device as any).geofence)
      if (!geofence) return null
      return {
        type: "Feature",
        geometry: geofence,
        properties: {
          id: device.device_id,
          label:
            device.device_display_name ||
            device.device_name ||
            device.device_role ||
            device.device_id,
        },
      }
    })
    .filter((value): value is GeoJSON.Feature => Boolean(value))
}

export function LiveMapContent() {
  const [isMounted, setIsMounted] = useState(false)
  const [devices, setDevices] = useState<RegistryDevice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<DevicePoint | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const filteredPointsRef = useRef<DevicePoint[]>([])

  const devicePoints = useMemo(() => buildDevicePoints(devices), [devices])
  const geofenceFeatures = useMemo(() => buildGeofenceFeatures(devices), [devices])
  const filteredPoints = useMemo(() => {
    return devicePoints.filter((point) => {
      const matchesStatus = statusFilter === "all" || point.status === statusFilter
      const matchesType = typeFilter === "all" || point.type === typeFilter
      return matchesStatus && matchesType
    })
  }, [devicePoints, statusFilter, typeFilter])

  useEffect(() => {
    filteredPointsRef.current = filteredPoints
  }, [filteredPoints])

  const deviceTypes = useMemo(() => {
    const types = new Set<string>()
    devicePoints.forEach((point) => types.add(point.type))
    return Array.from(types).sort()
  }, [devicePoints])

  const refreshDevices = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await fetch("/api/devices/network?include_offline=true", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Failed to load devices")
      const payload = await response.json()
      setDevices(payload.devices || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load device map")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setIsMounted(true)
    refreshDevices()
  }, [refreshDevices])

  useEffect(() => {
    if (!isMounted) return
    let mounted = true

    import("maplibre-gl").then((maplibregl) => {
      if (!mapContainerRef.current || mapRef.current || !mounted) return

      const map = new maplibregl.default.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: '© <a href="https://carto.com/">CARTO</a>',
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        },
        center: [-117.16, 32.72],
        zoom: 4,
        pitch: 0,
      })

      mapRef.current = map

      map.on("load", () => {
        map.addSource("devices", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
          cluster: true,
          clusterMaxZoom: 12,
          clusterRadius: 48,
        })

        map.addSource("geofences", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        })

        map.addLayer({
          id: "geofence-fill",
          type: "fill",
          source: "geofences",
          paint: {
            "fill-color": "#38bdf8",
            "fill-opacity": 0.1,
          },
        })

        map.addLayer({
          id: "geofence-outline",
          type: "line",
          source: "geofences",
          paint: {
            "line-color": "#38bdf8",
            "line-width": 2,
          },
        })

        map.addLayer({
          id: "device-clusters",
          type: "circle",
          source: "devices",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#0ea5e9",
            "circle-radius": ["step", ["get", "point_count"], 16, 25, 22, 50, 28],
            "circle-opacity": 0.75,
          },
        })

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "devices",
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": 12,
          },
          paint: {
            "text-color": "#0f172a",
          },
        })

        map.addLayer({
          id: "device-points",
          type: "circle",
          source: "devices",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": 8,
            "circle-color": ["get", "statusColor"],
            "circle-stroke-color": ["get", "typeColor"],
            "circle-stroke-width": 3,
          },
        })

        map.on("click", "device-clusters", (event) => {
          const features = map.queryRenderedFeatures(event.point, {
            layers: ["device-clusters"],
          })
          const clusterId = features[0]?.properties?.cluster_id
          const source = map.getSource("devices") as any
          source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return
            map.easeTo({ center: (features[0].geometry as any).coordinates, zoom })
          })
        })

        map.on("click", "device-points", (event) => {
          const feature = event.features?.[0]
          if (!feature) return
          const properties = feature.properties
          const selected = filteredPointsRef.current.find((point) => point.id === properties?.id)
          if (selected) setSelectedDevice(selected)
        })

        map.on("mouseenter", "device-clusters", () => {
          map.getCanvas().style.cursor = "pointer"
        })
        map.on("mouseleave", "device-clusters", () => {
          map.getCanvas().style.cursor = ""
        })
        map.on("mouseenter", "device-points", () => {
          map.getCanvas().style.cursor = "pointer"
        })
        map.on("mouseleave", "device-points", () => {
          map.getCanvas().style.cursor = ""
        })
      })
    })

    return () => {
      mounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [isMounted])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const source = map.getSource("devices") as any
    if (!source) return

    const features = filteredPoints.map((point) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: point.position,
      },
      properties: {
        id: point.id,
        label: point.label,
        status: point.status,
        statusColor: STATUS_COLORS[point.status] || STATUS_COLORS.offline,
        type: point.type,
        typeColor: DEVICE_COLORS[point.type] || DEVICE_COLORS.unknown,
      },
    }))

    source.setData({
      type: "FeatureCollection",
      features,
    })
  }, [filteredPoints])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const source = map.getSource("geofences") as any
    if (!source) return

    source.setData({
      type: "FeatureCollection",
      features: geofenceFeatures,
    })
  }, [geofenceFeatures])

  const onlineCount = devicePoints.filter((point) => point.status === "online").length

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-20 flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-4">
          <Link
            href="/natureos"
            className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyan-400" />
              Live Device Map
            </h1>
            <p className="text-xs text-gray-400">Real-time fleet tracking</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-9 rounded-md bg-black/50 text-xs text-white border border-white/10 px-2"
          >
            <option value="all">All Statuses</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="stale">Stale</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-9 rounded-md bg-black/50 text-xs text-white border border-white/10 px-2"
          >
            <option value="all">All Types</option>
            {deviceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            onClick={refreshDevices}
            className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-colors"
            title="Refresh devices"
          >
            <RefreshCw className={`w-5 h-5 text-white ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="absolute top-20 right-4 z-10 p-3 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
        <div className="text-xs font-medium text-gray-400 mb-2">Devices</div>
        <div className="space-y-2">
          {Object.entries(DEVICE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-300 capitalize">{type}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-white/10">
          <div className="text-xs font-medium text-gray-400 mb-2">Status</div>
          <div className="space-y-1">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-300 capitalize">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedDevice ? (
        <div className="absolute top-20 left-4 z-10 p-4 rounded-lg bg-black/60 backdrop-blur-sm border border-cyan-500/30 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">{selectedDevice.label}</span>
            </div>
            <button onClick={() => setSelectedDevice(null)} className="text-gray-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
          <div className="space-y-1 text-xs text-gray-300">
            <div>Type: <span className="capitalize">{selectedDevice.type}</span></div>
            <div>Status: <span className="capitalize">{selectedDevice.status}</span></div>
            <div>Position: {selectedDevice.position[1].toFixed(4)}, {selectedDevice.position[0].toFixed(4)}</div>
          </div>
        </div>
      ) : null}

      <div ref={mapContainerRef} className="absolute inset-0" />

      <div className="absolute bottom-4 left-4 z-10 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
        <span className="text-xs text-gray-400">
          {onlineCount}/{devicePoints.length} devices online
        </span>
      </div>

      {error ? (
        <div className="absolute bottom-4 right-4 z-10 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-xs text-red-200">
          {error}
        </div>
      ) : null}

      {!isLoading && !devicePoints.length ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-center px-4 pointer-events-none">
          <div className="max-w-md text-sm text-gray-200 space-y-2">
            <p>No device locations available yet.</p>
            <p className="text-xs text-gray-400">
              Devices need a location (lat,lng) in the MAS registry to appear on the map.
              MycoBrain boards without GPS won&apos;t show — add a fixed lab location
              (e.g. <code className="text-cyan-400">32.72,-117.16</code>) via{" "}
              <code className="text-cyan-400">MYCOBRAIN_DEVICE_LOCATION</code> or the
              device extra field.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
