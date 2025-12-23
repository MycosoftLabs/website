/**
 * Environment Variable Configuration
 *
 * Validates and exports environment variables for the application
 * Supports MINDEX, NatureOS, and MYCA MAS integrations
 */

export const env = {
  // NatureOS API Configuration (legacy - for backward compatibility)
  natureosApiUrl: process.env.NEXT_PUBLIC_API_URL || "https://api.mycosoft.org/v1",

  // MINDEX API Configuration (canonical data layer)
  mindexApiBaseUrl: process.env.MINDEX_API_BASE_URL || "https://mindex.mycosoft.org/api/v1",
  mindexApiKey: process.env.MINDEX_API_KEY, // Server-only, never expose to client

  // MYCA MAS API Configuration (multi-agent orchestration)
  mycaMasApiBaseUrl: process.env.MYCA_MAS_API_BASE_URL || "https://myca.mycosoft.org/api/v1",
  mycaMasApiKey: process.env.MYCA_MAS_API_KEY, // Server-only, never expose to client

  // NatureOS Platform API (optional domain layer)
  natureosApiBaseUrl: process.env.NATUREOS_API_BASE_URL || "https://natureos.mycosoft.org/api/v1",

  // Feature Flags
  integrationsEnabled: process.env.INTEGRATIONS_ENABLED === "true",
  useMockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true",

  // Development
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
}

// Server-side validation
if (typeof window === "undefined") {
  const warnIfMissing = (name: string, value: string | undefined) => {
    if (!value && env.integrationsEnabled) {
      console.warn(`Warning: ${name} is not set. Some features may not work.`)
    }
  }

  warnIfMissing("MINDEX_API_BASE_URL", process.env.MINDEX_API_BASE_URL)
  warnIfMissing("MYCA_MAS_API_BASE_URL", process.env.MYCA_MAS_API_BASE_URL)
}
