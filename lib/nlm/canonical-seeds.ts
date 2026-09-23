/**
 * Canonical NLM seed catalog from the Google AI Studio NLM Training export
 * (`MAS/NLM/NLM Training/src/components/Dashboard.tsx`).
 *
 * Do not invent new seed IDs here — only restore configs that existed in that artifact.
 */

export interface CanonicalArchitectureVariant {
  id: string
  name: string
  streams: Record<
    string,
    { enabled: boolean; resolution: string; weight: number }
  >
  core: {
    type: string
    layers: number
    d_model: number
    n_heads: number
    state_dim: number
    graph_recursion_depth: number
    backprop_threshold: number
  }
  preconditioners: string[]
  metrics: {
    target_accuracy: number
    max_latency_ms: number
  }
}

export interface CanonicalBaseModel {
  name: string
  description: string
  config: {
    architecture: string
    variantId: string
    layers: number
    heads: number
    embeddingDim: number
    recursionDepth: number
    training: {
      learningRate: number
      batchSize: number
      epochs: number
    }
  }
}

/** Single architecture variant seeded by AI Studio "Seed Base Variant". */
export const CANONICAL_ARCHITECTURE_VARIANTS: CanonicalArchitectureVariant[] = [
  {
    id: "v1-standard",
    name: "Base-NLM-v1",
    streams: {
      spectral: { enabled: true, resolution: "high", weight: 1.0 },
      acoustic: { enabled: true, resolution: "medium", weight: 0.8 },
      bioelectric: { enabled: true, resolution: "low", weight: 0.5 },
      chemical: { enabled: false, resolution: "low", weight: 0.2 },
      thermal: { enabled: true, resolution: "medium", weight: 0.6 },
      mechanical: { enabled: true, resolution: "high", weight: 0.9 },
    },
    core: {
      type: "mamba-graph-hybrid",
      layers: 12,
      d_model: 512,
      n_heads: 8,
      state_dim: 128,
      graph_recursion_depth: 4,
      backprop_threshold: 0.01,
    },
    preconditioners: ["spectral-norm", "batch-norm"],
    metrics: {
      target_accuracy: 0.95,
      max_latency_ms: 50,
    },
  },
]

/** Ten base models seeded by AI Studio "Seed Base Models". */
export const CANONICAL_BASE_MODELS: CanonicalBaseModel[] = [
  {
    name: "Flora-Base-NLM",
    description:
      "Base model for plant life, photosynthesis, and botanical growth patterns.",
    config: {
      architecture: "v3.1-mamba-graph",
      variantId: "v1-standard",
      layers: 12,
      heads: 8,
      embeddingDim: 512,
      recursionDepth: 4,
      training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
    },
  },
  {
    name: "Fauna-Base-NLM",
    description:
      "Base model for animal behavior, movement, and ecological interactions.",
    config: {
      architecture: "v3.1-mamba-graph",
      variantId: "v1-standard",
      layers: 12,
      heads: 8,
      embeddingDim: 512,
      recursionDepth: 4,
      training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
    },
  },
  {
    name: "Funga-Base-NLM",
    description:
      "Base model for fungal diversity, decomposition, and symbiotic networks.",
    config: {
      architecture: "v3.1-mamba-graph",
      variantId: "v1-standard",
      layers: 12,
      heads: 8,
      embeddingDim: 512,
      recursionDepth: 4,
      training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
    },
  },
  {
    name: "Spores-Micro-NLM",
    description:
      "Micro-scale model for fungal dispersal and reproductive strategies.",
    config: {
      architecture: "v3.1-mamba-graph",
      variantId: "v1-standard",
      layers: 12,
      heads: 8,
      embeddingDim: 512,
      recursionDepth: 4,
      training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
    },
  },
  {
    name: "Pollen-Micro-NLM",
    description:
      "Micro-scale model for plant reproduction and pollinator dynamics.",
    config: {
      architecture: "v3.1-mamba-graph",
      variantId: "v1-standard",
      layers: 12,
      heads: 8,
      embeddingDim: 512,
      recursionDepth: 4,
      training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
    },
  },
  {
    name: "Mycelium-Net-NLM",
    description:
      "Network-scale model for underground fungal communication and nutrient transport.",
    config: {
      architecture: "v3.1-mamba-graph",
      variantId: "v1-standard",
      layers: 12,
      heads: 8,
      embeddingDim: 512,
      recursionDepth: 4,
      training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
    },
  },
  {
    name: "Soil-Microbiome-NLM",
    description:
      "Base model for soil health, microbial diversity, and nutrient cycling.",
    config: {
      architecture: "v3.1-mamba-graph",
      variantId: "v1-standard",
      layers: 12,
      heads: 8,
      embeddingDim: 512,
      recursionDepth: 4,
      training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
    },
  },
  {
    name: "Aerosol-Atmo-NLM",
    description:
      "Environmental model for air particles, seed dispersal, and light scattering.",
    config: {
      architecture: "v3.1-mamba-graph",
      variantId: "v1-standard",
      layers: 12,
      heads: 8,
      embeddingDim: 512,
      recursionDepth: 4,
      training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
    },
  },
  {
    name: "Hydro-Cycle-NLM",
    description:
      "Systemic model for water movement, precipitation, and aquatic life support.",
    config: {
      architecture: "v3.1-mamba-graph",
      variantId: "v1-standard",
      layers: 12,
      heads: 8,
      embeddingDim: 512,
      recursionDepth: 4,
      training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
    },
  },
  {
    name: "Pheno-Sync-NLM",
    description:
      "Temporal model for biological timing and climate-driven event alignment.",
    config: {
      architecture: "v3.1-mamba-graph",
      variantId: "v1-standard",
      layers: 12,
      heads: 8,
      embeddingDim: 512,
      recursionDepth: 4,
      training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
    },
  },
]

export const CANONICAL_BASE_MODEL_NAMES = CANONICAL_BASE_MODELS.map((m) => m.name)
