/**
 * Canonical Nature Learning Model seed catalog.
 *
 * Source of truth for logged-out demo + idempotent server seed.
 * NLM = signal-state / scenario learning models — NOT an LLM.
 *
 * Plan: docs/FORMSPACE_NLM_FULL_BUILD_PLAN_SEP23_2026.md §5
 */

export type CheckpointStatus =
  | "catalog_only"
  | "weights_on_nas"
  | "calibrating"
  | "legacy_reference"

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

export interface CanonicalCatalogModel {
  /** Stable registry id (server seed key) */
  model_id: string
  name: string
  description: string
  family: "modality" | "scenario" | "legacy_base"
  modalities: string[]
  scenario: string
  objective: string
  architecture_ref: string
  checkpoint_status: CheckpointStatus
  provenance: string
  formspace_chart_ids: string[]
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

/** @deprecated Prefer CanonicalCatalogModel — kept for type compat */
export type CanonicalBaseModel = Pick<
  CanonicalCatalogModel,
  "name" | "description" | "config"
>

const DEFAULT_CORE = {
  architecture: "v3.1-mamba-graph",
  variantId: "v1-standard",
  layers: 12,
  heads: 8,
  embeddingDim: 512,
  recursionDepth: 4,
  training: { learningRate: 0.001, batchSize: 32, epochs: 10 },
} as const

function catalogModel(
  partial: Omit<CanonicalCatalogModel, "config"> & {
    config?: CanonicalCatalogModel["config"]
  }
): CanonicalCatalogModel {
  return {
    ...partial,
    config: partial.config ?? { ...DEFAULT_CORE },
  }
}

/** Single architecture variant seeded by "Seed Base Variant". */
export const CANONICAL_ARCHITECTURE_VARIANTS: CanonicalArchitectureVariant[] = [
  {
    id: "v1-standard",
    name: "Base-NLM-v1",
    streams: {
      spectral: { enabled: true, resolution: "high", weight: 1.0 },
      acoustic: { enabled: true, resolution: "medium", weight: 0.8 },
      bioelectric: { enabled: true, resolution: "low", weight: 0.5 },
      chemical: { enabled: true, resolution: "low", weight: 0.4 },
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

/** §5.1 Sensor / modality family bases */
const MODALITY_CATALOG: CanonicalCatalogModel[] = [
  catalogModel({
    model_id: "nlm-spectral-base-v1",
    name: "NLM-Spectral Base",
    description: "Spectral state / stress / object patches from RGB, IR, multispectral, LiFi pulse.",
    family: "modality",
    modalities: ["rgb", "ir", "multispectral", "lifi"],
    scenario: "spectral_state",
    objective: "Spectral state / stress / object patches",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-spectral-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-acoustic-air-v1",
    name: "NLM-Acoustic Air",
    description: "Air acoustic species/event/anomaly from mic STFT/Mel features.",
    family: "modality",
    modalities: ["mic", "stft", "mel"],
    scenario: "acoustic_air",
    objective: "Species/event/anomaly (air)",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed;acoustic-library-encoder-baseline",
    formspace_chart_ids: ["fs-acoustic-air-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-acoustic-hydro-v1",
    name: "NLM-Acoustic Hydro",
    description: "Underwater events / mammals / vessels from hydrophone.",
    family: "modality",
    modalities: ["hydrophone"],
    scenario: "acoustic_hydro",
    objective: "Underwater events / mammals / vessels",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed;mbari-encoder-baseline",
    formspace_chart_ids: ["fs-acoustic-hydro-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-bioelectric-fci-v1",
    name: "NLM-Funga Bioelectric",
    description: "Fungal state transitions from FCI voltage and impedance.",
    family: "modality",
    modalities: ["fci_voltage", "impedance"],
    scenario: "fungal_bioelectric",
    objective: "Fungal state transitions",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-fci-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-thermal-base-v1",
    name: "NLM-Thermal",
    description: "Thermal gradients / fire onset features from BME/temp arrays and IR.",
    family: "modality",
    modalities: ["bme_temp", "ir_thermal"],
    scenario: "thermal",
    objective: "Thermal gradients / fire onset features",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-thermal-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-chemical-voc-v1",
    name: "NLM-VOC / Chemical",
    description: "Gas class + drift-corrected smell from BME688 heater profiles and VOC/VSC/CO2.",
    family: "modality",
    modalities: ["bme688", "voc", "vsc", "co2"],
    scenario: "chemical_voc",
    objective: "Gas class + drift-corrected smell",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-voc-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-mechanical-vib-v1",
    name: "NLM-Mechanical",
    description: "Vibration / propeller / structural from accel, pressure, seismic.",
    family: "modality",
    modalities: ["accel", "pressure", "seismic"],
    scenario: "mechanical",
    objective: "Vibration / propeller / structural",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-mech-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-soil-env-v1",
    name: "NLM-Soil",
    description: "Soil health / stress from moisture, EC, pH, temp.",
    family: "modality",
    modalities: ["moisture", "ec", "ph", "soil_temp"],
    scenario: "soil",
    objective: "Soil health / stress",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-soil-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-weather-micro-v1",
    name: "NLM-Weather",
    description: "Microclimate forecast from station + ERA5 context (abstain if unbound).",
    family: "modality",
    modalities: ["weather_station", "era5"],
    scenario: "weather_micro",
    objective: "Microclimate forecast (abstain if unbound)",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-weather-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-fusion-multimodal-v1",
    name: "NLM-Fusion",
    description: "Cross-modal multi-device world state fusion.",
    family: "modality",
    modalities: ["spectral", "acoustic", "bioelectric", "chemical", "thermal", "mechanical"],
    scenario: "fusion",
    objective: "Multi-device world state",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-fusion-demo-v1"],
  }),
]

/** §5.2 Species / scenario training targets */
const SCENARIO_CATALOG: CanonicalCatalogModel[] = [
  catalogModel({
    model_id: "nlm-scen-mycelium-growth-v1",
    name: "NLM Mycelium Growth",
    description: "Mycelium / colony growth from imagery + bioelectric + humidity.",
    family: "scenario",
    modalities: ["imagery", "bioelectric", "humidity"],
    scenario: "mycelium_growth",
    objective: "Colony growth state",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed;reuse-mycelium-net",
    formspace_chart_ids: ["fs-mycelium-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-fungal-smell-v1",
    name: "NLM Fungal Smell",
    description: "Fungal VOC / smell signatures (chemical primary).",
    family: "scenario",
    modalities: ["voc", "bme688"],
    scenario: "fungal_smell",
    objective: "Fungal VOC signature class",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-fungal-smell-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-bee-acoustic-v1",
    name: "NLM Bee / Hive Acoustics",
    description: "Bees / hive acoustics (air acoustic).",
    family: "scenario",
    modalities: ["mic", "stft"],
    scenario: "bee_acoustic",
    objective: "Hive state / event",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-bee-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-dolphin-acoustic-v1",
    name: "NLM Dolphin Acoustics",
    description: "Dolphin events from hydrophone.",
    family: "scenario",
    modalities: ["hydrophone"],
    scenario: "dolphin_acoustic",
    objective: "Dolphin event / presence",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-dolphin-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-whale-acoustic-v1",
    name: "NLM Whale Acoustics",
    description: "Whales — hydro + long-horizon.",
    family: "scenario",
    modalities: ["hydrophone"],
    scenario: "whale_acoustic",
    objective: "Whale call / presence long-horizon",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-whale-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-propeller-uav-v1",
    name: "NLM Propeller / UAV Rotor",
    description: "Propeller / drone rotor from mechanical + acoustic UAV.",
    family: "scenario",
    modalities: ["accel", "mic"],
    scenario: "propeller_uav",
    objective: "Rotor signature / anomaly",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-propeller-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-drone-visual-v1",
    name: "NLM Drone Visual/Spectral",
    description: "Drones (visual/spectral) — spectral + motion.",
    family: "scenario",
    modalities: ["rgb", "multispectral", "motion"],
    scenario: "drone_visual",
    objective: "Aerial object / motion state",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-drone-visual-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-lightning-v1",
    name: "NLM Lightning / EM-Optical",
    description: "Lightning / EM-optical events — spectral + RF if available.",
    family: "scenario",
    modalities: ["spectral", "rf"],
    scenario: "lightning",
    objective: "Lightning / EM-optical event",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-lightning-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-fire-thermal-v1",
    name: "NLM Fire / Wildfire Onset",
    description: "Fire / wildfire onset — thermal + VOC + weather context.",
    family: "scenario",
    modalities: ["ir_thermal", "voc", "weather_station"],
    scenario: "fire_thermal",
    objective: "Fire onset features",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-fire-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-light-spectrum-v1",
    name: "NLM Light Spectrum / LiFi",
    description: "Spectrum of light / LiFi — optical comms features.",
    family: "scenario",
    modalities: ["multispectral", "lifi"],
    scenario: "light_spectrum",
    objective: "Spectral / optical comms features",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-light-spectrum-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-gas-plume-v1",
    name: "NLM Gas Plume",
    description: "Gas plumes / contamination — chemical + wind context.",
    family: "scenario",
    modalities: ["voc", "co2", "weather_station"],
    scenario: "gas_plume",
    objective: "Plume class / contamination",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-gas-plume-demo-v1"],
  }),
  catalogModel({
    model_id: "nlm-scen-petri-virtual-v1",
    name: "NLM Virtual Petri",
    description: "Virtual Petri / lab culture — simulation → NMF bridge.",
    family: "scenario",
    modalities: ["simulation", "nmf"],
    scenario: "petri_virtual",
    objective: "Lab culture state via NMF",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "plan-sep23-2026-seed",
    formspace_chart_ids: ["fs-petri-demo-v1"],
  }),
]

/** Legacy AI Studio ecological bases (kept for reuse / continuity) */
const LEGACY_BASE_CATALOG: CanonicalCatalogModel[] = [
  catalogModel({
    model_id: "nlm-legacy-flora-base-v1",
    name: "Flora-Base-NLM",
    description: "Base model for plant life, photosynthesis, and botanical growth patterns.",
    family: "legacy_base",
    modalities: ["spectral", "thermal"],
    scenario: "flora",
    objective: "Botanical growth patterns",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "ai-studio-export-reuse",
    formspace_chart_ids: [],
  }),
  catalogModel({
    model_id: "nlm-legacy-fauna-base-v1",
    name: "Fauna-Base-NLM",
    description: "Base model for animal behavior, movement, and ecological interactions.",
    family: "legacy_base",
    modalities: ["acoustic", "mechanical"],
    scenario: "fauna",
    objective: "Animal behavior / ecology",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "ai-studio-export-reuse",
    formspace_chart_ids: [],
  }),
  catalogModel({
    model_id: "nlm-legacy-funga-base-v1",
    name: "Funga-Base-NLM",
    description: "Base model for fungal diversity, decomposition, and symbiotic networks.",
    family: "legacy_base",
    modalities: ["bioelectric", "chemical"],
    scenario: "funga",
    objective: "Fungal diversity / symbiosis",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "ai-studio-export-reuse",
    formspace_chart_ids: [],
  }),
  catalogModel({
    model_id: "nlm-legacy-spores-micro-v1",
    name: "Spores-Micro-NLM",
    description: "Micro-scale model for fungal dispersal and reproductive strategies.",
    family: "legacy_base",
    modalities: ["spectral", "aerosol"],
    scenario: "spores",
    objective: "Spore dispersal",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "ai-studio-export-reuse",
    formspace_chart_ids: [],
  }),
  catalogModel({
    model_id: "nlm-legacy-pollen-micro-v1",
    name: "Pollen-Micro-NLM",
    description: "Micro-scale model for plant reproduction and pollinator dynamics.",
    family: "legacy_base",
    modalities: ["spectral", "aerosol"],
    scenario: "pollen",
    objective: "Pollen / pollinator dynamics",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "ai-studio-export-reuse",
    formspace_chart_ids: [],
  }),
  catalogModel({
    model_id: "nlm-legacy-mycelium-net-v1",
    name: "Mycelium-Net-NLM",
    description: "Network-scale model for underground fungal communication and nutrient transport.",
    family: "legacy_base",
    modalities: ["bioelectric", "soil"],
    scenario: "mycelium_net",
    objective: "Mycelium network state",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "ai-studio-export-reuse",
    formspace_chart_ids: [],
  }),
  catalogModel({
    model_id: "nlm-legacy-soil-microbiome-v1",
    name: "Soil-Microbiome-NLM",
    description: "Base model for soil health, microbial diversity, and nutrient cycling.",
    family: "legacy_base",
    modalities: ["moisture", "ec", "ph"],
    scenario: "soil_microbiome",
    objective: "Soil microbiome health",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "ai-studio-export-reuse",
    formspace_chart_ids: [],
  }),
  catalogModel({
    model_id: "nlm-legacy-aerosol-atmo-v1",
    name: "Aerosol-Atmo-NLM",
    description: "Environmental model for air particles, seed dispersal, and light scattering.",
    family: "legacy_base",
    modalities: ["aerosol", "spectral"],
    scenario: "aerosol",
    objective: "Aerosol / light scattering",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "ai-studio-export-reuse",
    formspace_chart_ids: [],
  }),
  catalogModel({
    model_id: "nlm-legacy-hydro-cycle-v1",
    name: "Hydro-Cycle-NLM",
    description: "Systemic model for water movement, precipitation, and aquatic life support.",
    family: "legacy_base",
    modalities: ["hydro", "weather_station"],
    scenario: "hydro_cycle",
    objective: "Hydrologic cycle state",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "ai-studio-export-reuse",
    formspace_chart_ids: [],
  }),
  catalogModel({
    model_id: "nlm-legacy-pheno-sync-v1",
    name: "Pheno-Sync-NLM",
    description: "Temporal model for biological timing and climate-driven event alignment.",
    family: "legacy_base",
    modalities: ["weather_station", "spectral"],
    scenario: "pheno_sync",
    objective: "Phenology / climate timing",
    architecture_ref: "v1-standard",
    checkpoint_status: "catalog_only",
    provenance: "ai-studio-export-reuse",
    formspace_chart_ids: [],
  }),
]

/** Full public catalog (modality + scenario + legacy bases). */
export const CANONICAL_CATALOG: CanonicalCatalogModel[] = [
  ...MODALITY_CATALOG,
  ...SCENARIO_CATALOG,
  ...LEGACY_BASE_CATALOG,
]

/** Ten legacy bases for seed/API backward compat. */
export const CANONICAL_BASE_MODELS: CanonicalBaseModel[] = LEGACY_BASE_CATALOG.map(
  (m) => ({
    name: m.name,
    description: m.description,
    config: m.config,
  })
)

export const CANONICAL_BASE_MODEL_NAMES = CANONICAL_BASE_MODELS.map((m) => m.name)

export const CANONICAL_CATALOG_IDS = CANONICAL_CATALOG.map((m) => m.model_id)

/** Shape used by Dashboard / ModelList for logged-out demo. */
export function catalogToDemoModel(entry: CanonicalCatalogModel) {
  return {
    id: entry.model_id,
    name: entry.name,
    description: entry.description,
    status: "catalog" as const,
    ownerId: null,
    config: {
      ...entry.config,
      family: entry.family,
      modalities: entry.modalities,
      scenario: entry.scenario,
      objective: entry.objective,
      architecture_ref: entry.architecture_ref,
      checkpoint_status: entry.checkpoint_status,
      provenance: entry.provenance,
      formspace_chart_ids: entry.formspace_chart_ids,
    },
    version: "catalog-1.0",
    accuracy: null,
    createdAt: null,
    updatedAt: null,
    isCatalog: true,
    checkpointStatus: entry.checkpoint_status,
  }
}

export function getFullDemoCatalog() {
  return CANONICAL_CATALOG.map(catalogToDemoModel)
}
