/**
 * Server-only probe of the Fusarium twins-host / runtime bind.
 * Never expose this origin in NEXT_PUBLIC_* or the browser.
 *
 * Public Fusarium is this Next.js website BFF (same container). When
 * FUSARIUM_INTERNAL_ORIGIN is unset, the BFF is in-process — do not
 * HTTP-self-fetch (deadlock) and do not claim Windows :8212 is live.
 */

export interface FusariumRuntimeProbe {
  reachable: boolean
  status: number | null
  originConfigured: boolean
}

function websiteLoopbackOrigin(): string {
  const port = process.env.PORT || "3000"
  return `http://127.0.0.1:${port}`
}

export function fusariumInternalOrigin(): string {
  const configured = process.env.FUSARIUM_INTERNAL_ORIGIN?.trim()
  if (configured) return configured.replace(/\/$/, "")
  return websiteLoopbackOrigin()
}

export async function probeFusariumRuntime(): Promise<FusariumRuntimeProbe> {
  const configured = Boolean(process.env.FUSARIUM_INTERNAL_ORIGIN?.trim())
  if (!configured) {
    return {
      reachable: true,
      status: 200,
      originConfigured: true,
    }
  }

  const origin = fusariumInternalOrigin()
  try {
    const response = await fetch(`${origin}/health`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "x-fusarium-internal-probe": "website-bff",
      },
      signal: AbortSignal.timeout(1500),
    })
    return {
      reachable: response.ok,
      status: response.status,
      originConfigured: true,
    }
  } catch {
    return {
      reachable: false,
      status: null,
      originConfigured: true,
    }
  }
}
