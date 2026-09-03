/**
 * Exact physical-device identity for Fusarium sensing surfaces.
 *
 * Shared MDP board IDs are transport aliases, not physical identity.
 * Distinct field units stay distinct even when names or MDP strings look similar.
 * Identifiers here must stay aligned with lib/devices/field-deployments.ts.
 */

export const PHYSICAL_DEVICE_IDENTITY_SCHEMA = "fusarium.physical-device.v1" as const
export const SHARED_MDP_DEVICE_ID = "mycobrain-sidea-10b41d"

export const HYPHAE_1_REGISTRY_ID = "mycobrain-hyphae1-jetson-228"
export const MUSHROOM_1_REGISTRY_ID = "mycobrain-mushroom1-jetson-123"

export type PhysicalDeviceLifecycleState =
  | "declared"
  | "offline"
  | "connected"
  | "stale"
  | "unavailable"
  | "unauthorized"
  | "live"

export interface PhysicalDeviceIdentity {
  schema: typeof PHYSICAL_DEVICE_IDENTITY_SCHEMA
  registryId: string
  catalogId: string
  displayName: string
  provenAliases: readonly string[]
  rejectedLookalikes: readonly string[]
  mdpDeviceId: string | null
  mdpIsIdentity: false
}

export interface DeviceRegistryCandidate {
  id?: unknown
  registry_id?: unknown
  registryId?: unknown
  catalog_id?: unknown
  catalogId?: unknown
  device_id?: unknown
  deviceId?: unknown
  name?: unknown
  mdp_device_id?: unknown
  mdpDeviceId?: unknown
}

export interface LiveTelemetryFrame {
  selectedDeviceId: string
  observedAt: string
  receivedAt: string
  sourceRef: string
  sensorKeys: readonly string[]
}

export interface LiveTelemetrySession {
  selectedDeviceId: string | null
  liveSessionIntent: boolean
  lastVerifiedFrame: LiveTelemetryFrame | null
  lastVerifiedAt: string | null
  lifecycle: PhysicalDeviceLifecycleState
  retainedLastVerifiedFrame: boolean
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function identity(input: {
  registryId: string
  catalogId: string
  displayName: string
  mdpDeviceId: string | null
  extraProven?: readonly string[]
  extraRejected?: readonly string[]
}): PhysicalDeviceIdentity {
  const provenAliases = Object.freeze([input.registryId, input.catalogId, ...(input.extraProven ?? [])])
  const rejected = [input.mdpDeviceId, input.displayName, SHARED_MDP_DEVICE_ID, ...(input.extraRejected ?? [])]
    .filter((value): value is string => Boolean(value) && !provenAliases.includes(value))
  return {
    schema: PHYSICAL_DEVICE_IDENTITY_SCHEMA,
    registryId: input.registryId,
    catalogId: input.catalogId,
    displayName: input.displayName,
    provenAliases,
    rejectedLookalikes: Object.freeze([...new Set(rejected)]),
    mdpDeviceId: input.mdpDeviceId,
    mdpIsIdentity: false,
  }
}

export const KNOWN_PHYSICAL_DEVICES: readonly PhysicalDeviceIdentity[] = Object.freeze([
  identity({
    registryId: MUSHROOM_1_REGISTRY_ID,
    catalogId: "mushroom-1",
    displayName: "Mushroom 1",
    mdpDeviceId: SHARED_MDP_DEVICE_ID,
  }),
  identity({
    registryId: HYPHAE_1_REGISTRY_ID,
    catalogId: "hyphae-1",
    displayName: "Hyphae 1",
    mdpDeviceId: SHARED_MDP_DEVICE_ID,
  }),
  identity({
    registryId: "mycobrain-COM4",
    catalogId: "psathyrella-buoy-com4",
    displayName: "Psathyrella Aquatic MycoBrain Buoy",
    mdpDeviceId: "mycobrain-COM3",
    extraProven: ["mycobrain-COM3"],
  }),
])

export function physicalDeviceByRegistryId(registryId: string): PhysicalDeviceIdentity | null {
  return KNOWN_PHYSICAL_DEVICES.find((device) => device.registryId === registryId) ?? null
}

export function provenAliasesFor(registryId: string): readonly string[] {
  return physicalDeviceByRegistryId(registryId)?.provenAliases ?? Object.freeze([registryId])
}

export function isSharedMdpIdentityToken(value: unknown): boolean {
  return text(value) === SHARED_MDP_DEVICE_ID
}

function candidateTokens(candidate: DeviceRegistryCandidate): string[] {
  return [
    candidate.registry_id,
    candidate.registryId,
    candidate.id,
    candidate.device_id,
    candidate.deviceId,
    candidate.catalog_id,
    candidate.catalogId,
  ].map(text).filter((value): value is string => Boolean(value))
}

/**
 * Resolve one physical device from an exact proven identifier.
 * Similar display names and shared MDP tokens never merge distinct units.
 */
export function resolvePhysicalDeviceIdentity(candidate: DeviceRegistryCandidate): PhysicalDeviceIdentity | null {
  const tokens = candidateTokens(candidate)
  if (tokens.length === 0) return null
  if (tokens.every((token) => token === SHARED_MDP_DEVICE_ID)) return null

  const matches = KNOWN_PHYSICAL_DEVICES.filter((device) =>
    tokens.some((token) => device.provenAliases.includes(token)),
  )
  return matches.length === 1 ? matches[0] : null
}

export function mergeProvenRegistryEntries(candidates: readonly DeviceRegistryCandidate[]): PhysicalDeviceIdentity[] {
  const merged = new Map<string, PhysicalDeviceIdentity>()
  for (const candidate of candidates) {
    const resolved = resolvePhysicalDeviceIdentity(candidate)
    if (!resolved) continue
    merged.set(resolved.registryId, resolved)
  }
  return [...merged.values()].sort((left, right) => left.registryId.localeCompare(right.registryId))
}

export function classifyPhysicalDeviceLifecycle(input: {
  declared: boolean
  authorized: boolean
  reachable: boolean
  connected: boolean
  hasVerifiedFrame: boolean
  stale: boolean
}): PhysicalDeviceLifecycleState {
  if (!input.authorized) return "unauthorized"
  if (!input.declared) return "unavailable"
  if (input.hasVerifiedFrame && input.connected && !input.stale) return "live"
  if (input.hasVerifiedFrame && input.stale) return "stale"
  if (input.connected) return "connected"
  if (input.reachable === false) return "offline"
  return "declared"
}

export function createLiveTelemetrySession(selectedDeviceId: string | null, liveSessionIntent = false): LiveTelemetrySession {
  return {
    selectedDeviceId,
    liveSessionIntent,
    lastVerifiedFrame: null,
    lastVerifiedAt: null,
    lifecycle: selectedDeviceId ? "declared" : "unavailable",
    retainedLastVerifiedFrame: false,
  }
}

export function bindTelemetryFrameToSelectedDevice(
  selectedDeviceId: string,
  frameDeviceId: unknown,
): boolean {
  return text(frameDeviceId) === selectedDeviceId
}

export function applyLiveTelemetryPoll(
  session: LiveTelemetrySession,
  poll: {
    selectedDeviceId: string
    liveSessionIntent: boolean
    authorized: boolean
    reachable: boolean
    connected: boolean
    failed: boolean
    stale: boolean
    frame: LiveTelemetryFrame | null
  },
): LiveTelemetrySession {
  const selectedDeviceId = session.selectedDeviceId ?? poll.selectedDeviceId
  const liveSessionIntent = session.liveSessionIntent || poll.liveSessionIntent
  const frameMatches = poll.frame
    ? bindTelemetryFrameToSelectedDevice(selectedDeviceId, poll.frame.selectedDeviceId)
    : false
  const acceptedFrame = !poll.failed && !poll.stale && frameMatches ? poll.frame : null
  const retain = (poll.failed || !acceptedFrame)
    && session.lastVerifiedFrame !== null
    && bindTelemetryFrameToSelectedDevice(selectedDeviceId, session.lastVerifiedFrame.selectedDeviceId)

  const lastVerifiedFrame = acceptedFrame ?? (retain ? session.lastVerifiedFrame : null)
  const lastVerifiedAt = acceptedFrame
    ? acceptedFrame.receivedAt
    : retain
      ? session.lastVerifiedAt
      : null

  return {
    selectedDeviceId,
    liveSessionIntent,
    lastVerifiedFrame,
    lastVerifiedAt,
    retainedLastVerifiedFrame: Boolean(retain && !acceptedFrame),
    lifecycle: classifyPhysicalDeviceLifecycle({
      declared: Boolean(selectedDeviceId),
      authorized: poll.authorized,
      reachable: poll.reachable,
      connected: poll.connected,
      hasVerifiedFrame: lastVerifiedFrame !== null,
      stale: Boolean(poll.stale && lastVerifiedFrame && !acceptedFrame),
    }),
  }
}

export function missingSensorIsUnavailable(present: boolean): "unavailable" | "measured" {
  return present ? "measured" : "unavailable"
}
