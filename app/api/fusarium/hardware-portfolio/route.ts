import { type NextRequest, NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"
import {
  HARDWARE_PORTFOLIO_CONSUMER_BINDING_V1,
  HARDWARE_PORTFOLIO_V1,
  PORTFOLIO_PROTOCOL_REFERENCES_V1,
  SHARED_BLUESIGHT_STACK_V1,
  hardwarePortfolioConsumerView,
  validateHardwarePortfolioV1,
} from "@/lib/fusarium/device-capabilities/hardware-portfolio-v3"

export const dynamic = "force-dynamic"

/**
 * Owner-only, read-only reference contract. The portfolio is a declared design
 * baseline and never overrides the observed registry, signed BOM, or live
 * telemetry for a physical device.
 */
export async function GET(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const validationIssues = validateHardwarePortfolioV1()
  if (validationIssues.length > 0) {
    return NextResponse.json(
      {
        schema: HARDWARE_PORTFOLIO_V1.schema,
        state: "invalid",
        message: "The versioned hardware reference failed its local contract validation.",
        issues: validationIssues,
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    )
  }

  const requestedFamilyId = request.nextUrl.searchParams.get("portfolioFamilyId")
  const consumerView = requestedFamilyId === null ? null : hardwarePortfolioConsumerView(requestedFamilyId)
  if (requestedFamilyId !== null && !consumerView) {
    return NextResponse.json(
      {
        schema: HARDWARE_PORTFOLIO_CONSUMER_BINDING_V1.schema,
        state: "not-found",
        message: "No exact canonical portfolioFamilyId matches the requested reference.",
        inferenceAttempted: false,
      },
      { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } },
    )
  }

  return NextResponse.json(
    {
      state: "available",
      portfolio: HARDWARE_PORTFOLIO_V1,
      protocols: PORTFOLIO_PROTOCOL_REFERENCES_V1,
      sharedSensing: SHARED_BLUESIGHT_STACK_V1,
      consumerContract: HARDWARE_PORTFOLIO_CONSUMER_BINDING_V1,
      consumerView,
      installationAuthority: "registry-or-device-specific-evidence",
      mutationAuthority: false,
    },
    { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
  )
}
