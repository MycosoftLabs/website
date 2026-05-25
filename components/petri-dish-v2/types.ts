/** Petri Dish v2 — shared types (mirrors Rust `StateSnapshot`). Date: May 02, 2026 */

export interface HyphaTip {
  id: number
  x: number
  y: number
  angle: number
  energy: number
  age: number
  alive: boolean
  lineage: number
}

export type OrganismClass =
  | "fungi"
  | "mold"
  | "mildew"
  | "bacteria"
  | "virus"
  | "host_cell"
  | "protista"
  | "pollen"
  | "archaea"

export interface OrganismInstance {
  id: number
  class: OrganismClass
  species_id: string
  x: number
  y: number
  radius: number
  biomass: number
  latent: boolean
}

export interface PetriStateSnapshot {
  frame: number
  paused: boolean
  seed_hex: string
  tip_count: number
  organism_count: number
  mean_sugar: number
  mean_nitrogen: number
  chemistry_means: number[]
  tips: HyphaTip[]
  organisms: OrganismInstance[]
  events_tail: string[]
  world?: PetriWorldSummary
}

export type SpeciesGroup =
  | "Fungi"
  | "Bacteria"
  | "Viruses"
  | "Protista"
  | "Plant/Pollen"
  | "Archaea"

export interface TaxonTraitProfile {
  taxonId: string
  label: string
  group: SpeciesGroup
  visualProfile: "mycelium" | "mold" | "mildew" | "bacteria" | "virus" | "protista" | "pollen" | "archaea"
  growthRate: number
  branchingRate: number
  motility: number
  hostDependency: number
  optimumTempC: number
  optimumPh: number
  tolerance: number
  susceptibility: {
    antibiotic: number
    antifungal: number
    antiviral: number
    peroxide: number
  }
}

export interface PetriWorldSummary {
  tick: number
  width: number
  height: number
  taxa: TaxonTraitProfile[]
  chemistry: Record<string, number>
  complexity: {
    alivenessEntropy: number
    activeAgents: number
    fungalTips: number
    totalBiomass: number
  }
  calibration: {
    dataset: "MyceliumSeg curated subset"
    status: "not_loaded" | "ready"
    targetMetrics: string[]
  }
}

export type PetriAction =
  | {
      type: "inoculate"
      tool: "Swab" | "Scalpel"
      taxonId: string
      group: SpeciesGroup
      visualProfile: TaxonTraitProfile["visualProfile"]
      x: number
      y: number
      radius: number
    }
  | {
      type: "pipette"
      compound: string
      x: number
      y: number
      dose: number
      radius: number
    }
  | { type: "probe"; x: number; y: number }

export const COMPOUND_LABELS = [
  "Glucose",
  "Fructose",
  "Lactose",
  "Ammonium",
  "Nitrate",
  "Oxygen",
  "Laccase",
  "Cellulase",
  "Xylanase",
  "Amylase",
  "Pectinase",
  "Protease",
  "Exopolysaccharide",
  "Secondary metabolite",
  "Autoinducer",
  "Danger peptide",
] as const
