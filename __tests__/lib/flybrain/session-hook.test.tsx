/** @jest-environment node */
/**
 * Regression: after a successful tick the hook must NOT invent a session status. The MAS router
 * returns a TickResult (no status field) and runtime.tick() sets the session back to "ready"
 * before returning, so the hook keeps whatever status MAS last reported.
 *
 * Runs in the node environment (like the other flybrain tests) with a jsdom window bootstrapped
 * by hand so react-dom/client can mount the hook.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { JSDOM } from "jsdom"
import type { SessionInfo, TickResult } from "@/lib/flybrain/contract"
import type { FlyBrainSessionApi } from "@/hooks/use-flybrain-session"

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" })
const g = globalThis as unknown as Record<string, unknown>
g.window = dom.window
g.document = dom.window.document
g.navigator = dom.window.navigator
g.HTMLElement = dom.window.HTMLElement
g.IS_REACT_ACT_ENVIRONMENT = true

/* eslint-disable @typescript-eslint/no-require-imports */
const { act, createElement } = require("react") as typeof import("react")
const { createRoot } = require("react-dom/client") as typeof import("react-dom/client")
const { useFlyBrainSession } = require("@/hooks/use-flybrain-session") as typeof import("@/hooks/use-flybrain-session")
/* eslint-enable @typescript-eslint/no-require-imports */

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

const READY: SessionInfo = {
  schema_version: "flybrain/v1",
  session_id: "fb-1",
  created_at: "2026-09-14T00:00:00Z",
  config: { plug: "itdx", dry_run: true },
  status: "ready",
  backend: "numpy",
  n_neurons: 10,
  n_synapses: 20,
  subgraph: null,
  ticks: 0,
  t_ms: 0,
  autopilot: false,
  error: null,
  plug: {},
}

// Only the fields the hook reads; the shape is what the MAS router returns for POST .../tick
// (note: no `status` field — session status is only reported by GET/POST /sessions[...]).
const TICK = {
  schema_version: "flybrain/v1",
  origin: "flybrain",
  session_id: "fb-1",
  tick: 1,
  t_ms: 50,
  brain: {},
  action: {},
  nav: null,
  detections: null,
  plug: "itdx",
  dry_run: true,
  plug_result: {},
} as unknown as TickResult

describe("useFlyBrainSession tick", () => {
  const realFetch = global.fetch
  let root: ReturnType<typeof createRoot> | null = null
  let container: HTMLDivElement | null = null
  let latest: FlyBrainSessionApi | null = null

  beforeEach(() => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      if (url.endsWith("/health")) return jsonResponse({ status: "degraded", sessions: 0 })
      if (url.endsWith("/sessions")) return jsonResponse(READY)
      if (url.endsWith("/tick")) return jsonResponse(TICK)
      return jsonResponse({ error: "unexpected" }, 500)
    }) as unknown as typeof fetch
    container = dom.window.document.createElement("div")
    dom.window.document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
    global.fetch = realFetch
  })

  it("keeps the MAS-reported status after a tick instead of pinning 'running'", async () => {
    function Probe() {
      latest = useFlyBrainSession()
      return null
    }
    await act(async () => {
      root!.render(createElement(Probe))
    })
    await act(async () => {
      await latest!.createSession("itdx")
    })
    expect(latest!.session?.status).toBe("ready")

    await act(async () => {
      await latest!.tick([])
    })
    expect(latest!.lastTick?.tick).toBe(1)
    expect(latest!.session?.ticks).toBe(1)
    expect(latest!.session?.t_ms).toBe(50)
    expect(latest!.session?.status).toBe("ready")
    expect(latest!.session?.status).not.toBe("running")
  })
})
