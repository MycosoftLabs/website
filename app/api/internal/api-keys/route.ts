import { NextResponse } from "next/server"
import { createApiKey, revokeApiKey } from "@/lib/auth/api-keys"
import { handleApiError } from "@/lib/error/error-handler"

export async function POST(request: Request) {
  try {
    // In a production environment, you would check authentication here
    // This is an internal API, so we're assuming it's only accessible to authorized users

    const { agentId, description, expiresInDays } = await request.json()

    if (!agentId || !description) {
      return NextResponse.json({ error: "Agent ID and description are required" }, { status: 400 })
    }

    const key = await createApiKey(agentId, description, expiresInDays)

    if (!key) {
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
    }

    return NextResponse.json({ key })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    if (!key) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    const success = await revokeApiKey(key)

    if (!success) {
      return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 })
    }

    return NextResponse.json({ success })
  } catch (error) {
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
