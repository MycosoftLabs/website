import type {
  HyphaTip,
  OrganismClass,
  OrganismInstance,
  PetriAction,
  PetriStateSnapshot,
  PetriWorldSummary,
  SpeciesGroup,
  TaxonTraitProfile,
} from "@/components/petri-dish-v2/types"
import { MYCELIUMSEG_TARGET_METRICS } from "@/lib/petri-dish-v2/myceliumseg-calibration"

const WIDTH = 128
const HEIGHT = 128
const SIZE = WIDTH * HEIGHT
const MAX_TIPS = 900
const MAX_ORGANISMS = 700

type FieldName =
  | "nutrient"
  | "oxygen"
  | "water"
  | "ph"
  | "waste"
  | "antibiotic"
  | "antifungal"
  | "antiviral"
  | "enzymes"
  | "oils"

interface ChemicalFieldGrid extends Record<FieldName, Float32Array> {}

interface EnvironmentState {
  temperatureC: number
  humidity: number
  agar: "malt" | "sabouraud" | "nutrient" | "fungal"
}

interface OrganismAgent {
  id: number
  class: OrganismClass
  taxonId: string
  x: number
  y: number
  radius: number
  biomass: number
  latent: boolean
  vx: number
  vy: number
  age: number
  energy: number
}

interface HyphaAgent {
  id: number
  taxonId: string
  x: number
  y: number
  angle: number
  energy: number
  age: number
  alive: boolean
  lineage: number
  generation: number
}

export interface PetriWorld {
  tick: number
  width: number
  height: number
  paused: boolean
  seed: number
  taxa: TaxonTraitProfile[]
  hyphae: HyphaAgent[]
  organisms: OrganismAgent[]
  fields: ChemicalFieldGrid
  environment: EnvironmentState
  aliveness: Float32Array[]
  attack: Float32Array[]
  defense: Float32Array[]
  hidden: Float32Array[]
  events: string[]
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function idx(x: number, y: number) {
  const xx = Math.max(0, Math.min(WIDTH - 1, Math.round(x)))
  const yy = Math.max(0, Math.min(HEIGHT - 1, Math.round(y)))
  return yy * WIDTH + xx
}

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v))
}

function distanceToCenter(x: number, y: number) {
  return Math.hypot(x - WIDTH / 2, y - HEIGHT / 2)
}

function insideDish(x: number, y: number) {
  return distanceToCenter(x, y) < WIDTH * 0.46
}

function makeField(value: number) {
  const field = new Float32Array(SIZE)
  field.fill(value)
  return field
}

function profileFor(group: SpeciesGroup, taxonId: string): TaxonTraitProfile["visualProfile"] {
  const lower = taxonId.toLowerCase()
  if (group === "Fungi") {
    if (lower.includes("aspergillus") || lower.includes("penicillium")) return "mold"
    if (lower.includes("erysiphe") || lower.includes("mildew")) return "mildew"
    return "mycelium"
  }
  if (group === "Bacteria") return "bacteria"
  if (group === "Viruses") return "virus"
  if (group === "Protista") return "protista"
  if (group === "Plant/Pollen") return "pollen"
  return "archaea"
}

function classForProfile(profile: TaxonTraitProfile["visualProfile"]): OrganismClass {
  if (profile === "mycelium") return "fungi"
  if (profile === "pollen") return "pollen"
  return profile
}

export function buildTaxonProfile(
  taxonId: string,
  group: SpeciesGroup,
  visualProfile = profileFor(group, taxonId)
): TaxonTraitProfile {
  const fungal = group === "Fungi"
  return {
    taxonId,
    label: taxonId,
    group,
    visualProfile,
    growthRate:
      visualProfile === "mold" ? 0.095 :
      visualProfile === "mildew" ? 0.052 :
      group === "Bacteria" ? 0.13 :
      group === "Viruses" ? 0.018 :
      group === "Archaea" ? 0.022 :
      fungal ? 0.066 : 0.04,
    branchingRate: fungal ? (visualProfile === "mold" ? 0.08 : visualProfile === "mildew" ? 0.018 : 0.06) : 0,
    motility: group === "Bacteria" ? 0.34 : group === "Protista" ? 0.62 : group === "Viruses" ? 0.12 : 0.02,
    hostDependency: group === "Viruses" ? 1 : 0,
    optimumTempC: fungal ? 24 : group === "Bacteria" ? 37 : group === "Archaea" ? 42 : 28,
    optimumPh: fungal ? 5.8 : group === "Bacteria" ? 7.1 : group === "Archaea" ? 7.6 : 7,
    tolerance: group === "Archaea" ? 0.85 : group === "Viruses" ? 0.22 : fungal ? 0.55 : 0.46,
    susceptibility: {
      antibiotic: group === "Bacteria" ? 0.9 : 0.08,
      antifungal: fungal ? 0.82 : 0.08,
      antiviral: group === "Viruses" ? 0.9 : 0.05,
      peroxide: group === "Archaea" ? 0.28 : 0.65,
    },
  }
}

function pushEvent(world: PetriWorld, line: string) {
  world.events.push(`[${world.tick}h] ${line}`)
  world.events = world.events.slice(-80)
}

function initializePdNca(world: PetriWorld) {
  world.aliveness = world.taxa.map(() => new Float32Array(SIZE))
  world.attack = world.taxa.map(() => new Float32Array(SIZE))
  world.defense = world.taxa.map(() => new Float32Array(SIZE))
  world.hidden = world.taxa.map(() => new Float32Array(SIZE))
}

export function createPetriWorld(seed = 0x5eed2026): PetriWorld {
  const defaultTaxon = buildTaxonProfile("Pleurotus ostreatus", "Fungi", "mycelium")
  const world: PetriWorld = {
    tick: 0,
    width: WIDTH,
    height: HEIGHT,
    paused: true,
    seed,
    taxa: [defaultTaxon],
    hyphae: [],
    organisms: [],
    fields: {
      nutrient: makeField(0.78),
      oxygen: makeField(0.72),
      water: makeField(0.76),
      ph: makeField(5.9),
      waste: makeField(0),
      antibiotic: makeField(0),
      antifungal: makeField(0),
      antiviral: makeField(0),
      enzymes: makeField(0.03),
      oils: makeField(0),
    },
    environment: { temperatureC: 24, humidity: 0.74, agar: "malt" },
    aliveness: [],
    attack: [],
    defense: [],
    hidden: [],
    events: [],
  }
  initializePdNca(world)
  pushEvent(world, "dish ready; place tissue with Swab or Scalpel to start")
  return world
}

function ensureTaxon(world: PetriWorld, action: Extract<PetriAction, { type: "inoculate" }>) {
  let taxon = world.taxa.find((item) => item.taxonId === action.taxonId)
  if (!taxon) {
    taxon = buildTaxonProfile(action.taxonId, action.group, action.visualProfile)
    world.taxa.push(taxon)
    world.aliveness.push(new Float32Array(SIZE))
    world.attack.push(new Float32Array(SIZE))
    world.defense.push(new Float32Array(SIZE))
    world.hidden.push(new Float32Array(SIZE))
  }
  return taxon
}

function inoculate(world: PetriWorld, action: Extract<PetriAction, { type: "inoculate" }>) {
  world.paused = false
  const taxon = ensureTaxon(world, action)
  const rand = mulberry32(world.seed + world.tick + world.organisms.length * 997)
  const count = action.tool === "Swab" ? 32 : 14
  for (let i = 0; i < count; i += 1) {
    const a = rand() * Math.PI * 2
    const r = rand() * action.radius
    const x = clamp(action.x + Math.cos(a) * r, 2, WIDTH - 3)
    const y = clamp(action.y + Math.sin(a) * r, 2, HEIGHT - 3)
    if (!insideDish(x, y)) continue
    const cell = idx(x, y)
    const taxonIndex = world.taxa.indexOf(taxon)
    world.aliveness[taxonIndex][cell] = clamp(world.aliveness[taxonIndex][cell] + 0.35)

    if (taxon.visualProfile === "mycelium" || taxon.visualProfile === "mold" || taxon.visualProfile === "mildew") {
      world.hyphae.push({
        id: world.hyphae.length + 1,
        taxonId: taxon.taxonId,
        x,
        y,
        angle: a,
        energy: 0.62 + rand() * 0.28,
        age: 0,
        alive: true,
        lineage: world.hyphae.length % 128,
        generation: 0,
      })
    }

    world.organisms.push({
      id: world.organisms.length + 1,
      class: classForProfile(taxon.visualProfile),
      taxonId: taxon.taxonId,
      x,
      y,
      radius: taxon.visualProfile === "mold" ? 2.4 : taxon.visualProfile === "mildew" ? 1.8 : taxon.group === "Bacteria" ? 1.6 : 1.1,
      biomass: taxon.group === "Viruses" ? 0.16 : 0.42,
      latent: taxon.group === "Viruses",
      vx: Math.cos(a) * taxon.motility,
      vy: Math.sin(a) * taxon.motility,
      age: 0,
      energy: 0.7,
    })
  }
  world.hyphae = world.hyphae.slice(-MAX_TIPS)
  world.organisms = world.organisms.slice(-MAX_ORGANISMS)
  pushEvent(world, `${action.tool.toLowerCase()} inoculated ${taxon.label}`)
}

function inject(field: Float32Array, x: number, y: number, radius: number, dose: number) {
  const minX = Math.max(0, Math.floor(x - radius))
  const maxX = Math.min(WIDTH - 1, Math.ceil(x + radius))
  const minY = Math.max(0, Math.floor(y - radius))
  const maxY = Math.min(HEIGHT - 1, Math.ceil(y + radius))
  for (let yy = minY; yy <= maxY; yy += 1) {
    for (let xx = minX; xx <= maxX; xx += 1) {
      const d = Math.hypot(xx - x, yy - y)
      if (d > radius) continue
      const falloff = 1 - d / Math.max(1, radius)
      const i = idx(xx, yy)
      field[i] = clamp(field[i] + dose * falloff)
    }
  }
}

function pipette(world: PetriWorld, action: Extract<PetriAction, { type: "pipette" }>) {
  const compound = action.compound.toLowerCase()
  if (compound.includes("antibiotic")) inject(world.fields.antibiotic, action.x, action.y, action.radius, action.dose)
  else if (compound.includes("antifungal")) inject(world.fields.antifungal, action.x, action.y, action.radius, action.dose)
  else if (compound.includes("antiviral")) inject(world.fields.antiviral, action.x, action.y, action.radius, action.dose)
  else if (compound.includes("enzyme") || compound.includes("laccase") || compound.includes("cellulase")) inject(world.fields.enzymes, action.x, action.y, action.radius, action.dose)
  else if (compound.includes("oil")) inject(world.fields.oils, action.x, action.y, action.radius, action.dose)
  else if (compound.includes("oxygen")) inject(world.fields.oxygen, action.x, action.y, action.radius, action.dose)
  else if (compound.includes("water")) inject(world.fields.water, action.x, action.y, action.radius, action.dose)
  else if (compound.includes("peroxide")) {
    inject(world.fields.antibiotic, action.x, action.y, action.radius, action.dose * 0.45)
    inject(world.fields.antifungal, action.x, action.y, action.radius, action.dose * 0.45)
  } else inject(world.fields.nutrient, action.x, action.y, action.radius, action.dose)
  pushEvent(world, `pipette applied ${action.compound} dose=${action.dose.toFixed(2)}`)
}

function diffuseField(field: Float32Array, rate: number, decay = 0.0005) {
  const copy = new Float32Array(field)
  for (let y = 1; y < HEIGHT - 1; y += 1) {
    for (let x = 1; x < WIDTH - 1; x += 1) {
      if (!insideDish(x, y)) continue
      const i = idx(x, y)
      const lap = copy[i - 1] + copy[i + 1] + copy[i - WIDTH] + copy[i + WIDTH] - 4 * copy[i]
      field[i] = clamp(copy[i] + rate * lap - decay * copy[i], field === field ? 0 : -Infinity, field === field ? 1 : Infinity)
    }
  }
}

function diffuseChemistry(world: PetriWorld) {
  diffuseField(world.fields.nutrient, 0.06, 0.0008)
  diffuseField(world.fields.oxygen, 0.11, 0.0006)
  diffuseField(world.fields.water, 0.08, 0.0003)
  diffuseField(world.fields.waste, 0.04, 0.002)
  diffuseField(world.fields.antibiotic, 0.1, 0.006)
  diffuseField(world.fields.antifungal, 0.08, 0.005)
  diffuseField(world.fields.antiviral, 0.12, 0.006)
  diffuseField(world.fields.enzymes, 0.05, 0.003)
  diffuseField(world.fields.oils, 0.025, 0.001)
}

function responseCurve(value: number, optimum: number, width: number) {
  const d = (value - optimum) / Math.max(0.001, width)
  return Math.exp(-d * d)
}

function gradient(field: Float32Array, x: number, y: number) {
  const cx = Math.round(x)
  const cy = Math.round(y)
  return {
    x: field[idx(cx + 1, cy)] - field[idx(cx - 1, cy)],
    y: field[idx(cx, cy + 1)] - field[idx(cx, cy - 1)],
  }
}

function localHostCompatibleBiomass(world: PetriWorld, x: number, y: number) {
  let biomass = 0
  for (const organism of world.organisms) {
    if (organism.class === "virus") continue
    if (Math.hypot(organism.x - x, organism.y - y) < organism.radius + 3) biomass += organism.biomass
  }
  return biomass
}

function updateHyphae(world: PetriWorld) {
  const rand = mulberry32(world.seed + world.tick * 41)
  const newTips: HyphaAgent[] = []
  for (const tip of world.hyphae) {
    if (!tip.alive) continue
    const taxon = world.taxa.find((item) => item.taxonId === tip.taxonId) ?? world.taxa[0]
    const cell = idx(tip.x, tip.y)
    const nutrient = world.fields.nutrient[cell]
    const oxygen = world.fields.oxygen[cell]
    const ph = world.fields.ph[cell]
    const antifungal = world.fields.antifungal[cell]
    const tempFit = responseCurve(world.environment.temperatureC, taxon.optimumTempC, 12 * taxon.tolerance)
    const phFit = responseCurve(ph, taxon.optimumPh, 2.2 * taxon.tolerance)
    const monod = nutrient / (0.18 + nutrient)
    const inhibition = antifungal * taxon.susceptibility.antifungal
    const growth = taxon.growthRate * monod * oxygen * tempFit * phFit * Math.max(0, 1 - inhibition)

    if (inhibition > 0.55) {
      tip.energy -= inhibition * 0.045
      tip.angle += Math.PI + (rand() - 0.5) * 0.4
      if (rand() < 0.03) pushEvent(world, `${taxon.label} retreat front detected near antifungal field`)
    } else {
      tip.energy = clamp(tip.energy + growth * 0.12 - 0.009)
    }

    const g = gradient(world.fields.nutrient, tip.x, tip.y)
    tip.angle += (rand() - 0.5) * 0.36 + Math.atan2(g.y, g.x) * 0.018
    const speed = 0.22 + growth * 5.8
    tip.x += Math.cos(tip.angle) * speed
    tip.y += Math.sin(tip.angle) * speed
    tip.age += 1
    if (!insideDish(tip.x, tip.y) || tip.energy < 0.05) {
      tip.alive = false
      continue
    }
    const nextCell = idx(tip.x, tip.y)
    world.fields.nutrient[nextCell] = clamp(world.fields.nutrient[nextCell] - 0.012 * taxon.growthRate)
    world.fields.oxygen[nextCell] = clamp(world.fields.oxygen[nextCell] - 0.006)
    world.fields.enzymes[nextCell] = clamp(world.fields.enzymes[nextCell] + 0.005)
    world.fields.waste[nextCell] = clamp(world.fields.waste[nextCell] + 0.003)
    const taxonIndex = world.taxa.indexOf(taxon)
    world.aliveness[taxonIndex][nextCell] = clamp(world.aliveness[taxonIndex][nextCell] + 0.025 + growth)
    world.attack[taxonIndex][nextCell] = clamp(world.attack[taxonIndex][nextCell] + taxon.growthRate * 0.02)
    world.defense[taxonIndex][nextCell] = clamp(world.defense[taxonIndex][nextCell] + (1 - inhibition) * 0.018)

    if (rand() < taxon.branchingRate * monod && world.hyphae.length + newTips.length < MAX_TIPS) {
      newTips.push({
        ...tip,
        id: world.hyphae.length + newTips.length + 1,
        angle: tip.angle + (rand() > 0.5 ? 1 : -1) * (0.45 + rand() * 0.7),
        generation: tip.generation + 1,
        energy: tip.energy * 0.82,
        lineage: tip.lineage,
      })
    }
  }
  world.hyphae.push(...newTips)
  world.hyphae = world.hyphae.filter((tip) => tip.alive).slice(-MAX_TIPS)
}

function updateOrganisms(world: PetriWorld) {
  const rand = mulberry32(world.seed + world.tick * 83)
  const spawned: OrganismAgent[] = []
  for (const organism of world.organisms) {
    const taxon = world.taxa.find((item) => item.taxonId === organism.taxonId) ?? world.taxa[0]
    const cell = idx(organism.x, organism.y)
    organism.age += 1
    const nutrient = world.fields.nutrient[cell]
    const antibiotic = world.fields.antibiotic[cell] * taxon.susceptibility.antibiotic
    const antifungal = world.fields.antifungal[cell] * taxon.susceptibility.antifungal
    const antiviral = world.fields.antiviral[cell] * taxon.susceptibility.antiviral

    if (taxon.group === "Viruses") {
      const hostBiomass = localHostCompatibleBiomass(world, organism.x, organism.y)
      if (hostBiomass <= 0.02) {
        organism.biomass *= 0.985 - antiviral * 0.06
        organism.latent = true
        if (world.tick % 24 === 0 && rand() < 0.16) pushEvent(world, "viral_particles_inactive")
      } else {
        organism.biomass = clamp(organism.biomass + 0.025 * hostBiomass * (1 - antiviral))
        organism.latent = false
        if (rand() < 0.018 && spawned.length < 20) {
          spawned.push({ ...organism, id: world.organisms.length + spawned.length + 1, x: organism.x + (rand() - 0.5) * 5, y: organism.y + (rand() - 0.5) * 5, biomass: organism.biomass * 0.45 })
        }
        if (world.tick % 18 === 0 && rand() < 0.2) pushEvent(world, "host_dependent_replication")
      }
    } else if (taxon.group === "Bacteria") {
      const kill = antibiotic + world.fields.waste[cell] * 0.12
      organism.biomass = clamp(organism.biomass + taxon.growthRate * nutrient * (1 - organism.biomass) - kill * 0.18)
      organism.radius = clamp(organism.radius + organism.biomass * 0.028, 0.4, 10)
      organism.x += (rand() - 0.5) * taxon.motility * (1 - kill)
      organism.y += (rand() - 0.5) * taxon.motility * (1 - kill)
      world.fields.nutrient[cell] = clamp(world.fields.nutrient[cell] - organism.biomass * 0.004)
      world.fields.waste[cell] = clamp(world.fields.waste[cell] + organism.biomass * 0.003)
    } else if (organism.class === "mold" || organism.class === "mildew") {
      const inhibitor = antifungal
      organism.biomass = clamp(organism.biomass + taxon.growthRate * nutrient * Math.max(0, 1 - inhibitor) - inhibitor * 0.02)
      organism.radius = clamp(organism.radius + organism.biomass * (organism.class === "mold" ? 0.06 : 0.033), 0.5, 18)
      world.fields.enzymes[cell] = clamp(world.fields.enzymes[cell] + organism.biomass * 0.002)
      world.fields.nutrient[cell] = clamp(world.fields.nutrient[cell] - organism.biomass * 0.003)
    } else if (organism.class === "protista") {
      const g = gradient(world.fields.nutrient, organism.x, organism.y)
      organism.x += g.x * 2 + (rand() - 0.5) * taxon.motility
      organism.y += g.y * 2 + (rand() - 0.5) * taxon.motility
      organism.biomass = clamp(organism.biomass + nutrient * 0.01 - 0.006)
    } else if (organism.class === "pollen") {
      organism.biomass *= 0.999
      world.fields.nutrient[cell] = clamp(world.fields.nutrient[cell] + 0.0005)
    } else if (organism.class === "archaea") {
      organism.biomass = clamp(organism.biomass + taxon.growthRate * nutrient * 0.55 - antibiotic * 0.006)
      organism.radius = clamp(organism.radius + organism.biomass * 0.012, 0.5, 7)
    }
    organism.x = clamp(organism.x, 2, WIDTH - 3)
    organism.y = clamp(organism.y, 2, HEIGHT - 3)
  }
  world.organisms.push(...spawned)
  world.organisms = world.organisms.filter((organism) => organism.biomass > 0.025 && insideDish(organism.x, organism.y)).slice(-MAX_ORGANISMS)
}

export function computePdNcaWeights(strengths: number[], temperature = 0.65) {
  const maxStrength = Math.max(...strengths)
  const exp = strengths.map((value) => Math.exp((value - maxStrength) / Math.max(0.001, temperature)))
  const total = exp.reduce((a, b) => a + b, 0) || 1
  return exp.map((value) => value / total)
}

function pdNcaStep(world: PetriWorld) {
  if (world.taxa.length === 0) return
  for (let cell = 0; cell < SIZE; cell += 17) {
    const strengths = world.taxa.map((_, i) => {
      const attack = world.attack[i][cell]
      const defense = world.defense[i][cell]
      const pressure = world.fields.antibiotic[cell] + world.fields.antifungal[cell] + world.fields.antiviral[cell]
      return attack - pressure * 0.35 + defense * 0.22 + world.aliveness[i][cell]
    })
    const weights = computePdNcaWeights([...strengths, 0.08], 0.7)
    for (let i = 0; i < world.taxa.length; i += 1) {
      world.aliveness[i][cell] = clamp(world.aliveness[i][cell] * 0.985 + weights[i] * 0.015)
      world.hidden[i][cell] = clamp(world.hidden[i][cell] * 0.96 + (weights[i] - 0.5) * 0.02, -1, 1)
    }
  }
}

export function stepPetriWorld(world: PetriWorld, steps = 1) {
  if (world.paused) return world
  for (let i = 0; i < steps; i += 1) {
    world.tick += 1
    diffuseChemistry(world)
    updateHyphae(world)
    updateOrganisms(world)
    pdNcaStep(world)
    if (world.tick % 36 === 0) pushEvent(world, `reaction-diffusion step biomass=${totalBiomass(world).toFixed(2)}`)
  }
  return world
}

export function applyPetriAction(world: PetriWorld, action: PetriAction) {
  if (action.type === "inoculate") inoculate(world, action)
  if (action.type === "pipette") pipette(world, action)
  if (action.type === "probe") pushEvent(world, `probe sample x=${action.x.toFixed(1)} y=${action.y.toFixed(1)} nutrient=${world.fields.nutrient[idx(action.x, action.y)].toFixed(2)}`)
  return toSnapshot(world)
}

function mean(field: Float32Array) {
  let total = 0
  let count = 0
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (!insideDish(x, y)) continue
      total += field[idx(x, y)]
      count += 1
    }
  }
  return total / Math.max(1, count)
}

function totalBiomass(world: PetriWorld) {
  return world.organisms.reduce((sum, organism) => sum + organism.biomass, 0) + world.hyphae.reduce((sum, tip) => sum + tip.energy, 0)
}

function alivenessEntropy(world: PetriWorld) {
  let entropy = 0
  let samples = 0
  for (let cell = 0; cell < SIZE; cell += 19) {
    const values = world.aliveness.map((field) => field[cell])
    const total = values.reduce((a, b) => a + b, 0)
    if (total <= 0) continue
    for (const value of values) {
      const p = value / total
      if (p > 0) entropy -= p * Math.log2(p)
    }
    samples += 1
  }
  return entropy / Math.max(1, samples)
}

function summary(world: PetriWorld): PetriWorldSummary {
  return {
    tick: world.tick,
    width: WIDTH,
    height: HEIGHT,
    taxa: world.taxa,
    chemistry: {
      nutrient: mean(world.fields.nutrient),
      oxygen: mean(world.fields.oxygen),
      water: mean(world.fields.water),
      waste: mean(world.fields.waste),
      antibiotic: mean(world.fields.antibiotic),
      antifungal: mean(world.fields.antifungal),
      antiviral: mean(world.fields.antiviral),
      enzymes: mean(world.fields.enzymes),
      oils: mean(world.fields.oils),
    },
    complexity: {
      alivenessEntropy: alivenessEntropy(world),
      activeAgents: world.organisms.length,
      fungalTips: world.hyphae.length,
      totalBiomass: totalBiomass(world),
    },
    calibration: {
      dataset: "MyceliumSeg curated subset",
      status: "not_loaded",
      targetMetrics: [...MYCELIUMSEG_TARGET_METRICS],
    },
  }
}

export function toSnapshot(world: PetriWorld): PetriStateSnapshot {
  const tips: HyphaTip[] = world.hyphae.slice(-MAX_TIPS).map((tip) => ({
    id: tip.id,
    x: tip.x,
    y: tip.y,
    angle: tip.angle,
    energy: tip.energy,
    age: tip.age,
    alive: tip.alive,
    lineage: tip.lineage,
  }))
  const organisms: OrganismInstance[] = world.organisms.slice(-MAX_ORGANISMS).map((organism) => ({
    id: organism.id,
    class: organism.class,
    species_id: organism.taxonId,
    x: organism.x,
    y: organism.y,
    radius: organism.radius,
    biomass: organism.biomass,
    latent: organism.latent,
  }))
  return {
    frame: world.tick,
    paused: world.paused,
    seed_hex: `0x${world.seed.toString(16)}`,
    tip_count: tips.length,
    organism_count: organisms.length,
    mean_sugar: mean(world.fields.nutrient),
    mean_nitrogen: mean(world.fields.oxygen),
    chemistry_means: [
      mean(world.fields.nutrient),
      0,
      0,
      0,
      0,
      mean(world.fields.oxygen),
      mean(world.fields.enzymes),
      mean(world.fields.enzymes),
      mean(world.fields.enzymes),
      0,
      0,
      0,
      mean(world.fields.oils),
      mean(world.fields.antifungal),
      mean(world.fields.antiviral),
      mean(world.fields.waste),
      mean(world.fields.ph),
      world.environment.temperatureC,
    ],
    tips,
    organisms,
    events_tail: world.events.slice(-30),
    world: summary(world),
  }
}

let singleton: PetriWorld | null = null

export function getPetriWorld() {
  singleton ??= createPetriWorld()
  return singleton
}

export function resetPetriWorld(seedHex?: string | null) {
  const parsed = seedHex ? Number.parseInt(seedHex.replace(/^0x/, ""), 16) : 0x5eed2026
  singleton = createPetriWorld(Number.isFinite(parsed) ? parsed : 0x5eed2026)
  return singleton
}
