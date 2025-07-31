import { NextResponse } from "next/server"

export async function GET() {
  try {
    // In a real implementation, you would generate a proper Azure Maps token
    // For now, we'll return the subscription key as the token
    const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_MAPS_KEY

    if (!subscriptionKey) {
      return NextResponse.json({ error: "Azure Maps subscription key not configured" }, { status: 500 })
    }

    // Return the subscription key as token
    // In production, you might want to generate a proper SAS token
    return NextResponse.json({
      token: subscriptionKey,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    })
  } catch (error) {
    console.error("Azure Maps auth error:", error)
    return NextResponse.json({ error: "Failed to generate authentication token" }, { status: 500 })
  }
}
