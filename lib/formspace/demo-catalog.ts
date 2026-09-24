/**
 * FormSpace demo catalog — server-side registry rows aligned with NLM seeds.
 * Not live sensor streams. Not mock metrics.
 */

export interface FormSpaceDemoChart {
  chart_id: string
  name: string
  version: string
  modalities: string[]
  axes: string[]
  nlm_model_ids: string[]
  scope: "demo_catalog"
  provenance: string
  label: "Demo / catalog"
  has_fixture: boolean
  live: false
}

export const FORMSPACE_DEMO_CATALOG: FormSpaceDemoChart[] = [
  {
    chart_id: "fs-spectral-demo-v1",
    name: "Spectral state atlas",
    version: "v1",
    modalities: ["rgb", "ir", "multispectral", "lifi"],
    axes: ["spectral_energy", "stress_index", "object_patch"],
    nlm_model_ids: ["nlm-spectral-base-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-acoustic-air-demo-v1",
    name: "Air acoustic atlas",
    version: "v1",
    modalities: ["mic", "stft", "mel"],
    axes: ["band_energy", "event_onset", "anomaly_score"],
    nlm_model_ids: ["nlm-acoustic-air-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed;acoustic-library-encoder-baseline",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-acoustic-hydro-demo-v1",
    name: "Hydro acoustic atlas",
    version: "v1",
    modalities: ["hydrophone"],
    axes: ["band_energy", "mammal_call", "vessel_tone"],
    nlm_model_ids: ["nlm-acoustic-hydro-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed;mbari-encoder-baseline",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-fci-demo-v1",
    name: "FCI bioelectric atlas",
    version: "v1",
    modalities: ["fci_voltage", "impedance"],
    axes: ["voltage", "impedance", "transition_likelihood"],
    nlm_model_ids: ["nlm-bioelectric-fci-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-thermal-demo-v1",
    name: "Thermal gradient atlas",
    version: "v1",
    modalities: ["bme_temp", "ir"],
    axes: ["temp_c", "gradient", "onset_feature"],
    nlm_model_ids: ["nlm-thermal-base-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-voc-demo-v1",
    name: "VOC / chemical atlas",
    version: "v1",
    modalities: ["bme688", "voc", "co2"],
    axes: ["voc_index", "drift_corrected", "gas_class"],
    nlm_model_ids: ["nlm-chemical-voc-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-mech-demo-v1",
    name: "Mechanical vibration atlas",
    version: "v1",
    modalities: ["accel", "pressure", "seismic"],
    axes: ["rms", "peak_freq", "structural"],
    nlm_model_ids: ["nlm-mechanical-vib-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-soil-demo-v1",
    name: "Soil environment atlas",
    version: "v1",
    modalities: ["moisture", "ec", "ph", "temp"],
    axes: ["moisture", "ec", "ph"],
    nlm_model_ids: ["nlm-soil-env-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-weather-demo-v1",
    name: "Microclimate atlas",
    version: "v1",
    modalities: ["station", "era5"],
    axes: ["temp", "humidity", "pressure"],
    nlm_model_ids: ["nlm-weather-micro-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-fusion-demo-v1",
    name: "Multimodal fusion atlas",
    version: "v1",
    modalities: ["cross_modal"],
    axes: ["fused_state", "support", "abstain"],
    nlm_model_ids: ["nlm-fusion-multimodal-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-mycelium-demo-v1",
    name: "Mycelium growth scenario atlas",
    version: "v1",
    modalities: ["imagery", "bioelectric", "humidity"],
    axes: ["colony_extent", "bioelectric", "humidity"],
    nlm_model_ids: ["nlm-scen-mycelium-growth-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
  {
    chart_id: "fs-fire-demo-v1",
    name: "Fire / wildfire onset atlas",
    version: "v1",
    modalities: ["thermal", "voc", "weather"],
    axes: ["thermal", "voc", "wind_context"],
    nlm_model_ids: ["nlm-scen-fire-thermal-v1"],
    scope: "demo_catalog",
    provenance: "plan-sep23-2026-seed",
    label: "Demo / catalog",
    has_fixture: true,
    live: false,
  },
]

export function formspaceDemoPayload() {
  return {
    schema: "formspace.demo/v1",
    label: "Demo / catalog" as const,
    charts: FORMSPACE_DEMO_CATALOG,
    live: false,
    bound_to_ollama: false,
    source: "website-canonical-catalog",
    note:
      "Catalog charts with provenance. Not live sensor streams. Graph/experiment require MAS FormSpace engine.",
  }
}
