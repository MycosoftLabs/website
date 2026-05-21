import { computeMaskMetrics } from "@/lib/petri-dish-v2/myceliumseg-calibration"
import {
  applyPetriAction,
  computePdNcaWeights,
  createPetriWorld,
  stepPetriWorld,
} from "@/lib/petri-dish-v2/realism-engine"

describe("Petri Dish v2 realism engine", () => {
  it("starts idle until tissue is placed", () => {
    const world = createPetriWorld(2026)

    expect(world.paused).toBe(true)
    expect(world.hyphae).toHaveLength(0)
    expect(world.organisms).toHaveLength(0)

    stepPetriWorld(world, 10)
    expect(world.tick).toBe(0)

    applyPetriAction(world, {
      type: "inoculate",
      tool: "Swab",
      taxonId: "Pleurotus ostreatus",
      group: "Fungi",
      visualProfile: "mycelium",
      x: 64,
      y: 64,
      radius: 6,
    })

    expect(world.paused).toBe(false)
    expect(world.hyphae.length + world.organisms.length).toBeGreaterThan(0)
  })

  it("keeps PD-NCA competition weights bounded and normalized", () => {
    const weights = computePdNcaWeights([0.1, 0.4, -0.2, 0.9], 0.7)
    expect(weights.every((value) => value >= 0 && value <= 1)).toBe(true)
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
  })

  it("pipette injection updates a local chemical field", () => {
    const world = createPetriWorld(1234)
    const beforeCenter = world.fields.antifungal[64 * 128 + 64]
    const beforeFar = world.fields.antifungal[10 * 128 + 10]

    applyPetriAction(world, {
      type: "pipette",
      compound: "antifungal",
      x: 64,
      y: 64,
      dose: 0.8,
      radius: 10,
    })

    expect(world.fields.antifungal[64 * 128 + 64]).toBeGreaterThan(beforeCenter)
    expect(world.fields.antifungal[10 * 128 + 10]).toBe(beforeFar)
  })

  it("virus particles do not free-grow without host biomass", () => {
    const world = createPetriWorld(4321)
    world.hyphae = []
    world.organisms = []
    applyPetriAction(world, {
      type: "inoculate",
      tool: "Swab",
      taxonId: "Norovirus",
      group: "Viruses",
      visualProfile: "virus",
      x: 64,
      y: 64,
      radius: 5,
    })
    const before = world.organisms.reduce((sum, organism) => sum + organism.biomass, 0)
    stepPetriWorld(world, 40)
    const after = world.organisms.reduce((sum, organism) => sum + organism.biomass, 0)

    expect(after).toBeLessThan(before)
    expect(world.events.some((event) => event.includes("viral_particles_inactive"))).toBe(true)
  })

  it("antibiotic suppresses bacteria more than fungal tips", () => {
    const world = createPetriWorld(99)
    applyPetriAction(world, {
      type: "inoculate",
      tool: "Scalpel",
      taxonId: "Pleurotus ostreatus",
      group: "Fungi",
      visualProfile: "mycelium",
      x: 52,
      y: 64,
      radius: 4,
    })
    applyPetriAction(world, {
      type: "inoculate",
      tool: "Scalpel",
      taxonId: "Bacillus subtilis",
      group: "Bacteria",
      visualProfile: "bacteria",
      x: 70,
      y: 64,
      radius: 4,
    })
    applyPetriAction(world, {
      type: "pipette",
      compound: "antibiotic",
      x: 70,
      y: 64,
      dose: 1,
      radius: 12,
    })
    const bacteriaBefore = world.organisms
      .filter((organism) => organism.class === "bacteria")
      .reduce((sum, organism) => sum + organism.biomass, 0)
    stepPetriWorld(world, 30)
    const bacteriaAfter = world.organisms
      .filter((organism) => organism.class === "bacteria")
      .reduce((sum, organism) => sum + organism.biomass, 0)

    expect(bacteriaAfter).toBeLessThan(bacteriaBefore)
    expect(world.hyphae.length).toBeGreaterThan(0)
  })
})

describe("MyceliumSeg calibration metrics", () => {
  it("computes morphology and overlap metrics from binary masks", () => {
    const mask = [
      0, 0, 0, 0, 0,
      0, 1, 1, 1, 0,
      0, 0, 1, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 0, 0,
    ]
    const metrics = computeMaskMetrics(mask, 5, 5, mask)

    expect(metrics.area).toBe(5)
    expect(metrics.edgeDensity).toBeGreaterThan(0)
    expect(metrics.skeletonLength).toBeGreaterThan(0)
    expect(metrics.iou).toBe(1)
    expect(metrics.dice).toBe(1)
  })
})
