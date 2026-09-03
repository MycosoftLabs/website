import { type NextRequest, NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"
import {
  DEVICE_OBSERVATION_SCHEMA,
  parseDeviceObservationScope,
} from "@/lib/fusarium/device-observations/contracts"
import {
  deviceObservationAdapterReadiness,
  queryDeviceObservations,
} from "@/lib/fusarium/device-observations/registry"

export const dynamic = "force-dynamic"

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const

/**
 * Read-only same-origin observation query.
 *
 * Repeated deviceId values select one or more devices. missionId, locationId,
 * and environmentId are optional isolation filters and never acquire devices.
 */
export async function GET(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const parsed = parseDeviceObservationScope(request.nextUrl.searchParams)
  if (!parsed.ok || !parsed.scope) {
    return NextResponse.json(
      {
        schema: DEVICE_OBSERVATION_SCHEMA,
        state: "error",
        error: {
          code: "invalid_device_observation_scope",
          message: "The device-observation scope was rejected.",
          issues: parsed.issues,
        },
        adapterReadiness: deviceObservationAdapterReadiness(),
      },
      { status: 400, headers: RESPONSE_HEADERS },
    )
  }

  const result = await queryDeviceObservations(parsed.scope, {
    evaluatedAt: new Date().toISOString(),
  })
  return NextResponse.json(result, { status: 200, headers: RESPONSE_HEADERS })
}
