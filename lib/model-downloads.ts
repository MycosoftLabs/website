export type DownloadHost = "github" | "huggingface" | "mycosoft"

export interface DownloadLink {
  host: DownloadHost
  href?: string
  note: string
  stateLabel?: string
}

export interface DownloadEntry {
  name: string
  detail: string
  links: DownloadLink[]
}

export interface DownloadSection {
  id: string
  title: string
  entries: DownloadEntry[]
}

const NLM_REPO = "https://github.com/MycosoftLabs/NLM"
const MAS_REPO = "https://github.com/MycosoftLabs/mycosoft-mas"
const FORMSPACE_SOURCE =
  "https://github.com/MycosoftLabs/mycosoft-mas/tree/main/mycosoft_mas/nlm/formspace"
const NLM_TESTS = "https://github.com/MycosoftLabs/NLM/tree/main/tests"
const REFERENCE_TEST =
  "https://github.com/MycosoftLabs/mycosoft-mas/blob/main/tests/test_nlm_reference_runtime_sep10.py"
const PAPER = "/docs/ai/formspace"
const NLM_PAPER = "/docs/ai/nlm"

function planned(host: DownloadHost, note: string): DownloadLink {
  return { host, note, stateLabel: "Release pending" }
}

export const MODEL_DOWNLOAD_SECTIONS: DownloadSection[] = [
  {
    id: "software",
    title: "Software",
    entries: [
      {
        name: "Nature Learning Model source",
        detail:
          "The public Python model library contains encoders, selective state-space blocks, model heads, training interfaces, quantization support, and tests.",
        links: [
          { host: "github", href: NLM_REPO, note: "MycosoftLabs/NLM" },
          planned("huggingface", "The hosted model package is being prepared."),
          { host: "mycosoft", href: NLM_PAPER, note: "Nature Learning Model article" },
        ],
      },
      {
        name: "FormSpace source",
        detail:
          "The public FormSpace implementation contains typed contracts, observation processing, the native state-space scan, scientific loading, persistence, and decision-path support.",
        links: [
          { host: "github", href: FORMSPACE_SOURCE, note: "mycosoft_mas/nlm/formspace" },
          planned("huggingface", "The hosted FormSpace package is being prepared."),
          { host: "mycosoft", href: PAPER, note: "FormSpace white paper" },
        ],
      },
      {
        name: "MYCA Multi-Agent System runtime",
        detail:
          "The public runtime connects FormSpace and NLM evidence to MYCA, MINDEX, AVANI, and the wider Mycosoft system.",
        links: [
          { host: "github", href: MAS_REPO, note: "MycosoftLabs/mycosoft-mas" },
          { host: "mycosoft", href: "/ai/formspace", note: "FormSpace product page" },
        ],
      },
    ],
  },
  {
    id: "demonstrator",
    title: "Demonstrator",
    entries: [
      {
        name: "FormSpace mathematical demonstrator",
        detail:
          "The interactive page exposes the selective recurrence, local chart geometry, prototype comparison, recovery, and abstention concepts beside the public paper.",
        links: [
          { host: "mycosoft", href: "/ai/formspace", note: "Open the FormSpace demonstrator" },
          { host: "github", href: FORMSPACE_SOURCE, note: "Inspect the implementation" },
          planned("huggingface", "An interactive hosted Space is being prepared."),
        ],
      },
      {
        name: "Deterministic recovery example",
        detail:
          "The paper’s reproducible example distinguishes target-memory recovery from memory reset and disabled feedback, with explicit completion and stopping conditions.",
        links: [
          { host: "mycosoft", href: `${PAPER}#72-recovery-with-a-stored-target`, note: "Read the worked example" },
          planned("github", "A standalone companion bundle is being prepared."),
        ],
      },
    ],
  },
  {
    id: "harness",
    title: "Harness",
    entries: [
      {
        name: "Nature Learning Model test harness",
        detail:
          "Public unit tests cover model behavior, training, quantization, core interfaces, and domain-specific model paths.",
        links: [
          { host: "github", href: NLM_TESTS, note: "NLM/tests" },
          planned("huggingface", "A hosted evaluation harness is being prepared."),
        ],
      },
      {
        name: "Reference runtime regression test",
        detail:
          "The public MAS regression test validates reference loading, parameter inventory consistency, and runtime behavior without presenting a fixed count as a product property.",
        links: [
          { host: "github", href: REFERENCE_TEST, note: "Open the runtime regression test" },
          { host: "mycosoft", href: `${PAPER}#12-validation-agenda-and-release-criteria`, note: "Validation and release criteria" },
        ],
      },
    ],
  },
  {
    id: "models",
    title: "Models and versions",
    entries: [
      {
        name: "FormSpace paper · v1.1 public review draft",
        detail:
          "The current public specification defines typed states, local geometry, dynamics, reachability, recovery, stopping, uncertainty, discovery algorithms, evidence contracts, and release criteria.",
        links: [
          { host: "mycosoft", href: PAPER, note: "Read version 1.1" },
          { host: "github", href: FORMSPACE_SOURCE, note: "Current implementation source" },
        ],
      },
      {
        name: "NLM environmental reference",
        detail:
          "A versioned state-space reference for calibrated environmental observations, missingness, temporal state, task predictions, and uncertainty. Release artifacts will identify their exact model and chart versions.",
        links: [
          { host: "github", href: NLM_REPO, note: "Model source" },
          planned("huggingface", "The model card and hosted release are being prepared."),
          { host: "mycosoft", href: NLM_PAPER, note: "Model documentation" },
        ],
      },
      {
        name: "Future model versions",
        detail:
          "Each release will publish its model card, chart identity, supported modalities, intended use, limitations, provenance, evaluation record, and compatibility contract.",
        links: [
          planned("github", "Versioned release artifacts are being prepared."),
          planned("huggingface", "Versioned model repositories are being prepared."),
        ],
      },
    ],
  },
  {
    id: "weights",
    title: "Weights",
    entries: [
      {
        name: "Versioned model weights",
        detail:
          "Weights will be released as versioned artifacts rather than a changing parameter count in page copy. Each release will include checksums, architecture identity, training provenance, license, intended use, and compatibility notes.",
        links: [
          planned("github", "The signed release package is being prepared."),
          planned("huggingface", "The hosted weight repository is being prepared."),
          { host: "mycosoft", href: `${PAPER}#52-learning-organization`, note: "Training and weight contract" },
        ],
      },
    ],
  },
  {
    id: "training-data",
    title: "Source training data",
    entries: [
      {
        name: "Versioned training datasets",
        detail:
          "Source datasets will be published with data cards describing collection, calibration, missingness, provenance, licenses, splits, quality controls, exclusions, and appropriate scientific use.",
        links: [
          planned("github", "Dataset manifests and checksums are being prepared."),
          planned("huggingface", "Hosted dataset releases are being prepared."),
          { host: "mycosoft", href: `${PAPER}#5-nlm-learning-and-inference`, note: "Data and learning specification" },
        ],
      },
    ],
  },
]
