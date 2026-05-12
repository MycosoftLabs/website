/**
 * Curated research publications, datasets, and source repos referenced from
 * the Science & Research atlas (`/science`). Mix of public peer-reviewed work
 * (where the URL points to the actual paper/report) and MycosoftLabs source
 * repositories that document the relevant systems.
 *
 * Editorial guardrails (see /science page spec):
 *  - Honest framing on fungal substrates: electrically active, stimulus-
 *    responsive, spatially organized — not "fungi are computers".
 *  - Frontier/exploratory work is labelled with `status: "Frontier Hypothesis"`
 *    or `status: "Research"`, never as deployed capability.
 */

export type ResearchStatus =
  | "Deployed"
  | "In Lab"
  | "Prototype"
  | "Research"
  | "Frontier Hypothesis"

export type ResearchModality =
  | "FCI"
  | "VOC"
  | "Acoustics"
  | "LiDAR"
  | "Radar"
  | "RF"
  | "Materials"
  | "Biotech"
  | "Compute"
  | "NLM"

export interface SciencePublication {
  id: string
  title: string
  source: string
  year: number
  url: string
  modality: ResearchModality
  status?: ResearchStatus
  kind: "paper" | "repo" | "report" | "dataset"
  /** Optional one-line summary shown beneath the title in the ribbon. */
  blurb?: string
}

export const SCIENCE_PUBLICATIONS: SciencePublication[] = [
  {
    id: "adamatzky-fungal-electrical",
    title: "On spiking behaviour of oyster fungi Pleurotus djamor",
    source: "Royal Society Open Science · Adamatzky",
    year: 2018,
    url: "https://doi.org/10.1098/rsos.181373",
    modality: "FCI",
    status: "Research",
    kind: "paper",
    blurb:
      "Measurable nonlinear spiking activity in fungal mycelium — foundational electrophysiology, not evidence of language.",
  },
  {
    id: "adamatzky-language",
    title: "Language of fungi derived from their electrical spiking activity",
    source: "Royal Society Open Science · Adamatzky",
    year: 2022,
    url: "https://doi.org/10.1098/rsos.211926",
    modality: "FCI",
    status: "Frontier Hypothesis",
    kind: "paper",
    blurb:
      "Statistical clustering of spike trains. Useful as a signal-processing reference; we do not claim interspecies translation is solved.",
  },
  {
    id: "cerimi-mycelium-materials",
    title: "Fungi as source for new bio-based materials: a patent review",
    source: "Fungal Biology and Biotechnology · Cerimi et al.",
    year: 2019,
    url: "https://doi.org/10.1186/s40694-019-0080-y",
    modality: "Materials",
    status: "Research",
    kind: "paper",
    blurb:
      "Species and process landscape for mycelium-based materials — anchors honest-limits discussion in §Materials.",
  },
  {
    id: "jones-mycelium-review",
    title:
      "Engineered mycelium composite construction materials from fungal biorefineries: a critical review",
    source: "Materials & Design · Jones et al.",
    year: 2020,
    url: "https://doi.org/10.1016/j.matdes.2020.108397",
    modality: "Materials",
    status: "Research",
    kind: "paper",
    blurb:
      "Critical review of mechanical performance, hydrophilicity, and standardization gaps in mycelium composites.",
  },
  {
    id: "birdnet-cornell",
    title: "BirdNET: A deep learning solution for avian diversity monitoring",
    source: "Ecological Informatics · Kahl et al. (Cornell Lab)",
    year: 2021,
    url: "https://doi.org/10.1016/j.ecoinf.2021.101236",
    modality: "Acoustics",
    status: "Deployed",
    kind: "paper",
    blurb:
      "Reference bioacoustic ML pipeline — the kind of signal-first model NLM-Acoustic is benchmarked against.",
  },
  {
    id: "icesat2-canopy",
    title: "Global forest canopy height from ICESat-2 ATL08",
    source: "Remote Sensing of Environment · Neuenschwander et al.",
    year: 2020,
    url: "https://doi.org/10.1016/j.rse.2020.112110",
    modality: "LiDAR",
    status: "Deployed",
    kind: "paper",
    blurb:
      "Spaceborne LiDAR canopy height retrieval — context for forest-edge node geospatial fusion.",
  },
  {
    id: "wifi-csi-survey",
    title:
      "Wi-Fi Sensing with Channel State Information: A Survey",
    source: "ACM Computing Surveys · Ma, Zhou, Wang",
    year: 2019,
    url: "https://doi.org/10.1145/3310194",
    modality: "RF",
    status: "Research",
    kind: "paper",
    blurb:
      "Surveys the CSI-sensing literature. We treat Wi-Fi Sense as a local presence/motion modality, not planetary perception.",
  },
  {
    id: "natick-northern-isles",
    title: "Project Natick — Phase 2 (Northern Isles) Final Report",
    source: "Microsoft Research",
    year: 2020,
    url: "https://natick.research.microsoft.com/",
    modality: "Compute",
    status: "Frontier Hypothesis",
    kind: "report",
    blurb:
      "Cited as prior art for subsea compute reliability hypotheses. Cooled-seabed datacenters remain an open frontier.",
  },
  {
    id: "axiom-orbital",
    title: "Axiom Station orbital compute and edge inference",
    source: "Axiom Space program briefs",
    year: 2025,
    url: "https://www.axiomspace.com/axiom-station",
    modality: "Compute",
    status: "Frontier Hypothesis",
    kind: "report",
    blurb:
      "Reference for orbital compute payloads. Mycosoft tracks but does not claim deployed orbital nodes.",
  },
  {
    id: "lonestar-lunar-compute",
    title: "Lonestar lunar data centers",
    source: "Lonestar Data Holdings",
    year: 2024,
    url: "https://www.lonestarlunar.com/",
    modality: "Compute",
    status: "Frontier Hypothesis",
    kind: "report",
    blurb:
      "Frontier example for off-world data infrastructure — cited as comparable hypothesis, not Mycosoft deployment.",
  },
  {
    id: "mycosoft-mas",
    title: "mycosoft-mas — Multi-Agent System & NLM documentation",
    source: "MycosoftLabs · GitHub",
    year: 2026,
    url: "https://github.com/MycosoftLabs/mycosoft-mas",
    modality: "NLM",
    status: "Prototype",
    kind: "repo",
    blurb:
      "Source-of-truth for NLM subsystem definitions, MYCA orchestration, and agent contracts.",
  },
  {
    id: "mindex",
    title: "MINDEX — environmental training-source registry",
    source: "MycosoftLabs · GitHub",
    year: 2026,
    url: "https://github.com/MycosoftLabs/mindex",
    modality: "Compute",
    status: "Prototype",
    kind: "repo",
    blurb:
      "Catalogs the corpora and sensor streams that train Nature Learning Models, with provenance and licensing.",
  },
  {
    id: "mycobrain",
    title: "mycobrain — ScienceComms & device firmware",
    source: "MycosoftLabs · GitHub",
    year: 2026,
    url: "https://github.com/MycosoftLabs/mycobrain",
    modality: "FCI",
    status: "Prototype",
    kind: "repo",
    blurb:
      "Firmware and telemetry pipeline for FCI probes, edge devices, and on-device inference targets.",
  },
]

/** Modality → Tailwind classes for badge color mapping. */
export const MODALITY_BADGE_CLASSES: Record<ResearchModality, string> = {
  FCI: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  VOC: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  Acoustics: "bg-sky-500/20 text-sky-200 border-sky-400/40",
  LiDAR: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
  Radar: "bg-indigo-500/20 text-indigo-200 border-indigo-400/40",
  RF: "bg-violet-500/20 text-violet-200 border-violet-400/40",
  Materials: "bg-orange-500/20 text-orange-200 border-orange-400/40",
  Biotech: "bg-rose-500/20 text-rose-200 border-rose-400/40",
  Compute: "bg-slate-500/20 text-slate-200 border-slate-400/40",
  NLM: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40",
}

/** Status → Tailwind classes for the StatusPill helper. */
export const STATUS_PILL_CLASSES: Record<ResearchStatus, string> = {
  Deployed: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  "In Lab": "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
  Prototype: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  Research: "bg-indigo-500/20 text-indigo-200 border-indigo-400/40",
  "Frontier Hypothesis":
    "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40",
}
