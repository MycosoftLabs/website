/**
 * Tactus–Mechanical binding is discovery-only until an approved Elephant Robotics
 * service contract is proven. A UI route existing is never a connected claim.
 */

export const APPROVED_TACTUS_CONTRACT_ID = "fusarium.tactus.mycobot.v1" as const
export const APPROVED_TACTUS_MANUFACTURER = "Elephant Robotics" as const
export const APPROVED_TACTUS_MODEL = "myCobot 280 Pi 2023" as const
export const APPROVED_TACTUS_READINESS_PATHS = Object.freeze([
  "/api/fusarium/tactus/health",
  "/api/fusarium/tactus/readiness",
])

export type TactusBindingState = "unbound" | "discovered" | "ready" | "connected"

export interface TactusBinding {
  contractId: typeof APPROVED_TACTUS_CONTRACT_ID
  manufacturer: typeof APPROVED_TACTUS_MANUFACTURER
  model: typeof APPROVED_TACTUS_MODEL
  state: TactusBindingState
  connected: boolean
  motionAuthorized: false
  contactedHardware: false
  message: string
}

export function bindApprovedTactusService(input: {
  contractId?: unknown
  manufacturer?: unknown
  model?: unknown
  uiRouteExists?: unknown
  readinessVerified?: unknown
  serialObserved?: unknown
  identityVerified?: unknown
}): TactusBinding {
  const contractOk = input.contractId === APPROVED_TACTUS_CONTRACT_ID
    && input.manufacturer === APPROVED_TACTUS_MANUFACTURER
    && input.model === APPROVED_TACTUS_MODEL
  const readiness = input.readinessVerified === true
    && input.serialObserved === true
    && input.identityVerified === true
    && contractOk

  if (readiness) {
    return {
      contractId: APPROVED_TACTUS_CONTRACT_ID,
      manufacturer: APPROVED_TACTUS_MANUFACTURER,
      model: APPROVED_TACTUS_MODEL,
      state: "ready",
      connected: false,
      motionAuthorized: false,
      contactedHardware: false,
      message: "Approved service contract is ready for passive discovery. Hardware remains unmoved and unconnected until an explicit operator gate.",
    }
  }

  if (contractOk) {
    return {
      contractId: APPROVED_TACTUS_CONTRACT_ID,
      manufacturer: APPROVED_TACTUS_MANUFACTURER,
      model: APPROVED_TACTUS_MODEL,
      state: "discovered",
      connected: false,
      motionAuthorized: false,
      contactedHardware: false,
      message: "Approved Elephant Robotics contract discovered. Passive readiness only.",
    }
  }

  return {
    contractId: APPROVED_TACTUS_CONTRACT_ID,
    manufacturer: APPROVED_TACTUS_MANUFACTURER,
    model: APPROVED_TACTUS_MODEL,
    state: "unbound",
    connected: false,
    motionAuthorized: false,
    contactedHardware: false,
    message: input.uiRouteExists === true
      ? "A Tactus UI route exists, but that is not a connected hardware claim."
      : "No approved Tactus service contract is bound.",
  }
}
