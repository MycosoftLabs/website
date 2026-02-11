import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

/**
 * OAuth Callback Handler for Cloud Integrations
 * 
 * Receives authorization codes from OAuth providers
 * and exchanges them for access tokens.
 */

// Token URLs for each provider
const TOKEN_URLS: Record<string, string> = {
  aws: "https://signin.aws.amazon.com/oauth/token",
  google: "https://oauth2.googleapis.com/token",
  azure: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  snowflake: "https://myaccount.snowflakecomputing.com/oauth/token-request",
  databricks: "https://accounts.cloud.databricks.com/oidc/accounts/v1/token",
  palantir: "https://mystack.palantirfoundry.com/oauth2/token",
}

// Client ID environment variable names
const CLIENT_ID_ENVS: Record<string, string> = {
  aws: "AWS_CLIENT_ID",
  google: "GOOGLE_CLOUD_CLIENT_ID",
  azure: "AZURE_CLIENT_ID",
  snowflake: "SNOWFLAKE_CLIENT_ID",
  databricks: "DATABRICKS_CLIENT_ID",
  palantir: "PALANTIR_CLIENT_ID",
}

const CLIENT_SECRET_ENVS: Record<string, string> = {
  aws: "AWS_CLIENT_SECRET",
  google: "GOOGLE_CLOUD_CLIENT_SECRET",
  azure: "AZURE_CLIENT_SECRET",
  snowflake: "SNOWFLAKE_CLIENT_SECRET",
  databricks: "DATABRICKS_CLIENT_SECRET",
  palantir: "PALANTIR_CLIENT_SECRET",
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const searchParams = request.nextUrl.searchParams

  // Get OAuth response parameters
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // Handle OAuth errors
  if (error) {
    const redirectUrl = new URL("/natureos/integrations", request.nextUrl.origin)
    redirectUrl.searchParams.set("error", error)
    redirectUrl.searchParams.set("error_description", errorDescription || "Unknown error")
    redirectUrl.searchParams.set("provider", provider)
    return NextResponse.redirect(redirectUrl.toString())
  }

  // Verify we have a code
  if (!code) {
    return NextResponse.redirect(
      new URL(`/natureos/integrations?error=no_code&provider=${provider}`, request.nextUrl.origin).toString()
    )
  }

  // Get provider credentials
  const clientId = process.env[CLIENT_ID_ENVS[provider]]
  const clientSecret = process.env[CLIENT_SECRET_ENVS[provider]]
  const tokenUrl = TOKEN_URLS[provider]

  if (!clientId || !clientSecret || !tokenUrl) {
    return NextResponse.redirect(
      new URL(`/natureos/integrations?error=not_configured&provider=${provider}`, request.nextUrl.origin).toString()
    )
  }

  try {
    // Exchange code for tokens
    const redirectUri = `${request.nextUrl.origin}/api/integrations/${provider}/callback`

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Token exchange failed:", errorData)
      return NextResponse.redirect(
        new URL(`/natureos/integrations?error=token_exchange_failed&provider=${provider}`, request.nextUrl.origin).toString()
      )
    }

    const tokens = await tokenResponse.json()

    // Store tokens securely (in production, use encrypted storage)
    // NOTE: Pending implementation - Secure token storage requires:
    // 1. Get authenticated user session via getServerSession(authOptions)
    // 2. Encrypt tokens using lib/security/encryption.ts before storage
    // 3. Store in Supabase integration_tokens table with user_id FK
    // 4. Set token expiry and implement refresh flow
    // SECURITY: Do not store tokens in cookies - use server-side DB only
    // await storeIntegrationTokens(userId, provider, encryptedTokens)

    // Redirect to integrations page with success message
    const successUrl = new URL("/natureos/integrations", request.nextUrl.origin)
    successUrl.searchParams.set("connected", provider)
    successUrl.searchParams.set("status", "success")

    return NextResponse.redirect(successUrl.toString())
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(
      new URL(`/natureos/integrations?error=callback_failed&provider=${provider}`, request.nextUrl.origin).toString()
    )
  }
}
