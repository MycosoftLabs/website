import { NextResponse } from "next/server"

/**
 * GET /api/auth/providers
 * Returns which OAuth providers are configured and available
 */
export async function GET() {
  // Check if OAuth providers are configured
  const googleConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && 
    process.env.GOOGLE_CLIENT_SECRET && 
    process.env.GOOGLE_CLIENT_ID !== "placeholder" &&
    !process.env.GOOGLE_CLIENT_ID.includes("your-")
  )

  const githubConfigured = !!(
    process.env.GITHUB_ID && 
    process.env.GITHUB_SECRET
  )

  return NextResponse.json({
    providers: {
      credentials: true,
      google: googleConfigured,
      github: githubConfigured,
    },
    // Don't expose actual values, just whether they're configured
    status: {
      google: googleConfigured ? "configured" : "not_configured",
      github: githubConfigured ? "configured" : "not_configured",
    },
    message: !googleConfigured && !githubConfigured 
      ? "No OAuth providers configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET in .env.local"
      : undefined,
  })
}
