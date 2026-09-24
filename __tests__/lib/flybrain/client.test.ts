/** @jest-environment node */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import {
  FLYBRAIN_TIMEOUTS,
  createSession,
  deleteSession,
  flybrainAtlas,
  flybrainHealth,
  itdxChannels,
  masBase,
  sessionState,
  setAutopilot,
  tickSession,
  visionHealth,
} from "@/lib/flybrain/client"

type Call = { url: string; init: RequestInit | undefined }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

describe("FlyBrain server client", () => {
  const original = { MAS_API_URL: process.env.MAS_API_URL, NEXT_PUBLIC_MAS_API_URL: process.env.NEXT_PUBLIC_MAS_API_URL }
  const realFetch = global.fetch
  let calls: Call[] = []

  beforeEach(() => {
    calls = []
    delete process.env.MAS_API_URL
    delete process.env.NEXT_PUBLIC_MAS_API_URL
  })

  afterEach(() => {
    global.fetch = realFetch
    if (original.MAS_API_URL == null) delete process.env.MAS_API_URL
    else process.env.MAS_API_URL = original.MAS_API_URL
    if (original.NEXT_PUBLIC_MAS_API_URL == null) delete process.env.NEXT_PUBLIC_MAS_API_URL
    else process.env.NEXT_PUBLIC_MAS_API_URL = original.NEXT_PUBLIC_MAS_API_URL
  })

  function stub(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      calls.push({ url, init })
      return handler(url, init)
    }) as unknown as typeof fetch
  }

  it("resolves the MAS base like task8-client (MAS_API_URL, NEXT_PUBLIC_MAS_API_URL, default 188:8001)", () => {
    expect(masBase()).toBe("http://192.168.0.188:8001")
    process.env.NEXT_PUBLIC_MAS_API_URL = "http://10.0.0.5:8001/"
    expect(masBase()).toBe("http://10.0.0.5:8001")
    process.env.MAS_API_URL = "http://10.0.0.9:8001"
    expect(masBase()).toBe("http://10.0.0.9:8001")
  })

  it("GET /health hits MAS /api/flybrain/health with a 6 s timeout and returns {ok,status,data,path}", async () => {
    const health = { status: "unavailable", connectome: { loaded: false, reason: "no data dir" }, vision: { available: false }, backend: "numpy", sessions: 0 }
    stub(() => jsonResponse(health))
    const result = await flybrainHealth()
    expect(result).toEqual({ ok: true, status: 200, data: health, path: "/health" })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe("http://192.168.0.188:8001/api/flybrain/health")
    expect(calls[0].init?.cache).toBe("no-store")
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal)
    expect(FLYBRAIN_TIMEOUTS.health).toBe(6_000)
    expect(FLYBRAIN_TIMEOUTS.tick).toBe(30_000)
  })

  it("passes a MAS 503 through unchanged (no fake ready state)", async () => {
    stub(() => jsonResponse({ detail: { reason: "connectome missing", fetch: "scripts/flybrain_fetch_connectome.py" } }, 503))
    const result = await createSession({ plug: "standalone", dry_run: true })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(503)
    expect(result.path).toBe("/sessions")
    expect((result.data as { detail: { reason: string } }).detail.reason).toBe("connectome missing")
    expect(calls[0].init?.method).toBe("POST")
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ plug: "standalone", dry_run: true })
    expect((calls[0].init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
  })

  it("never throws on a network failure: {ok:false,status:0,data:{error}}", async () => {
    stub(() => {
      throw new TypeError("fetch failed")
    })
    const result = await flybrainHealth()
    expect(result).toEqual({ ok: false, status: 0, data: { error: "fetch failed" }, path: "/health" })
  })

  it("reports a TimeoutError as error:'timeout'", async () => {
    stub(() => {
      const error = new Error("The operation was aborted due to timeout")
      error.name = "TimeoutError"
      throw error
    })
    const result = await tickSession("fb-1", { observations: [] })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(0)
    expect(result.data).toEqual({ error: "timeout" })
    expect(result.path).toBe("/sessions/fb-1/tick")
  })

  it("keeps a non-JSON upstream body as flybrain_non_json instead of parsing garbage", async () => {
    stub(() => new Response("<html>gateway</html>", { status: 502, headers: { "Content-Type": "text/html" } }))
    const result = await sessionState("fb-1")
    expect(result.ok).toBe(false)
    expect(result.status).toBe(502)
    expect(result.data).toEqual({ error: "flybrain_non_json", raw: "<html>gateway</html>" })
  })

  it("builds every session route with the id URL-encoded", async () => {
    stub(() => jsonResponse({ session_id: "fb-1", autopilot: true }))
    await tickSession("fb-1", { observations: [{ kind: "raw_rates", payload: { p9_left: 100 } }], act: true })
    await sessionState("fb-1")
    await deleteSession("fb-1")
    await setAutopilot("fb-1", true, 0.5)
    await setAutopilot("fb-1", false)
    expect(calls.map((call) => call.url)).toEqual([
      "http://192.168.0.188:8001/api/flybrain/sessions/fb-1/tick",
      "http://192.168.0.188:8001/api/flybrain/sessions/fb-1/state",
      "http://192.168.0.188:8001/api/flybrain/sessions/fb-1",
      "http://192.168.0.188:8001/api/flybrain/sessions/fb-1/autopilot",
      "http://192.168.0.188:8001/api/flybrain/sessions/fb-1/autopilot",
    ])
    expect(calls[2].init?.method).toBe("DELETE")
    expect(calls[2].init?.body).toBeUndefined()
    expect(JSON.parse(String(calls[3].init?.body))).toEqual({ enabled: true, period_s: 0.5 })
    expect(JSON.parse(String(calls[4].init?.body))).toEqual({ enabled: false })
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ observations: [{ kind: "raw_rates", payload: { p9_left: 100 } }], act: true })
  })

  it("POSTs itdx/channels and GETs atlas + vision/health at the expected MAS paths", async () => {
    stub(() => jsonResponse({ schema_version: "flybrain/v1", channels: {}, nav: null, session_id: null }))
    const channels = await itdxChannels({ map_slice: { ao: { center: { lat: 31.87, lon: -81.6 } } }, session_id: null })
    expect(channels.ok).toBe(true)
    expect(channels.path).toBe("/itdx/channels")
    await flybrainAtlas()
    await visionHealth()
    expect(calls.map((call) => call.url)).toEqual([
      "http://192.168.0.188:8001/api/flybrain/itdx/channels",
      "http://192.168.0.188:8001/api/flybrain/atlas",
      "http://192.168.0.188:8001/api/flybrain/vision/health",
    ])
    expect(calls[0].init?.method).toBe("POST")
    expect(calls[1].init?.method).toBeUndefined()
  })

  it("honours a configured MAS base without ever echoing it into the result", async () => {
    process.env.MAS_API_URL = "http://10.20.30.40:8001/"
    stub(() => jsonResponse({ available: false, reason: "ultralytics not installed" }))
    const result = await visionHealth()
    expect(calls[0].url).toBe("http://10.20.30.40:8001/api/flybrain/vision/health")
    expect(JSON.stringify(result)).not.toContain("10.20.30.40")
  })
})
