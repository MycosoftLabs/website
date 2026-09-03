/**
 * The six senses, and the sensing tool that serves each one.
 *
 * The platform markets six senses and now has a dedicated local workbench for
 * each one. This file remains explicit about the boundary between implemented
 * evidence workflows and unbound live hardware/providers, because a rendered
 * tool must not be mistaken for a verified live sensing capability.
 *
 * `status` is a claim about software in THIS repo, not about hardware:
 *   built     — a workspace exists and is wired to a runtime bind
 *   partial   — a workspace exists but covers less than the sense requires
 *   scaffold  — named and scoped, nothing implemented behind it yet
 */

export type SenseStatus = "built" | "partial" | "scaffold"

export interface Sense {
  /** The sense as the platform markets it. */
  id: string
  sense: string
  /** The tool that serves it. `null` where none is named yet. */
  tool: string | null
  /** Console route for the tool's workspace. */
  href: string
  status: SenseStatus
  /** What the tool must cover for the sense to be honestly served. */
  scope: string
  /** What is missing. Empty for `built`. */
  gap?: string
}

export const SIX_SENSES: Sense[] = [
  {
    id: "spectral",
    sense: "Spectral",
    tool: "BlueSight",
    href: "/fusarium/bluesight",
    status: "partial",
    scope:
      "The whole electromagnetic spectrum, not just the visible band: radio, radar, lidar, infrared, visible, ultraviolet, X-ray and gamma.",
    gap:
      "Camera, radar, LiDAR, and passive Wi-Fi evidence replay are implemented with exact scope, timestamps, provenance, and correlation gates. Live device adapters plus infrared, ultraviolet, X-ray, and gamma evidence remain unbound.",
  },
  {
    id: "acoustic",
    sense: "Acoustic",
    tool: "SINE",
    href: "/fusarium/sine",
    status: "built",
    scope: "Hydrophone, microphone and vibration audio across the sensed band.",
  },
  {
    id: "bioelectric",
    sense: "Bioelectric",
    tool: "FCI",
    href: "/fusarium/fci",
    status: "built",
    scope: "Fungal Computing Interface — bioelectric potential across mycelial networks.",
  },
  {
    id: "thermal",
    sense: "Thermal",
    tool: "Thermal Field Laboratory",
    href: "/fusarium/thermal",
    status: "built",
    scope:
      "Radiometric temperature: thermal imaging, per-pixel calibrated temperature, differential and time-series thermal signatures.",
  },
  {
    id: "chemical",
    sense: "Chemical",
    tool: "GANDHA",
    href: "/fusarium/gandha",
    status: "built",
    scope: "Gas and volatile organic compound detection — the olfactory sense.",
  },
  {
    id: "mechanical",
    sense: "Mechanical",
    tool: "Tactus — Mechanical",
    href: "/fusarium/mechanical",
    status: "built",
    scope:
      "Tactile skin, bump and contact detection, pressure and force, proprioception, collision response, and evidence-led interaction testing.",
    gap:
      "The offline capture, tactile, force, joint, and labeling workbench is built. Live robot adapters and an approved simulation or training provider remain unbound.",
  },
]

export function senseFor(toolId: string): Sense | null {
  return SIX_SENSES.find((s) => s.href === `/fusarium/${toolId}`) ?? null
}

export const SENSE_STATUS_LABEL: Record<SenseStatus, string> = {
  built: "Built",
  partial: "Partial",
  scaffold: "Not built",
}
