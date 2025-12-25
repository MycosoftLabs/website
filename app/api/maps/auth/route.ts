import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get the Azure Maps key from environment variables (server-side only)
    const azureMapsKey = process.env.AZURE_MAPS_KEY
    const clientId = process.env.AZURE_MAPS_CLIENT_ID

    if (!azureMapsKey || !clientId) {
      // Local dev default: don't hard-fail the dashboard; let the UI render a graceful fallback.
      return NextResponse.json(
        {
          enabled: false,
          reason: "Azure Maps credentials not configured",
        },
        { status: 200 },
      )
    }

    // Create a token with expiration (1 hour from now)
    const expiry = Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration

    // Return only the client ID and expiry, not the actual key
    return NextResponse.json({
      enabled: true,
      clientId,
      expiry,
      tokenType: "anonymous",
    })
  } catch (error) {
    console.error("Error generating Azure Maps auth token:", error)
    return NextResponse.json({ error: "Failed to generate authentication token" }, { status: 500 })
  }
}
