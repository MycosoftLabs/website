import {
  CONUS_ITDX_MAX_ANIMATED,
  CONUS_ITDX_SPECIES_IN_VIEW,
  CONUS_ITDX_SPECIES_STORE,
  enforceAnimatedBudget,
  isAnimatedPaused,
  registerAnimatedLayer,
  resetGovernorForTests,
  resolveSpeciesFetchBounds,
  setEarthSimScenarioActive,
  speciesFetchLimit,
  speciesInViewCap,
  speciesStoreCap,
} from "@/lib/crep/viewport-memory-governor"

describe("viewport memory governor — CONUS + ITDX budget", () => {
  beforeEach(() => {
    resetGovernorForTests()
  })

  it("pauses off-view weather before in-view radar when over budget", () => {
    const paused: string[] = []
    const unreg: Array<() => void> = []
    unreg.push(registerAnimatedLayer("radar", "radar", () => paused.push("radar"), () => {}, { inView: () => true }))
    unreg.push(registerAnimatedLayer("old-field", "field-raster", () => paused.push("old-field"), () => {}, { inView: () => false }))
    unreg.push(registerAnimatedLayer("wind", "wind", () => paused.push("wind"), () => {}, { inView: () => true }))
    const snap = enforceAnimatedBudget("tilt")
    expect(snap.maxAnimated).toBeLessThanOrEqual(CONUS_ITDX_MAX_ANIMATED)
    expect(isAnimatedPaused("old-field")).toBe(true)
    expect(isAnimatedPaused("radar")).toBe(false)
    expect(snap.pauseReason).toBe("paused-for-memory")
    unreg.forEach((fn) => fn())
  })

  it("keeps a user-pinned Live Data field when the ITDX scenario is on", () => {
    const paused: string[] = []
    const unreg: Array<() => void> = []
    setEarthSimScenarioActive(true)
    unreg.push(registerAnimatedLayer("radar", "radar", () => paused.push("radar"), () => {}, { inView: () => true }))
    unreg.push(registerAnimatedLayer("wind", "wind", () => paused.push("wind"), () => {}, { inView: () => true }))
    unreg.push(registerAnimatedLayer("crep-field-era5-t2m", "field-raster", () => paused.push("field"), () => {}, { inView: () => true, userPinned: true }))
    const snap = enforceAnimatedBudget("scenario-on")
    expect(snap.maxAnimated).toBe(CONUS_ITDX_MAX_ANIMATED)
    expect(isAnimatedPaused("crep-field-era5-t2m")).toBe(false)
    expect(paused).toContain("wind")
    unreg.forEach((fn) => fn())
  })

  it("tightens species caps when the ITDX scenario is on", () => {
    expect(speciesInViewCap(3.5, 7)).toBeGreaterThan(CONUS_ITDX_SPECIES_IN_VIEW)
    setEarthSimScenarioActive(true)
    expect(speciesInViewCap(3.5, 7)).toBe(CONUS_ITDX_SPECIES_IN_VIEW)
    expect(speciesStoreCap("ok")).toBe(CONUS_ITDX_SPECIES_STORE)
    expect(speciesFetchLimit(3.5)).toBeLessThanOrEqual(500)
  })

  it("does not fetch the planet when tilt leaks a huge getBounds()", () => {
    const logical = { west: -85, south: 30, east: -75, north: 36 }
    const planet = { west: -180, south: -85, east: 180, north: 85 }
    const fallback = { west: -140, south: 14, east: -52, north: 62 }
    expect(resolveSpeciesFetchBounds(logical, planet, fallback)).toEqual(logical)
    expect(resolveSpeciesFetchBounds(null, planet, fallback)).toEqual(fallback)
    expect(resolveSpeciesFetchBounds(null, logical, fallback)).toEqual(logical)
  })
})
