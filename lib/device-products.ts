/**
 * Device Products Registry
 *
 * Canonical list of Mycosoft hardware products and variants.
 * Used by website, MycoForge (components/BOM), and device network.
 *
 * Prices and ideation may be updated via MycoForge; website syncs from here.
 * See docs/DEVICE_PRODUCTS_AND_MYCOFORGE_SYNC_MAR07_2026.md
 *
 * @module lib/device-products
 */

/** Single product variant (e.g. Mushroom 1 Mini, MycoNODE White) */
export interface DeviceVariant {
  id: string
  name: string
  slug: string
  description?: string
  /** Placeholder; update via MycoForge */
  priceUsd?: number
  /** Supabase product.id when synced */
  productId?: string
}

/** Device product with variants */
export interface DeviceProduct {
  deviceId: string
  name: string
  slug: string
  href: string
  variants: DeviceVariant[]
}

/** MycoNODE colors (from myconode-details) */
const MYCONODE_COLORS = [
  "White",
  "Black",
  "Purple",
  "Blue",
  "Orange",
  "Red",
  "Yellow",
  "Camo Green",
] as const

/**
 * Canonical device products and variants.
 * Synced with website pages and MycoForge Supabase products.
 */
export const DEVICE_PRODUCTS: DeviceProduct[] = [
  {
    deviceId: "mushroom1",
    name: "Mushroom 1",
    slug: "mushroom-1",
    href: "/devices/mushroom-1",
    variants: [
      { id: "mushroom1-mini", name: "Mushroom 1 Mini", slug: "mini", description: "Compact sensing platform" },
      { id: "mushroom1-standard", name: "Mushroom 1 Standard", slug: "standard", description: "Flagship quadrupedal sensing platform" },
      { id: "mushroom1-large", name: "Mushroom 1 Large", slug: "large", description: "Extended deployment platform" },
      { id: "mushroom1-defense", name: "Mushroom 1 Defense", slug: "defense", description: "Defense & security variant" },
    ],
  },
  {
    deviceId: "sporebase",
    name: "SporeBase",
    slug: "sporebase",
    href: "/devices/sporebase",
    variants: [{ id: "sporebase", name: "SporeBase", slug: "", description: "Biological collection system" }],
  },
  {
    deviceId: "alarm",
    name: "ALARM",
    slug: "alarm",
    href: "/devices/alarm",
    variants: [{ id: "alarm", name: "Mycosoft Alarm", slug: "", description: "Indoor environmental monitor" }],
  },
  {
    deviceId: "myconode",
    name: "MycoNODE",
    slug: "myconode",
    href: "/devices/myconode",
    variants: MYCONODE_COLORS.map((color) => ({
      id: `myconode-${color.toLowerCase().replace(/\s+/g, "-")}`,
      name: `MycoNODE ${color}`,
      slug: color.toLowerCase().replace(/\s+/g, "-"),
      description: `Subsurface bioelectric probe — ${color}`,
    })),
  },
  {
    deviceId: "hypha1",
    name: "Hypha 1",
    slug: "hyphae-1",
    href: "/devices/hyphae-1",
    variants: [
      { id: "hypha1-compact", name: "Hypha 1 Compact", slug: "compact", description: "Single-point monitoring" },
      { id: "hypha1-standard", name: "Hypha 1 Standard", slug: "standard", description: "Modular sensor platform" },
      { id: "hypha1-industrial", name: "Hypha 1 Industrial", slug: "industrial", description: "Maximum capacity" },
    ],
  },
]

/** Soil Probe = FCI (Fungal Computer Interface). Same component: 2m depth sensor array for Mushroom 1. */
export const COMPONENT_ALIASES: Record<string, string> = {
  "soil-probe": "FCI",
  fci: "Soil Probe",
}

/**
 * Capability manifest display labels — human-readable names for sensors/capabilities
 * from MAS heartbeat. Aligns with mycosoft_mas.devices.capability_manifest.
 * See docs/MYCOBRAIN_CAPABILITY_MANIFEST_MAR07_2026.md
 */
export const CAPABILITY_DISPLAY: Record<string, string> = {
  led: "LED",
  buzzer: "Buzzer",
  i2c: "I2C",
  neopixel: "NeoPixel",
  telemetry: "Telemetry",
  service: "Service",
  serial: "Serial",
  lora: "LoRa",
  bluetooth: "Bluetooth",
  wifi: "Wi‑Fi",
  sim: "Cellular (SIM)",
  store_and_forward: "Store & Forward",
  edge_cortex: "Edge Cortex",
}
export const SENSOR_DISPLAY: Record<string, string> = {
  bme688: "BME688",
  bme688_a: "BME688 (AMB)",
  bme688_b: "BME688 (ENV)",
  spore_detection: "Spore Detection",
  soil_moisture: "Soil Moisture",
  sound: "Sound",
}

/** Map device_role (from MAS/MycoBrain) to display name */
export const DEVICE_ROLE_DISPLAY: Record<string, string> = {
  mushroom1: "Mushroom 1",
  "mushroom1-mini": "Mushroom 1 Mini",
  "mushroom1-standard": "Mushroom 1 Standard",
  "mushroom1-large": "Mushroom 1 Large",
  "mushroom1-defense": "Mushroom 1 Defense",
  sporebase: "SporeBase",
  alarm: "Mycosoft Alarm",
  myconode: "MycoNODE",
  hyphae1: "Hypha 1",
  "hypha1-compact": "Hypha 1 Compact",
  "hypha1-standard": "Hypha 1 Standard",
  "hypha1-industrial": "Hypha 1 Industrial",
  gateway: "Gateway",
  mycodrone: "MycoDrone",
  standalone: "MycoBrain",
}

/** All product IDs for Supabase sync */
export function getAllProductIds(): string[] {
  const ids: string[] = []
  for (const device of DEVICE_PRODUCTS) {
    for (const v of device.variants) {
      ids.push(v.id)
    }
  }
  return ids
}
