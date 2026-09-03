/**
 * Server-only probe of the Fusarium twins-host / runtime bind.
 * Never expose this origin in NEXT_PUBLIC_* or the browser.
 *
 * Public Fusarium is this Next.js website BFF (same container). When
 * FUSARIUM_INTERNAL_ORIGIN is unset, empty, or a known-dead Windows
 * sidecar (127.0.0.1:8212), the BFF is in-process — do not HTTP-self-fetch
 * (deadlock) and do not claim :8212 is live.
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

/** Windows twins-host / dead container-localhost. Never a public or in-container bind. */
function isDeadSidecarOrigin(origin: string): boolean {
  const normalized = origin.trim().toLowerCase().replace(/\/$/, "")
  if (!normalized) return true
  if (/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\]):8212$/i.test(normalized)) return true
  if (normalized.includes("0.0.0.0")) return true
  return false
}

export function fusariumInternalOrigin(): string {
  const configured = process.env.FUSARIUM_INTERNAL_ORIGIN?.trim()
  if (configured && !isDeadSidecarOrigin(configured)) {
    return configured.replace(/\/$/, "")
  }
  return websiteLoopbackOrigin()
}

export function hasUsableFusariumSidecar(): boolean {
  const configured = process.env.FUSARIUM_INTERNAL_ORIGIN?.trim()
  return Boolean(configured && !isDeadSidecarOrigin(configured))
}

export async function probeFusariumRuntime(): Promise<FusariumRuntimeProbe> {
  if (!hasUsableFusariumSidecar()) {
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
