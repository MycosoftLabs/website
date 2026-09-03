import { type NextRequest, NextResponse } from "next/server"
import { collectSameOriginSensingTelemetry, SENSING_TELEMETRY_MAX_DEVICES } from "@/lib/fusarium/sensing-telemetry/adapter"
import { FIELD_MYCOBRAIN_DEPLOYMENTS, deploymentByCatalogId, deploymentByRegistryId } from "@/lib/devices/field-deployments"
import { requireOwner } from "@/lib/auth/api-auth"
import { isSharedMdpIdentityToken } from "@/lib/fusarium/device-identity/physical-device"

export const dynamic = "force-dynamic"

function passiveReadTimeoutMs(sourceRef: string): number {
  if (sourceRef === "/api/mycobrain/devices") return 8_000
  if (sourceRef.startsWith("/api/mycobrain?")) return 18_000
  // Cache-only requests never touch hardware; allow a bounded cold-route compile
  // while keeping them well below the active serial-request timeout.
  if (/^\/api\/mycobrain\/[^/]+\/sensors\?cache_only=1$/.test(sourceRef)) return 6_000
  if (/^\/api\/mycobrain\/[^/]+\/sensors\?live_selected=1$/.test(sourceRef)) return 18_000
  if (sourceRef.startsWith("/api/mindex/telemetry/samples?")) return 16_000
  if (sourceRef === "/api/devices/network?include_offline=true") return 16_000
  if (/^\/api\/devices\/network\/[^/]+\/telemetry$/.test(sourceRef)) return 22_000
  return 12_000
}

function fieldIdentityEvidence(deviceIds: readonly string[]) {
  const aliasesBySelected: Record<string, readonly string[]> = {}
  const readDeviceIds: string[] = []
  const liveReadDeviceIds: string[] = []
  for (const selectedDeviceId of deviceIds) {
    if (isSharedMdpIdentityToken(selectedDeviceId)) {
      aliasesBySelected[selectedDeviceId] = []
      continue
    }
    const mdpMatches = FIELD_MYCOBRAIN_DEPLOYMENTS.filter((candidate) => candidate.mdp_device_id === selectedDeviceId)
    const deployment = deploymentByCatalogId(selectedDeviceId) ?? deploymentByRegistryId(selectedDeviceId)
      ?? (mdpMatches.length === 1 ? mdpMatches[0] : undefined)
    if (!deployment) {
      aliasesBySelected[selectedDeviceId] = []
      readDeviceIds.push(selectedDeviceId)
      // An arbitrary query parameter is not physical-device authorization.
      // Unknown inventory IDs remain eligible for passive evidence only.
      continue
    }
    const mdpIsUnique = FIELD_MYCOBRAIN_DEPLOYMENTS.filter((candidate) => candidate.mdp_device_id === deployment.mdp_device_id).length === 1
    aliasesBySelected[selectedDeviceId] = [deployment.catalog_id, deployment.registry_id, ...(mdpIsUnique ? [deployment.mdp_device_id] : [])]
      .filter((candidate) => candidate !== selectedDeviceId)
    // Device Network and MAS use the registry identifier. The catalog-to-registry
    // relationship is explicit in field-deployments; no name or device type is used.
    readDeviceIds.push(deployment.registry_id)
    if (mdpIsUnique) readDeviceIds.push(deployment.mdp_device_id)
    // Only one exact physical identity is actively sampled for each selected
    // inventory device. A unique local MDP/serial ID takes precedence; shared
    // MDP IDs are never used to choose a physical target.
    liveReadDeviceIds.push(mdpIsUnique ? deployment.mdp_device_id : deployment.registry_id)
  }
  return { aliasesBySelected, readDeviceIds, liveReadDeviceIds }
}

export async function GET(request: NextRequest) {
  const deviceIds = [...new Set(request.nextUrl.searchParams.getAll("deviceId").map((value) => value.trim()).filter(Boolean))]
  if (deviceIds.length > SENSING_TELEMETRY_MAX_DEVICES) return NextResponse.json({ state: "error", message: `At most ${SENSING_TELEMETRY_MAX_DEVICES} deviceId values are accepted.` }, { status: 400 })
  // Even passive aggregation fans out to internal, server-authenticated sources.
  // Keep the whole Fusarium device-observation boundary owner-only so it cannot
  // become an anonymous inventory or request-amplification surface.
  const auth = await requireOwner()
  if (auth.error) return auth.error
  const origin = request.nextUrl.origin
  const liveSelectedRead = request.nextUrl.searchParams.get("live") === "1"
  // Selection defines observation scope, not hardware authority. The client
  // must also affirmatively enable live mode for its exact current selection.
  const identityEvidence = fieldIdentityEvidence(deviceIds)
  const cookie = request.headers.get("cookie")
  const authorization = request.headers.get("authorization")
  const result = await collectSameOriginSensingTelemetry(deviceIds, async (sourceRef) => {
    const receivedAtBefore = new Date().toISOString()
    const timeoutMs = passiveReadTimeoutMs(sourceRef)
    try {
      const headers: Record<string, string> = { Accept: "application/json" }
      // The aggregate is owner-only. Forward only its same-origin verified
      // session context so protected downstream reads cannot be used directly
      // or anonymously through this fan-out boundary.
      if (cookie) headers.Cookie = cookie
      if (authorization) headers.Authorization = authorization
      const response = await fetch(new URL(sourceRef, origin), { method: "GET", headers, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) })
      const receivedAt = new Date().toISOString()
      if (!response.ok) return { sourceRef, state: "unavailable", receivedAt, payload: null, message: `Same-origin source returned HTTP ${response.status}.` }
      const payload = await response.json()
      return { sourceRef, state: "available", receivedAt, payload, message: sourceRef.includes("live_selected=1") ? "Exact selected-device sensor GET completed." : "Passive same-origin GET completed." }
    } catch {
      return { sourceRef, state: "unavailable", receivedAt: receivedAtBefore, payload: null, message: `Same-origin source was unavailable within ${Math.round(timeoutMs / 1000)} seconds.` }
    }
  }, new Date().toISOString(), {
    ...identityEvidence,
    liveReadDeviceIds: liveSelectedRead ? identityEvidence.liveReadDeviceIds : [],
  })
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } })
}
