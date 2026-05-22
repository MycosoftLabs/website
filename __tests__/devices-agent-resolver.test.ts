import { describe, it, expect } from "@jest/globals"
import { agentUrlForHost } from "@/lib/devices/agent-resolver"

describe("agentUrlForHost", () => {
  it("returns the matching operator URL when host matches", () => {
    process.env.MYCOBRAIN_OPERATOR_URLS =
      "http://192.168.0.228:8787,http://192.168.0.123:8787"
    expect(agentUrlForHost("192.168.0.228")).toBe("http://192.168.0.228:8787")
    expect(agentUrlForHost("192.168.0.123")).toBe("http://192.168.0.123:8787")
  })
  it("returns null for unknown host", () => {
    expect(agentUrlForHost("10.0.0.1")).toBeNull()
  })
})
