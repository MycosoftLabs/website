export const INSPECTION_SCHEMA = "fusarium-compound-inspection/v1" as const

export interface CompoundEvidenceInput {
  name?: string
  formula?: string
  molecularWeight?: number
  smiles?: string
  inchi?: string
  inchikey?: string
  source?: string
  sourceRecordId?: string
  observedAt?: string
}

const ATOMIC_WEIGHTS: Record<string, number> = {
  H: 1.008, C: 12.011, N: 14.007, O: 15.999, F: 18.998403,
  Na: 22.989769, Mg: 24.305, P: 30.973762, S: 32.06, Cl: 35.45,
  K: 39.0983, Ca: 40.078, Fe: 55.845, Cu: 63.546, Zn: 65.38,
  Br: 79.904, I: 126.90447,
}

export function parseFormula(formula: string) {
  const clean = formula.trim()
  if (!clean || clean.length > 128 || !/^(?:[A-Z][a-z]?\d*)+$/.test(clean)) return null
  const counts: Record<string, number> = {}
  let cursor = 0
  for (const match of clean.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    if (match.index !== cursor) return null
    const count = match[2] ? Number(match[2]) : 1
    if (!Number.isSafeInteger(count) || count < 1 || count > 100000) return null
    counts[match[1]] = (counts[match[1]] || 0) + count
    cursor += match[0].length
  }
  return cursor === clean.length ? counts : null
}

export function inspectCompound(input: CompoundEvidenceInput) {
  const formula = input.formula?.trim() || null
  const atomCounts = formula ? parseFormula(formula) : null
  const unsupportedElements = atomCounts
    ? Object.keys(atomCounts).filter((element) => ATOMIC_WEIGHTS[element] === undefined)
    : []
  const estimatedMolarMass = atomCounts && unsupportedElements.length === 0
    ? Number(Object.entries(atomCounts).reduce((sum, [element, count]) => sum + ATOMIC_WEIGHTS[element] * count, 0).toFixed(4))
    : null
  const suppliedWeight = Number.isFinite(input.molecularWeight) && Number(input.molecularWeight) > 0
    ? Number(input.molecularWeight)
    : null
  const weightDifferencePercent = estimatedMolarMass !== null && suppliedWeight !== null
    ? Number((Math.abs(estimatedMolarMass - suppliedWeight) / estimatedMolarMass * 100).toFixed(3))
    : null

  const identifiers = {
    formula,
    smiles: input.smiles?.trim() || null,
    inchi: input.inchi?.trim() || null,
    inchikey: input.inchikey?.trim() || null,
  }
  const warnings: string[] = []
  if (formula && !atomCounts) warnings.push("Formula syntax is outside the bounded simple-formula parser.")
  if (unsupportedElements.length) warnings.push(`Atomic weights are not configured for: ${unsupportedElements.join(", ")}.`)
  if (!input.source?.trim()) warnings.push("No provenance source was supplied.")
  if (!Object.values(identifiers).some(Boolean)) warnings.push("No molecular identifier was supplied.")
  if (weightDifferencePercent !== null && weightDifferencePercent > 1) warnings.push("Supplied molecular weight differs from the formula-derived estimate by more than 1%.")

  return {
    schema: INSPECTION_SCHEMA,
    state: "inspection_complete" as const,
    evidence: {
      name: input.name?.trim() || null,
      identifiers,
      suppliedMolecularWeight: suppliedWeight,
      provenance: {
        source: input.source?.trim() || null,
        sourceRecordId: input.sourceRecordId?.trim() || null,
        observedAt: input.observedAt?.trim() || null,
      },
    },
    deterministicChecks: {
      formulaParsed: atomCounts !== null,
      atomCounts,
      totalAtoms: atomCounts ? Object.values(atomCounts).reduce((sum, count) => sum + count, 0) : null,
      formulaDerivedMolarMass: estimatedMolarMass,
      formulaDerivedMolarMassUnit: estimatedMolarMass === null ? null : "g/mol",
      weightDifferencePercent,
      atomicWeightTable: "bounded local conventional weights v1",
    },
    warnings,
    boundaries: {
      simulationRun: false,
      structureValidated: false,
      identityConfirmed: false,
      toxicityAssessed: false,
      writesPerformed: false,
    },
  }
}
