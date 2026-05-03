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
}

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
