/**
 * Device Role Configurations for Mushroom 1 and Hyphae 1
 *
 * Production NemoClaw+MycoBrain box configurations (Jetson gateway with NVIDIA Nemotron).
 * Used by device detail pages, telemetry cards, and API routes.
 *
 * @see docs/JETSON_MYCOBRAIN_PRODUCTION_DEPLOY_MAR13_2026.md
 */

export interface DeviceRoleConfig {
  roleId: string
  name: string
  slug: string
  description: string
  /** Sensor IDs exposed by this role (from Side A firmware) */
  sensors: string[]
  /** Capability IDs (LED, buzzer, etc.) */
  capabilities: string[]
  /** Icon name for UI */
  icon: string
}

/** Production device roles (mushroom1 = Mushroom 1 box, hyphae1 = Hyphae 1 box) */
export const DEVICE_ROLE_CONFIGS: Record<string, DeviceRoleConfig> = {
  mushroom1: {
    roleId: "mushroom1",
    name: "Mushroom 1",
    slug: "mushroom-1",
    description: "Flagship quadrupedal sensing platform with dual BME688, IAQ, and environmental telemetry.",
    sensors: ["bme688_a", "bme688_b", "spore_detection", "sound"],
    capabilities: ["led", "buzzer", "neopixel", "telemetry", "serial", "lora", "bluetooth", "wifi"],
    icon: "mushroom",
  },
  hyphae1: {
    roleId: "hyphae1",
    name: "Hyphae 1",
    slug: "hyphae-1",
    description: "Modular soil and subsurface sensor platform with soil moisture and environmental sensing.",
    sensors: ["bme688_a", "bme688_b", "soil_moisture", "spore_detection"],
    capabilities: ["led", "buzzer", "telemetry", "serial", "lora", "bluetooth", "wifi"],
    icon: "hyphae",
  },
}

/** Resolve deviceId (e.g. mycobrain-001, mushroom1, hyphae1) to role config */
export function getRoleConfigForDevice(
  deviceId: string,
  role?: string | null
): DeviceRoleConfig | null {
  const r = role?.toLowerCase()
  if (r && DEVICE_ROLE_CONFIGS[r]) return DEVICE_ROLE_CONFIGS[r]
  if (deviceId.toLowerCase().startsWith("mushroom")) return DEVICE_ROLE_CONFIGS.mushroom1
  if (deviceId.toLowerCase().startsWith("hyphae") || deviceId.toLowerCase().startsWith("hypha1"))
    return DEVICE_ROLE_CONFIGS.hyphae1
  return DEVICE_ROLE_CONFIGS.mushroom1 ?? null
}

/** Valid role slugs for URL routing */
export const VALID_DEVICE_ROLES = ["mushroom1", "hyphae1"] as const
