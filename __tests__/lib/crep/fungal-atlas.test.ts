import {
  samplesToGeoJson,
  tileToBounds,
  type FungalAtlasSample,
} from "@/lib/crep/fungal-atlas"

describe("fungal atlas helpers", () => {
  it("converts web mercator tile coordinates to sane bounds", () => {
    const bounds = tileToBounds(0, 0, 0)
    expect(bounds.west).toBeCloseTo(-180)
    expect(bounds.east).toBeCloseTo(180)
    expect(bounds.north).toBeGreaterThan(80)
    expect(bounds.south).toBeLessThan(-80)
  })

  it("emits colored mushroom sample features without raw sequence payloads", () => {
    const sample: FungalAtlasSample = {
      id: "GF-test",
      lat: 32.7,
      lng: -117.1,
      group: "mushroom",
      source: "GlobalFungi",
      sourceResolution: "sample GPS",
      confidence: 0.8,
      nativeResolutionMeters: 1000,
      sampleType: "sporocarp",
      sequenceTotal: 12345,
    }
    const fc = samplesToGeoJson([sample])
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].properties?.glyph).toBe("🍄")
    expect(fc.features[0].properties?.sequence_total).toBe(12345)
    expect(fc.features[0].properties).not.toHaveProperty("sequence")
  })
})
