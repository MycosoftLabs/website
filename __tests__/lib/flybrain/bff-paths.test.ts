/** @jest-environment node */
import { describe, expect, it } from "@jest/globals"
import { allowPath, isFlyBrainId } from "@/lib/flybrain/bff-paths"
import { FLYBRAIN_BFF_ROUTES, FLYBRAIN_ID_PATTERN } from "@/lib/flybrain/contract"

describe("FlyBrain BFF allowPath", () => {
  it("allows every spec §10 read route with GET", () => {
    expect(allowPath(["health"], "GET")).toBe("/health")
    expect(allowPath(["connectome", "manifest"], "GET")).toBe("/connectome/manifest")
    expect(allowPath(["atlas"], "GET")).toBe("/atlas")
    expect(allowPath(["sessions"], "GET")).toBe("/sessions")
    expect(allowPath(["sessions", "fb-1a2b"], "GET")).toBe("/sessions/fb-1a2b")
    expect(allowPath(["sessions", "fb-1a2b", "state"], "GET")).toBe("/sessions/fb-1a2b/state")
    expect(allowPath(["sessions", "fb-1a2b", "spikes"], "GET")).toBe("/sessions/fb-1a2b/spikes")
    expect(allowPath(["vision", "health"], "GET")).toBe("/vision/health")
    expect(allowPath(["droid", "psathyrella-01", "guidance"], "GET")).toBe("/droid/psathyrella-01/guidance")
  })

  it("allows the write routes with POST / DELETE and is case-insensitive on method", () => {
    expect(allowPath(["sessions"], "POST")).toBe("/sessions")
    expect(allowPath(["sessions"], "post")).toBe("/sessions")
    expect(allowPath(["sessions", "fb-1"], "DELETE")).toBe("/sessions/fb-1")
    expect(allowPath(["sessions", "fb-1", "tick"], "POST")).toBe("/sessions/fb-1/tick")
    expect(allowPath(["sessions", "fb-1", "stimulate"], "POST")).toBe("/sessions/fb-1/stimulate")
    expect(allowPath(["sessions", "fb-1", "reset"], "POST")).toBe("/sessions/fb-1/reset")
    expect(allowPath(["sessions", "fb-1", "autopilot"], "POST")).toBe("/sessions/fb-1/autopilot")
    expect(allowPath(["vision", "detect"], "POST")).toBe("/vision/detect")
    expect(allowPath(["itdx", "channels"], "POST")).toBe("/itdx/channels")
    expect(allowPath(["nlm", "observation"], "POST")).toBe("/nlm/observation")
  })

  it("rejects the wrong method on a known route", () => {
    expect(allowPath(["health"], "POST")).toBeNull()
    expect(allowPath(["health"], "DELETE")).toBeNull()
    expect(allowPath(["sessions", "fb-1", "tick"], "GET")).toBeNull()
    expect(allowPath(["sessions", "fb-1", "state"], "POST")).toBeNull()
    expect(allowPath(["sessions", "fb-1", "state"], "DELETE")).toBeNull()
    expect(allowPath(["vision", "detect"], "GET")).toBeNull()
    expect(allowPath(["itdx", "channels"], "GET")).toBeNull()
    expect(allowPath(["droid", "d1", "guidance"], "POST")).toBeNull()
    expect(allowPath(["sessions"], "PUT")).toBeNull()
    expect(allowPath(["sessions"], "PATCH")).toBeNull()
  })

  it("rejects unknown and over-long routes", () => {
    expect(allowPath([], "GET")).toBeNull()
    expect(allowPath(["admin"], "GET")).toBeNull()
    expect(allowPath(["connectome"], "GET")).toBeNull()
    expect(allowPath(["connectome", "manifest", "extra"], "GET")).toBeNull()
    expect(allowPath(["sessions", "fb-1", "tick", "now"], "POST")).toBeNull()
    expect(allowPath(["sessions", "fb-1", "delete"], "POST")).toBeNull()
    expect(allowPath(["droid", "d1"], "GET")).toBeNull()
    expect(allowPath(["droid", "d1", "actuate"], "POST")).toBeNull()
    expect(allowPath(["a", "b", "c", "d", "e"], "GET")).toBeNull()
  })

  it("validates ids with ^[A-Za-z0-9_.:-]{1,64}$", () => {
    expect(isFlyBrainId("fb-abc.def:1_x")).toBe(true)
    expect(allowPath(["sessions", "a".repeat(64), "state"], "GET")).toBe(`/sessions/${"a".repeat(64)}/state`)
    expect(allowPath(["sessions", "a".repeat(65), "state"], "GET")).toBeNull()
    expect(allowPath(["sessions", "fb 1", "state"], "GET")).toBeNull()
    expect(allowPath(["sessions", "fb/1", "state"], "GET")).toBeNull()
    expect(allowPath(["sessions", "fb@1", "state"], "GET")).toBeNull()
    expect(allowPath(["sessions", "..", "state"], "GET")).toBeNull()
    expect(allowPath(["sessions", ".", "state"], "GET")).toBeNull()
    expect(allowPath(["sessions", "", "state"], "GET")).toBeNull()
    expect(allowPath(["sessions", "%2e%2e", "state"], "GET")).toBeNull()
    expect(allowPath(["droid", "dev?x=1", "guidance"], "GET")).toBeNull()
    expect(allowPath(["droid", "dev#frag", "guidance"], "GET")).toBeNull()
    expect(isFlyBrainId("")).toBe(false)
    expect(FLYBRAIN_ID_PATTERN.test("bad id")).toBe(false)
  })

  it("rejects traversal and non-string segments", () => {
    expect(allowPath(["..", "health"], "GET")).toBeNull()
    expect(allowPath(["health\\x"], "GET")).toBeNull()
    expect(allowPath("health" as unknown as string[], "GET")).toBeNull()
    expect(allowPath([1 as unknown as string], "GET")).toBeNull()
    expect(allowPath([null as unknown as string], "GET")).toBeNull()
    expect(allowPath(["health"], undefined)).toBeNull()
  })

  it("covers every route in the contract table", () => {
    for (const route of FLYBRAIN_BFF_ROUTES) {
      const segments = route.path.split("/").filter(Boolean).map((token) => (token.startsWith("{") ? "id-1" : token))
      for (const method of route.methods) {
        expect(allowPath(segments, method)).toBe("/" + segments.join("/"))
      }
    }
  })
})
