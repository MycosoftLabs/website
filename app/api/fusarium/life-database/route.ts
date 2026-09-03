import { type NextRequest } from "next/server"
import { GET as getAncestryCatalog } from "@/app/api/ancestry/route"
import { requireOwner } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

/**
 * Owner-gated Fusarium facade over the shared MINDEX catalog reader.
 *
 * NatureOS may keep its public scientific surface. Fusarium never asks the
 * browser for a MINDEX credential and never exposes its protected catalog
 * without the existing owner session boundary.
 */
export async function GET(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error
  return getAncestryCatalog(request)
}
