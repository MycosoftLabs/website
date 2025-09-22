import { NextResponse } from "next/server"

export async function GET() {
  try {
    // In a real application, you would fetch a token from Azure Maps
    // For now, we'll return a mock token structure
    const token = process.env.NEXT_PUBLIC_AZURE_MAPS_KEY || "mock-token"

    return NextResponse.json({
      token,
      expires: Date.now() + 3600000, // 1 hour from now
    })
  } catch (error) {
    console.error("Error getting Azure Maps token:", error)
    return NextResponse.json({ error: "Failed to get authentication token" }, { status: 500 })
  }
}
