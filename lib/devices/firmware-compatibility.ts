/**
 * Firmware compatibility matrix — mirrors MAS mycosoft_mas/devices/firmware_audit.py
 */

export type CompatibilityTier = "compatible" | "partial" | "incompatible" | "unknown"

export const CANONICAL_SIDE_A_VERSION = "side-a-mdp-2.1.0"
export const CANONICAL_SIDE_B_VERSION = "side-b-mdp-2.1.0"

export interface CompatibilityRow {
  capability: string
  label: string
  required_for: string
  min_firmware?: string | null
  requires_modules?: string[]
  requires_edge?: string
  note?: string
}

export const FIRMWARE_COMPATIBILITY_MATRIX: CompatibilityRow[] = [
  {
    capability: "mdp_v1_commands",
    label: "MDP v1 commands",
    required_for: "Console, Earth Simulator widgets",
    min_firmware: "side-a-mdp-2.0.0",
  },
  {
    capability: "buzzer_presets",
    label: "Buzzer presets",
    required_for: "BuzzerControlWidget",
    min_firmware: "side-a-mdp-2.0.0",
    requires_modules: ["buzzer"],
  },
  {
    capability: "neopixel_patterns",
    label: "NeoPixel patterns",
    required_for: "LedControlWidget rainbow/off",
    min_firmware: "side-a-mdp-2.0.0",
    requires_modules: ["neopixel"],
  },
  {
    capability: "i2c_peripheral_grid",
    label: "I2C peripheral grid",
    required_for: "PeripheralGrid scan/status",
    min_firmware: "side-a-mdp-2.0.0",
    requires_modules: ["i2c"],
  },
  {
    capability: "optical_acoustic_tx",
    label: "Optical/acoustic TX",
    required_for: "CommunicationPanel TX tabs",
    min_firmware: "side-a-mdp-2.1.0",
    note: "Not fully present in SideA_MDP 2.1.0 — ScienceComms port pending",
  },
  {
    capability: "openclaw_agent",
    label: "OpenClaw / NemoClaw agent",
    required_for: "MAS relay firmware tasks",
    requires_edge: "openclaw_18789",
  },
]

export interface FirmwareAuditDevice {
  device_id: string
  device_name?: string
  device_role?: string
  firmware_version?: string
  compatibility_tier: CompatibilityTier
  missing_capabilities?: string[]
  recommended_action?: string
  agent_url?: string
  errors?: string[]
}

export interface FirmwareAuditResponse {
  canonical_side_a: string
  summary: {
    compatible: number
    partial: number
    incompatible: number
    unknown: number
    total: number
  }
  devices: FirmwareAuditDevice[]
  compatibility_matrix?: CompatibilityRow[]
}

export function tierBadgeClass(tier: CompatibilityTier): string {
  switch (tier) {
    case "compatible":
      return "bg-green-500/15 text-green-600 border-green-500/40"
    case "partial":
      return "bg-yellow-500/15 text-yellow-700 border-yellow-500/40"
    case "incompatible":
      return "bg-red-500/15 text-red-600 border-red-500/40"
    default:
      return "bg-muted text-muted-foreground border-muted"
  }
}

export function tierLabel(tier: CompatibilityTier): string {
  switch (tier) {
    case "compatible":
      return "Compatible"
    case "partial":
      return "Partial"
    case "incompatible":
      return "Incompatible"
    default:
      return "Unknown"
  }
}

export function isFieldRegistryId(value: string | null | undefined): boolean {
  if (!value) return false
  return value.startsWith("mycobrain-") && !value.startsWith("COM") && !value.startsWith("/dev")
}

export function isLocalSerialPort(value: string | null | undefined): boolean {
  if (!value) return false
  return value.startsWith("COM") || value.startsWith("/dev/")
}
