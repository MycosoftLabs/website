import { NextResponse } from "next/server"

import { requireOwner } from "@/lib/auth/api-auth"
import {
  FABRIC_CONFIGURATION_KEYS,
  buildDataCenterFabricContract,
  type FabricConfigurationPresence,
} from "@/lib/fusarium/data-fusion/fabric-contract"

export const dynamic = "force-dynamic"

/**
 * Owner-only, name-presence inventory. It never opens a path, mount, database,
 * network connection, credential, cloud client, or legacy storage route.
 */
export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const presence = Object.fromEntries(
    FABRIC_CONFIGURATION_KEYS.map((key) => [key, Boolean(process.env[key]?.trim())]),
  ) as FabricConfigurationPresence

  return NextResponse.json(buildDataCenterFabricContract(presence), {
    headers: {
      "Cache-Control": "no-store",
      "X-Fusarium-Operation": "read-only-name-presence-inventory",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
