/**
 * Known field MycoBrain deployments (LAN agents on :8787 + MQTT).
 * Coordinates are fixed site locations — live telemetry comes from agent/MAS, not these coords alone.
 */

export interface FieldDeployment {
  registry_id: string
  catalog_id: string
  name: string
  role: string
  host_ip: string
  agent_port: number
  agent_url: string
  openclaw_url: string
  location: { lat: number; lon: number }
  location_label: string
  mdp_device_id: string
  board_type: string
  page_href: string
}

/** Mushroom 1 — Jetson WiFi @ 192.168.0.123 (San Diego lab). */
/** Hyphae 1 — Jetson Ethernet @ 192.168.0.228 (Southwestern College, Chula Vista). */
export const FIELD_MYCOBRAIN_DEPLOYMENTS: FieldDeployment[] = [
  {
    registry_id: "mycobrain-mushroom1-jetson-123",
    catalog_id: "mushroom-1",
    name: "Mushroom 1",
    role: "mushroom1",
    host_ip: "192.168.0.123",
    agent_port: 8787,
    agent_url: "http://192.168.0.123:8787",
    openclaw_url: "http://192.168.0.123:18789",
    location: { lat: 32.715736, lon: -117.161087 },
    location_label: "San Diego, CA (Jetson WiFi)",
    mdp_device_id: "mycobrain-sidea-10b41d",
    board_type: "jetson_orin",
    page_href: "/devices/mushroom-1",
  },
  {
    registry_id: "mycobrain-hyphae1-jetson-228",
    catalog_id: "hyphae-1",
    name: "Hyphae 1",
    role: "hyphae1",
    host_ip: "192.168.0.228",
    agent_port: 8787,
    agent_url: "http://192.168.0.228:8787",
    openclaw_url: "http://192.168.0.228:18789",
    location: { lat: 32.640278, lon: -117.085833 },
    location_label: "Southwestern College, 900 Otay Lakes Rd, Chula Vista, CA",
    mdp_device_id: "mycobrain-sidea-10b41d",
    board_type: "jetson_orin",
    page_href: "/devices/hyphae-1",
  },
  {
    registry_id: "mycobrain-COM4",
    catalog_id: "psathyrella-buoy-com4",
    name: "Psathyrella Aquatic MycoBrain Buoy",
    role: "psathyrella",
    host_ip: "192.168.0.241",
    agent_port: 8003,
    agent_url: "http://192.168.0.241:8003",
    openclaw_url: "",
    location: { lat: 32.56289, lon: -117.13570 },
    location_label: "Project Oyster - North Reef buoy position",
    mdp_device_id: "mycobrain-COM4",
    board_type: "Psathyrella Aquatic MycoBrain buoy",
    page_href: "/natureos/mycobrain?device=mycobrain-COM4",
  },
]

export function deploymentByHost(hostIp: string): FieldDeployment | undefined {
  return FIELD_MYCOBRAIN_DEPLOYMENTS.find((d) => d.host_ip === hostIp)
}

export function deploymentByRegistryId(id: string): FieldDeployment | undefined {
  return FIELD_MYCOBRAIN_DEPLOYMENTS.find((d) => d.registry_id === id)
}

/** Match field deployment by registry id, portal alias, or psathyrella role on local serial. */
export function deploymentForLocalDevice(
  registryId: string,
  role?: string | null,
  portalDeviceId?: string | null
): FieldDeployment | undefined {
  const direct =
    deploymentByRegistryId(registryId) ||
    (portalDeviceId ? deploymentByRegistryId(portalDeviceId) : undefined)
  if (direct) return direct
  if ((role || "").toLowerCase() === "psathyrella") {
    return deploymentByCatalogId("psathyrella-buoy-com4")
  }
  return undefined
}

export function deploymentByCatalogId(catalogId: string): FieldDeployment | undefined {
  return FIELD_MYCOBRAIN_DEPLOYMENTS.find((d) => d.catalog_id === catalogId)
}

/** Parse MAS registry location string "lat,lon" or object. */
export function parseLocation(
  loc: unknown
): { lat: number; lon: number } | null {
  if (!loc) return null
  if (typeof loc === "string" && loc.includes(",")) {
    const [a, b] = loc.split(",").map((s) => parseFloat(s.trim()))
    if (Number.isFinite(a) && Number.isFinite(b)) return { lat: a, lon: b }
  }
  if (typeof loc === "object" && loc !== null) {
    const o = loc as { lat?: number; lon?: number; latitude?: number; longitude?: number }
    const lat = o.lat ?? o.latitude
    const lon = o.lon ?? o.longitude
    if (typeof lat === "number" && typeof lon === "number") return { lat, lon }
  }
  return null
}

/** Map MAS/operator status to Earth Simulator marker status. */
export function toEarthSimConnectionStatus(
  status: string | undefined,
  connected?: boolean
): string {
  if (connected === true) return "connected"
  if (status === "online" || status === "connected") return "connected"
  if (status === "stale") return "stale"
  return "offline"
}
