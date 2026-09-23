import { describe, expect, it } from "vitest"
import {
  CANONICAL_ARCHITECTURE_VARIANTS,
  CANONICAL_BASE_MODELS,
  CANONICAL_BASE_MODEL_NAMES,
} from "./canonical-seeds"

describe("canonical NLM AI Studio seeds", () => {
  it("restores the single Base-NLM-v1 / v1-standard architecture variant", () => {
    expect(CANONICAL_ARCHITECTURE_VARIANTS).toHaveLength(1)
    expect(CANONICAL_ARCHITECTURE_VARIANTS[0]).toMatchObject({
      id: "v1-standard",
      name: "Base-NLM-v1",
      core: { type: "mamba-graph-hybrid", layers: 12, d_model: 512 },
    })
    expect(Object.keys(CANONICAL_ARCHITECTURE_VARIANTS[0].streams)).toEqual(
      expect.arrayContaining([
        "spectral",
        "acoustic",
        "bioelectric",
        "chemical",
        "thermal",
        "mechanical",
      ])
    )
  })

  it("restores all 10 AI Studio base models pointing at v1-standard", () => {
    expect(CANONICAL_BASE_MODELS).toHaveLength(10)
    expect(CANONICAL_BASE_MODEL_NAMES).toEqual([
      "Flora-Base-NLM",
      "Fauna-Base-NLM",
      "Funga-Base-NLM",
      "Spores-Micro-NLM",
      "Pollen-Micro-NLM",
      "Mycelium-Net-NLM",
      "Soil-Microbiome-NLM",
      "Aerosol-Atmo-NLM",
      "Hydro-Cycle-NLM",
      "Pheno-Sync-NLM",
    ])
    for (const model of CANONICAL_BASE_MODELS) {
      expect(model.config.variantId).toBe("v1-standard")
      expect(model.config.architecture).toBe("v3.1-mamba-graph")
    }
  })
})
