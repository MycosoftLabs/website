export const CONNECTIVITY_TIMEOUT_MS = 3500

export type ItdxRuntimeMode = "ONLINE" | "OFFLINE_LOCAL_WEKA"

export interface BackendProbe {
  url: string
  ok: boolean
  status: number | null
  ms: number
  error: string | null
}

export interface ItdxConnectivity {
  schema: "itdx-connectivity/v1"
  live: false
  forecast_p: null
  weka_is_not_nlm: true
  mode: ItdxRuntimeMode
  banner: "ONLINE (backends bound)" | "OFFLINE LOCAL WEKA"
  forced_offline: boolean
  mas: BackendProbe
  mindex: BackendProbe
  probe_timeout_ms: number
}

function masBase(): string {
  return (process.env.MAS_API_URL || "http://192.168.0.188:8001").replace(/\/$/, "")
}

function mindexBase(): string {
  return (process.env.MINDEX_API_URL || "http://192.168.0.189:8000").replace(/\/$/, "")
}

async function probe(url: string): Promise<BackendProbe> {
  const started = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CONNECTIVITY_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" })
    return {
      url,
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      error: null,
    }
  } catch (error) {
    const name = error instanceof Error ? error.name : "probe_failed"
    return {
      url,
      ok: false,
      status: null,
      ms: Date.now() - started,
      error: name === "AbortError" ? "timeout" : name,
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function probeItdxConnectivity(forceOffline = false): Promise<ItdxConnectivity> {
  const forced = forceOffline || process.env.ITDX_FORCE_OFFLINE === "1"
  if (forced) {
    return {
      schema: "itdx-connectivity/v1",
      live: false,
      forecast_p: null,
      weka_is_not_nlm: true,
      mode: "OFFLINE_LOCAL_WEKA",
      banner: "OFFLINE LOCAL WEKA",
      forced_offline: true,
      mas: { url: `${masBase()}/health`, ok: false, status: null, ms: 0, error: "forced_offline" },
      mindex: { url: `${mindexBase()}/health`, ok: false, status: null, ms: 0, error: "forced_offline" },
      probe_timeout_ms: CONNECTIVITY_TIMEOUT_MS,
    }
  }

  const [mas, mindex] = await Promise.all([
    probe(`${masBase()}/health`),
    probe(`${mindexBase()}/health`),
  ])
  const online = mas.ok
  return {
    schema: "itdx-connectivity/v1",
    live: false,
    forecast_p: null,
    weka_is_not_nlm: true,
    mode: online ? "ONLINE" : "OFFLINE_LOCAL_WEKA",
    banner: online ? "ONLINE (backends bound)" : "OFFLINE LOCAL WEKA",
    forced_offline: false,
    mas,
    mindex,
    probe_timeout_ms: CONNECTIVITY_TIMEOUT_MS,
  }
}
