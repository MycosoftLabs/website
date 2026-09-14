/** @jest-environment node */
import { describe, expect, it, jest } from "@jest/globals"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { FlyBrainHealth, SessionInfo } from "@/lib/flybrain/contract"

const mockUseFlyBrainSession = jest.fn()

jest.mock("@/hooks/use-flybrain-session", () => ({
  useFlyBrainSession: () => mockUseFlyBrainSession(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ITDXFlyBrainPanel } = require("@/components/itdx/ITDXFlyBrainPanel") as typeof import("@/components/itdx/ITDXFlyBrainPanel")

const FETCH_HINT = "No connectome on MAS 188"

/** Exactly what runtime.health() returns right after a MAS restart with FlyWire files on disk. */
function healthLazy(overrides: Partial<FlyBrainHealth> = {}): FlyBrainHealth {
  return {
    status: "degraded",
    schema_version: "flybrain/v1",
    connectome: {
      loaded: false,
      data_dir: "/opt/mycosoft/flybrain",
      completeness_path: "/opt/mycosoft/flybrain/2025_Completeness_783.csv",
      connectivity_path: "/opt/mycosoft/flybrain/2025_Connectivity_783.npz",
      n_neurons: 0,
      n_synapses: 0,
      sha256_ok: null,
      sha256: {},
      version: "783",
      license: "CC BY-NC 4.0",
      reason: "FlyWire files present on disk; loaded lazily on the first session",
    },
    vision: { available: false, engine: null, model: null, weights_path: null, device: null, sahi: false, sahi_impl: null, remote_url: null, reason: "no weights" },
    backend: "numpy",
    torch_available: false,
    cuda_available: false,
    sessions: 0,
    autopilots: 0,
    plugs: ["standalone", "itdx"],
    note: "",
    ...overrides,
  }
}

function session(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    schema_version: "flybrain/v1",
    session_id: "fb-1",
    created_at: "2026-09-14T00:00:00Z",
    config: { plug: "itdx", dry_run: true },
    status: "running", // a status MAS never reports for an idle session; the panel must not echo it as live
    backend: "numpy",
    n_neurons: 10,
    n_synapses: 20,
    subgraph: null,
    ticks: 1,
    t_ms: 50,
    autopilot: false,
    error: null,
    plug: {},
    ...overrides,
  }
}

function render(api: Record<string, unknown>) {
  mockUseFlyBrainSession.mockReturnValue({
    health: null,
    healthStatus: 200,
    session: null,
    lastTick: null,
    busy: false,
    error: "",
    createSession: jest.fn(),
    tick: jest.fn(),
    toggleAutopilot: jest.fn(),
    stop: jest.fn(),
    refreshHealth: jest.fn(),
    ...api,
  })
  return renderToStaticMarkup(createElement(ITDXFlyBrainPanel))
}

function startButton(html: string) {
  const match = html.match(/<button[^>]*data-testid="itdx-flybrain-start"[^>]*>/)
  if (!match) throw new Error("start button not rendered")
  return match[0]
}

describe("ITDXFlyBrainPanel connectome gating", () => {
  it("lets the owner start the first session when the connectome is on disk but not loaded yet", () => {
    const html = render({ health: healthLazy() })
    const start = startButton(html)
    expect(start).not.toContain("disabled")
    expect(start).toContain('title="Create a dry-run session on MAS 188"')
    expect(html).not.toContain(FETCH_HINT)
    expect(html).not.toContain("sessions are 503")
    expect(html).toContain("present on disk, not loaded yet")
    expect(html).toContain("Start one to load the connectome from disk")
  })

  it("still refuses to start and shows the fetch hint when MAS reports the connectome unavailable", () => {
    const html = render({
      health: healthLazy({
        status: "unavailable",
        connectome: { ...healthLazy().connectome, data_dir: null, completeness_path: null, connectivity_path: null, reason: "no data dir" },
      }),
    })
    expect(startButton(html)).toContain("disabled")
    expect(html).toContain(FETCH_HINT)
    expect(html).toContain("no data dir")
    expect(html).toContain("sessions are 503")
  })

  it("shows the loaded neuron/synapse counts once MAS has actually loaded the connectome", () => {
    const html = render({
      health: healthLazy({ status: "healthy", connectome: { ...healthLazy().connectome, loaded: true, n_neurons: 138639, n_synapses: 15000000, reason: "" } }),
    })
    expect(startButton(html)).not.toContain("disabled")
    expect(html).toContain("loaded · 138,639 neurons · 15,000,000 synapses")
  })

  it("keeps Start disabled while health is unknown", () => {
    expect(startButton(render({ health: null, healthStatus: 502 }))).toContain("disabled")
  })
})

describe("ITDXFlyBrainPanel session live indicator", () => {
  it("does not print a client-side 'running' status for an idle session after a tick", () => {
    const html = render({ health: healthLazy(), session: session() })
    const line = html.match(/<p[^>]*data-testid="itdx-flybrain-session"[^>]*>([^<]*)<\/p>/)?.[1] || ""
    expect(line).toContain("session fb-1")
    expect(line).toContain("· idle ·")
    expect(line).not.toContain("running")
  })

  it("derives the live state from MAS autopilot or an in-flight request", () => {
    const auto = render({ health: healthLazy(), session: session({ autopilot: true }) })
    expect(auto.match(/data-testid="itdx-flybrain-session"[^>]*>([^<]*)</)?.[1]).toContain("autopilot running")
    const busy = render({ health: healthLazy(), session: session(), busy: true })
    expect(busy.match(/data-testid="itdx-flybrain-session"[^>]*>([^<]*)</)?.[1]).toContain("request in flight")
    const errored = render({ health: healthLazy(), session: session({ status: "error", error: "engine blew up" }) })
    expect(errored.match(/data-testid="itdx-flybrain-session"[^>]*>([^<]*)</)?.[1]).toContain("· error ·")
  })
})
