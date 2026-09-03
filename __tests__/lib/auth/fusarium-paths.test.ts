import { isFusariumOperatorAppPath, isFusariumPublicPath } from "@/lib/auth/fusarium-paths"

describe("Fusarium operator chrome paths", () => {
  it("keeps public login and launchpad on the marketing header", () => {
    expect(isFusariumPublicPath("/fusarium/login")).toBe(true)
    expect(isFusariumPublicPath("/fusarium/launchpad")).toBe(true)
    expect(isFusariumOperatorAppPath("/fusarium/login")).toBe(false)
    expect(isFusariumOperatorAppPath("/fusarium/launchpad/pricing")).toBe(false)
  })

  it("marks the twins-host console as full-bleed operator chrome", () => {
    expect(isFusariumOperatorAppPath("/fusarium")).toBe(true)
    expect(isFusariumOperatorAppPath("/fusarium/earth-simulator")).toBe(true)
    expect(isFusariumOperatorAppPath("/fusarium/aerosol")).toBe(true)
    expect(isFusariumOperatorAppPath("/fusarium/gcs")).toBe(true)
    expect(isFusariumOperatorAppPath("/natureos/earth-simulator")).toBe(false)
  })
})
