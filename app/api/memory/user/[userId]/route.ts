/**
 * User Profile Memory API Route - February 5, 2026
 *
 * Proxy endpoint for user profile memory operations.
 * User scope is enforced server-side; path userId cannot impersonate another account.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  assertScopedMasUserId,
  masJsonHeaders,
  masOrchestratorBaseUrl,
} from "@/lib/myca/scoped-mas-user"
import { requireAuthenticatedIdentity } from "@/lib/auth/verified-identity"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: pathUserId } = await params
  const scope = await assertScopedMasUserId(pathUserId)
  if ("denied" in scope) return scope.denied

  try {
    const response = await fetch(
      `${masOrchestratorBaseUrl()}/api/memory/user/${encodeURIComponent(scope.scopedUserId)}/profile`,
      {
        method: "GET",
        headers: masJsonHeaders(),
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `User profile API returned ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("User profile API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "User profile service unreachable",
      },
      { status: 502 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: pathUserId } = await params
  const scope = await assertScopedMasUserId(pathUserId)
  if ("denied" in scope) return scope.denied

  const authError = requireAuthenticatedIdentity(scope.identity)
  if (authError) return authError

  try {
    const body = await request.json()
    const { action, key, value } = body

    if (action === "update_preference") {
      const response = await fetch(`${masOrchestratorBaseUrl()}/api/memory/write`, {
        method: "POST",
        headers: masJsonHeaders(),
        body: JSON.stringify({
          agent_id: "myca_brain",
          scope: "user",
          key: `preference:${key}`,
          value: value,
          metadata: {
            user_id: scope.scopedUserId,
            updated_by: "user_profile_widget",
          },
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: `Memory write API returned ${response.status}` },
          { status: response.status }
        )
      }

      return NextResponse.json({ success: true, message: "Preference updated" })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("User profile POST error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
