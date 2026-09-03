/**
 * Server-only probe of the Fusarium twins-host / runtime bind.
 * Never expose this origin in NEXT_PUBLIC_* or the browser.
 */

export interface FusariumRuntimeProbe {
  reachable: boolean
  status: number | null
  originConfigured: boolean
}

function internalOrigin(): string {
  return (process.env.FUSARIUM_INTERNAL_ORIGIN || "http://127.0.0.1:8212").replace(/\/$/, "")
}

export async function probeFusariumRuntime(): Promise<FusariumRuntimeProbe> {
  const origin = internalOrigin()
  const configured = Boolean(process.env.FUSARIUM_INTERNAL_ORIGIN?.trim())
  try {
    const response = await fetch(`${origin}/health`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(1500),
    })
    return {
      reachable: response.ok,
      status: response.status,
      originConfigured: configured,
    }
  } catch {
    return {
      reachable: false,
      status: null,
      originConfigured: configured,
    }
  }
}
