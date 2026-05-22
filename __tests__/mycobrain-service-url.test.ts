import { describe, it, expect, beforeEach } from "@jest/globals"
import { resolveMycoBrainServiceUrl } from "@/lib/mycobrain-service-url"

describe("resolveMycoBrainServiceUrl (back-compat)", () => {
  beforeEach(() => {
    delete process.env.MYCOBRAIN_SERVICE_URL
    delete process.env.MYCOBRAIN_API_URL
    delete process.env.ALLOW_LOOPBACK_MYCOBRAIN
  })

  it("returns the default LAN URL when nothing is configured", () => {
    expect(resolveMycoBrainServiceUrl()).toBe("http://192.168.0.196:8003")
  })

  it("honors MYCOBRAIN_SERVICE_URL", () => {
    process.env.MYCOBRAIN_SERVICE_URL = "http://172.16.0.50:8003"
    expect(resolveMycoBrainServiceUrl()).toBe("http://172.16.0.50:8003")
  })

  it("rejects loopback unless ALLOW_LOOPBACK_MYCOBRAIN=1", () => {
    process.env.MYCOBRAIN_SERVICE_URL = "http://localhost:8003"
    expect(resolveMycoBrainServiceUrl()).toBe("http://192.168.0.196:8003")
    process.env.ALLOW_LOOPBACK_MYCOBRAIN = "1"
    expect(resolveMycoBrainServiceUrl()).toBe("http://localhost:8003")
  })

  it("strips trailing slashes", () => {
    process.env.MYCOBRAIN_SERVICE_URL = "http://172.16.0.50:8003/"
    expect(resolveMycoBrainServiceUrl()).toBe("http://172.16.0.50:8003")
  })
})
