import { probeFusariumRuntime } from "@/lib/fusarium-runtime-probe"

describe("Fusarium runtime probe", () => {
  const previous = process.env.FUSARIUM_INTERNAL_ORIGIN

  afterEach(() => {
    if (previous == null) delete process.env.FUSARIUM_INTERNAL_ORIGIN
    else process.env.FUSARIUM_INTERNAL_ORIGIN = previous
  })

  it("treats the in-process website BFF as live when no sidecar origin is set", async () => {
    delete process.env.FUSARIUM_INTERNAL_ORIGIN
    const probe = await probeFusariumRuntime()
    expect(probe.reachable).toBe(true)
    expect(probe.status).toBe(200)
    expect(probe.originConfigured).toBe(true)
  })

  it("does not treat Windows :8212 as a reachable sidecar", async () => {
    process.env.FUSARIUM_INTERNAL_ORIGIN = "http://127.0.0.1:8212"
    const probe = await probeFusariumRuntime()
    expect(probe.reachable).toBe(true)
    expect(probe.status).toBe(200)
    expect(probe.originConfigured).toBe(true)
  })
})
