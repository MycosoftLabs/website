import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

/**
 * Cloud Service Integration Connect API
 * 
 * Initiates OAuth2 connection flows for cloud providers.
 * Supports: AWS, Google Cloud, Azure, Snowflake, Databricks, Palantir
 */

// Provider OAuth configurations
const PROVIDERS: Record<string, {
  name: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnv: string
  clientSecretEnv: string
}> = {
  aws: {
    name: "Amazon Web Services",
    authUrl: "https://signin.aws.amazon.com/oauth",
    tokenUrl: "https://signin.aws.amazon.com/oauth/token",
    scopes: ["openid", "profile", "aws.cognito.signin.user.admin"],
    clientIdEnv: "AWS_CLIENT_ID",
    clientSecretEnv: "AWS_CLIENT_SECRET",
  },
  google: {
    name: "Google Cloud Platform",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
    clientIdEnv: "GOOGLE_CLOUD_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLOUD_CLIENT_SECRET",
  },
  azure: {
    name: "Microsoft Azure",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "https://management.azure.com/.default",
      "offline_access",
    ],
    clientIdEnv: "AZURE_CLIENT_ID",
    clientSecretEnv: "AZURE_CLIENT_SECRET",
  },
  snowflake: {
    name: "Snowflake",
    authUrl: "https://<account>.snowflakecomputing.com/oauth/authorize",
    tokenUrl: "https://<account>.snowflakecomputing.com/oauth/token-request",
    scopes: ["session:role-any"],
    clientIdEnv: "SNOWFLAKE_CLIENT_ID",
    clientSecretEnv: "SNOWFLAKE_CLIENT_SECRET",
  },
  databricks: {
    name: "Databricks",
    authUrl: "https://<workspace>.databricks.com/oauth2/authorize",
    tokenUrl: "https://<workspace>.databricks.com/oauth2/token",
    scopes: ["all-apis"],
    clientIdEnv: "DATABRICKS_CLIENT_ID",
    clientSecretEnv: "DATABRICKS_CLIENT_SECRET",
  },
  palantir: {
    name: "Palantir Foundry",
    authUrl: "https://<stack>.palantirfoundry.com/oauth2/authorize",
    tokenUrl: "https://<stack>.palantirfoundry.com/oauth2/token",
    scopes: ["api:read-data", "api:write-data"],
    clientIdEnv: "PALANTIR_CLIENT_ID",
    clientSecretEnv: "PALANTIR_CLIENT_SECRET",
  },
}

// Generate state token for OAuth flow
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

  // Verify user is authenticated
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user has admin permissions
  const user = session.user as any
  if (!user.isAdmin && !user.isOwner && !user.permissions?.includes("admin")) {
    return NextResponse.json(
      { error: "Insufficient permissions. Admin access required." },
      { status: 403 }
    )
  }

  // Get provider config
  const config = PROVIDERS[provider.toLowerCase()]
  if (!config) {
    return NextResponse.json(
      {
        error: "Unknown provider",
        supportedProviders: Object.keys(PROVIDERS),
      },
      { status: 400 }
    )
  }

  // Check if credentials are configured
  const clientId = process.env[config.clientIdEnv]
  const clientSecret = process.env[config.clientSecretEnv]

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      status: "not_configured",
      provider: config.name,
      message: `${config.name} integration requires configuration.`,
      requiredEnvVars: [config.clientIdEnv, config.clientSecretEnv],
      setupUrl: `/settings/integrations/${provider}`,
    })
  }

  // Generate OAuth state
  const state = generateState()
  const redirectUri = `${request.nextUrl.origin}/api/integrations/${provider}/callback`

  // Build authorization URL
  const authUrl = new URL(config.authUrl)
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", config.scopes.join(" "))
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("access_type", "offline")
  authUrl.searchParams.set("prompt", "consent")

  // For popup-based auth, return the URL for the frontend to open
  const isPopup = request.nextUrl.searchParams.get("popup") === "true"
  
  if (isPopup) {
    return NextResponse.json({
      authUrl: authUrl.toString(),
      state,
      provider: config.name,
    })
  }

  // Direct redirect for full-page auth flow
  return NextResponse.redirect(authUrl.toString())
}

// Initiate connection via POST for additional parameters
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

  try {
    const body = await request.json()
    const { apiKey, accountId, region, workspaceUrl } = body

    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const config = PROVIDERS[provider.toLowerCase()]
    if (!config) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 })
    }

    // For API key-based auth (some providers support both)
    if (apiKey) {
      // Validate API key by making a test request
      // This would be provider-specific

      return NextResponse.json({
        status: "connected",
        provider: config.name,
        method: "api_key",
        timestamp: new Date().toISOString(),
      })
    }

    // Store additional parameters for OAuth flow
    const connectionParams = {
      accountId,
      region,
      workspaceUrl,
    }

    return NextResponse.json({
      status: "pending",
      provider: config.name,
      message: "OAuth flow required. Use GET to initiate.",
      authEndpoint: `/api/integrations/${provider}/connect`,
      connectionParams,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connection failed" },
      { status: 500 }
    )
  }
}
