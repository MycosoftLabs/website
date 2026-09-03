import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"
import { buildFormSpaceCatalog } from "@/lib/fusarium/situational-awareness/form-space"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  return NextResponse.json(buildFormSpaceCatalog(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  })
}
