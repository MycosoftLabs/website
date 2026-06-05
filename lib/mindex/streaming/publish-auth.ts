import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"

import { requireCompanyAuth } from "@/lib/auth/api-auth"
import { env } from "@/lib/env"

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function hasValidServerKey(request: Request): boolean {
  const configured = env.mycorrhizaePublishKey?.trim()
  const provided = request.headers.get("x-mycorrhizae-key")?.trim()
  return Boolean(configured && provided && safeCompare(provided, configured))
}

export async function requireMindexStreamPublisher(request: Request): Promise<NextResponse | null> {
  if (hasValidServerKey(request)) return null

  const auth = await requireCompanyAuth()
  if (auth.error) return auth.error

  return null
}
