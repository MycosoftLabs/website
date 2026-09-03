import {
  applyEarthSimulatorBootToLayers,
  EARTH_SIM_DEFAULT_FUNGAL_LAYER_ID,
  EARTH_SIM_INSTANT_LIVE_LAYER_IDS,
  getEarthSimInitialFungalLayerIds,
  getEarthSimulatorEventDomCap,
  isEarthSimulatorPathname,
  isGlobeCrepPathname,
} from "@/lib/crep/earth-simulator-boot"

describe("earth-simulator-boot fungal defaults", () => {
  it("loads EcM only at refresh (never AM+EcM together)", () => {
    const ids = getEarthSimInitialFungalLayerIds()
    expect(ids.has("fungalAtlasECM")).toBe(true)
    expect(ids.has("fungalAtlasAM")).toBe(false)
    expect(EARTH_SIM_DEFAULT_FUNGAL_LAYER_ID).toBe("fungalAtlasECM")
  })

  it("applyEarthSimulatorBootToLayers enables EcM and disables AM", () => {
    const layers = applyEarthSimulatorBootToLayers([
      { id: "fungalAtlasAM", enabled: true },
      { id: "fungalAtlasECM", enabled: false },
      { id: "topography", enabled: false },
    ])
    const am = layers.find((l) => l.id === "fungalAtlasAM")
    const ecm = layers.find((l) => l.id === "fungalAtlasECM")
    expect(am?.enabled).toBe(false)
    expect(ecm?.enabled).toBe(true)
  })

  it("enables fungi only at refresh — movers/cameras off until user toggles (May 24 QA crash fix)", () => {
    const layers = applyEarthSimulatorBootToLayers([
      { id: "fungi", enabled: false },
      { id: "aviation", enabled: false },
      { id: "ships", enabled: false },
      { id: "satellites", enabled: false },
      { id: "eagleEyeCameras", enabled: false },
    ])
    for (const id of EARTH_SIM_INSTANT_LIVE_LAYER_IDS) {
      expect(layers.find((l) => l.id === id)?.enabled).toBe(true)
    }
    expect(layers.find((l) => l.id === "aviation")?.enabled).toBe(false)
    expect(layers.find((l) => l.id === "ships")?.enabled).toBe(false)
    expect(layers.find((l) => l.id === "satellites")?.enabled).toBe(false)
    expect(layers.find((l) => l.id === "eagleEyeCameras")?.enabled).toBe(false)
  })

  it("treats Fusarium Earth Simulator as the same globe surface as NatureOS", () => {
    expect(isEarthSimulatorPathname("/natureos/earth-simulator")).toBe(true)
    expect(isEarthSimulatorPathname("/fusarium/earth-simulator")).toBe(true)
    expect(isEarthSimulatorPathname("/fusarium/aerosol")).toBe(false)
    expect(isGlobeCrepPathname("/fusarium/earth-simulator")).toBe(true)
    expect(isGlobeCrepPathname("/dashboard/crep")).toBe(true)
  })

  it("caps high-zoom event DOM so city zoom does not keep climbing", () => {
    expect(getEarthSimulatorEventDomCap(2)).toBe(160)
    expect(getEarthSimulatorEventDomCap(10)).toBeLessThanOrEqual(280)
    expect(getEarthSimulatorEventDomCap(12)).toBe(getEarthSimulatorEventDomCap(10))
  })
})
