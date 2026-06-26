/**
 * Psathyrella buoy — stable catalog/registry ids vs live USB COM port.
 * Device Manager may show COM3 while Earth Sim catalog id stays psathyrella-buoy-com4.
 */

export const PSATHYRELLA_CATALOG_ID = "psathyrella-buoy-com4"
/** Stable MAS/registry id (API compatibility). Physical port may be COM3. */
export const PSATHYRELLA_REGISTRY_ID = "mycobrain-COM4"
export const PSATHYRELLA_SERIAL_ALIASES = new Set([
  PSATHYRELLA_REGISTRY_ID.toLowerCase(),
  "mycobrain-com3",
  "com3",
  "com4",
  PSATHYRELLA_CATALOG_ID,
])

export function isPsathyrellaRegistryOrCatalogId(value: string | null | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  if (PSATHYRELLA_SERIAL_ALIASES.has(normalized)) return true
  return normalized.includes("psathyrella")
}

export function isLocalPsathyrellaSerialTarget(portOrId: string | null | undefined): boolean {
  if (!portOrId) return false
  const value = portOrId.trim()
  const upper = value.toUpperCase()
  if (/^COM\d+$/.test(upper)) return true
  if (/^MYCOBRAIN-COM\d+$/i.test(value)) return true
  return isPsathyrellaRegistryOrCatalogId(value)
}

/** Resolve control/telemetry target: prefer live mycobrain-COMn over stable registry alias. */
export function resolveLocalSerialServiceTarget(
  portOrRegistry: string | null | undefined,
  connectedSerialIds?: string[] | null
): string {
  const raw = String(portOrRegistry || "").trim()
  if (!raw) return PSATHYRELLA_REGISTRY_ID

  const bareCom = raw.match(/^COM(\d+)$/i)?.[0]
  if (bareCom) return `mycobrain-${bareCom.toUpperCase()}`

  const mycobrainCom = raw.match(/^mycobrain-(COM\d+)$/i)?.[1]
  if (mycobrainCom) return `mycobrain-${mycobrainCom.toUpperCase()}`

  if (isPsathyrellaRegistryOrCatalogId(raw) && connectedSerialIds?.length) {
    const psathyrella = connectedSerialIds.find((id) => /^mycobrain-COM\d+$/i.test(id))
    if (psathyrella) return psathyrella
  }

  return raw
}
