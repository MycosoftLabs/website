export const CONNECTIVITY_TIMEOUT_MS = 3500

export type ItdxRuntimeMode = "ONLINE" | "OFFLINE_LOCAL_WEKA"
export type WanStatus = "WAN_DOWN" | "WAN_UNPROBED"
export type NlmLaneStatus = "NLM_ONLINE" | "MAS_NLM_DOWN"
export type ForecastStatus = "FORECAST_ABSTAIN"

export interface BackendProbe {
  url: string
  ok: boolean
  status: number | null
  ms: number
  error: string | null
}

export interface NlmLaneProbe extends BackendProbe {
  model_loaded: boolean
  weights_sha256: string | null
  weight_count: number | null
  parameter_count: number | null
  nlm_status: NlmLaneStatus
  forecast_status: ForecastStatus
  bind: "BOUND" | "MAS_NLM_DOWN"
}

export interface ItdxConnectivity {
  schema: "itdx-connectivity/v1"
  live: false
  forecast_p: null
  weka_is_not_nlm: true
  mode: ItdxRuntimeMode
  banner: "ONLINE (backends bound)" | "OFFLINE LOCAL WEKA"
  forced_offline: boolean
  wan_status: WanStatus
  nlm: NlmLaneProbe
  forecast_status: ForecastStatus
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

function emptyNlmLane(partial: Partial<NlmLaneProbe> & Pick<NlmLaneProbe, "url" | "ms" | "error">): NlmLaneProbe {
  const ok = Boolean(partial.ok)
  return {
    url: partial.url,
    ok,
    status: partial.status ?? null,
    ms: partial.ms,
    error: partial.error,
    model_loaded: Boolean(partial.model_loaded),
    weights_sha256: partial.weights_sha256 ?? null,
    weight_count: partial.weight_count ?? null,
    parameter_count: partial.parameter_count ?? null,
    nlm_status: ok ? "NLM_ONLINE" : "MAS_NLM_DOWN",
    forecast_status: "FORECAST_ABSTAIN",
    bind: ok ? "BOUND" : "MAS_NLM_DOWN",
  }
}

async function probeNlm(): Promise<NlmLaneProbe> {
  const url = `${masBase()}/api/nlm/health`
  const started = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CONNECTIVITY_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" })
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null
    return emptyNlmLane({
      url,
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      error: null,
      model_loaded: Boolean(body?.model_loaded),
      weights_sha256: typeof body?.weights_sha256 === "string" ? body.weights_sha256 : null,
      weight_count: typeof body?.weight_count === "number" ? body.weight_count : null,
      parameter_count: typeof body?.parameter_count === "number" ? body.parameter_count : null,
    })
  } catch (error) {
    const name = error instanceof Error ? error.name : "probe_failed"
    return emptyNlmLane({
      url,
      ok: false,
      status: null,
      ms: Date.now() - started,
      error: name === "AbortError" ? "timeout" : name,
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function probeItdxConnectivity(forceOffline = false): Promise<ItdxConnectivity> {
  const forced = forceOffline || process.env.ITDX_FORCE_OFFLINE === "1"
  // force=offline isolates WAN / public-demo WEKA. LAN 192.168.0.x is still probed.
  const [mas, mindex, nlm] = await Promise.all([
    probe(`${masBase()}/health`),
    probe(`${mindexBase()}/health`),
    probeNlm(),
  ])
  const online = !forced && mas.ok
  return {
    schema: "itdx-connectivity/v1",
    live: false,
    forecast_p: null,
    weka_is_not_nlm: true,
    mode: online ? "ONLINE" : "OFFLINE_LOCAL_WEKA",
    banner: online ? "ONLINE (backends bound)" : "OFFLINE LOCAL WEKA",
    forced_offline: forced,
    wan_status: forced ? "WAN_DOWN" : "WAN_UNPROBED",
    nlm,
    forecast_status: "FORECAST_ABSTAIN",
    mas,
    mindex,
    probe_timeout_ms: CONNECTIVITY_TIMEOUT_MS,
  }
}
