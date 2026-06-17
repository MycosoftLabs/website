/**
 * Known Mycosoft device types for Earth Simulator roster and cross-surface parity.
 * Source of truth: MAS repo `docs/DEVICES_REGISTRY_MAY03_2026.md` and @device-tracker agent.
 * No mock “live” telemetry — default_location is null until a real unit reports GPS.
 */

export interface CatalogDevice {
  id: string
  name: string
  type: string
  role: string
  page_href: string
  firmware_repo: string | null
  status: string
  default_location: { lat: number; lon: number } | null
}

export const KNOWN_DEVICE_CATALOG: CatalogDevice[] = [
  {
    id: "mushroom-1",
    name: "Mushroom 1",
    type: "ground_droid",
    role: "mushroom1",
    page_href: "/devices/mushroom-1",
    firmware_repo: "mycobrain/firmware",
    status: "In production",
    default_location: { lat: 32.640278, lon: -117.085833 },
  },
  {
    id: "sporebase",
    name: "SporeBase",
    type: "aerosol_collector",
    role: "sporebase",
    page_href: "/devices/sporebase",
    firmware_repo: "mycobrain/firmware",
    status: "In production",
    default_location: null,
  },
  {
    id: "hyphae-1",
    name: "Hyphae 1",
    type: "edge_io",
    role: "hyphae1",
    page_href: "/devices/hyphae-1",
    firmware_repo: "mycobrain/firmware",
    status: "In production",
    default_location: { lat: 32.715736, lon: -117.161087 },
  },
  {
    id: "myconode",
    name: "MycoNode",
    type: "mesh_probe",
    role: "myconode",
    page_href: "/devices/myconode",
    firmware_repo: "mycobrain/firmware",
    status: "Enterprise",
    default_location: null,
  },
  {
    id: "psathyrella",
    name: "Psathyrella",
    type: "marine_buoy",
    role: "psathyrella",
    page_href: "/devices/psathyrella",
    firmware_repo: "mycobrain/firmware",
    status: "In production",
    default_location: null,
  },
  {
    id: "alarm",
    name: "ALARM",
    type: "indoor_safety",
    role: "alarm",
    page_href: "/devices/alarm",
    firmware_repo: "mycobrain/firmware",
    status: "Coming soon",
    default_location: null,
  },
  {
    id: "mycobrain-gateway",
    name: "MycoBrain gateway",
    type: "gateway_service",
    role: "gateway",
    page_href: "/natureos/devices/network",
    firmware_repo: "mycobrain/firmware",
    status: "Always-on (host)",
    default_location: null,
  },
  {
    id: "agaric-mini",
    name: "Agaric Mini",
    type: "uav",
    role: "agaric_mini",
    page_href: "/devices/agaric",
    firmware_repo: "mycobrain/firmware/features/mycodrone",
    status: "In production",
    default_location: null,
  },
  {
    id: "agaric-standard",
    name: "Agaric Standard",
    type: "uav",
    role: "agaric_standard",
    page_href: "/devices/agaric",
    firmware_repo: "mycobrain/firmware/features/mycodrone",
    status: "In production",
    default_location: null,
  },
  {
    id: "agaric-heavy",
    name: "Agaric Heavy-Lift",
    type: "uav",
    role: "agaric_heavy",
    page_href: "/devices/agaric",
    firmware_repo: "mycobrain/firmware/features/mycodrone",
    status: "In production",
    default_location: null,
  },
]
