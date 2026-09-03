/**
 * Structures from the AI Studio design, carried over as scaffolding.
 *
 * THE ONE RULE THAT MATTERS HERE
 *
 * The design mock is populated with invented numbers — 2.4 PB of storage, 16
 * modalities syncing, ETL jobs at 84%, "NIST 800-53 COMPLIANT", "Palantir
 * Foundry SYNC_OK", node batteries, threat scores. None of that is true, and on
 * a defense product a fabricated compliance or integration status is not a
 * placeholder, it is a false claim.
 *
 * So what is carried over is the SHAPE: which panels exist, what each one is
 * for, and what would have to be built and bound to fill it. Every value is
 * rendered as unbound until something real backs it. When these are wired, the
 * figures come from the runtime and nowhere else.
 */

export interface Modality {
  id: string
  label: string
  /** MINDEX namespace this modality would read from once bound. */
  namespace: string
  /** Which of the six senses it serves, where that mapping is meaningful. */
  sense?: string
}

/** The fusion modalities the design lays out. Namespaces are the intended
 *  MINDEX addresses; none is bound yet. */
export const FUSION_MODALITIES: Modality[] = [
  { id: "underwater-pam", label: "Underwater PAM", namespace: "underwater_pam", sense: "Acoustic" },
  { id: "vessel-uatr", label: "Vessel UATR", namespace: "vessel_uatr", sense: "Acoustic" },
  { id: "marine-bio", label: "Marine bio", namespace: "marine_bio" },
  { id: "aerial-bio-uav", label: "Aerial bio UAV", namespace: "aerial_bio_uav" },
  { id: "threat-munitions", label: "Threat munitions", namespace: "threat_munitions" },
  { id: "env-transfer-audio", label: "Env transfer audio", namespace: "env_transfer_audio", sense: "Acoustic" },
  { id: "oceanographic-grid", label: "Oceanographic grid", namespace: "oceanographic_grid" },
  { id: "bathymetry", label: "Bathymetry", namespace: "bathymetry" },
  { id: "magnetic", label: "Magnetic", namespace: "magnetic" },
  { id: "ais-maritime", label: "AIS maritime", namespace: "ais_maritime" },
  { id: "sonar-imagery", label: "Sonar imagery", namespace: "sonar_imagery", sense: "Acoustic" },
  { id: "gas-chemistry", label: "Gas chemistry", namespace: "gas_chemistry", sense: "Chemical" },
  { id: "electromagnetics", label: "Electromagnetics", namespace: "electromagnetics", sense: "Spectral" },
  { id: "vibration-touch", label: "Vibration / touch", namespace: "vibration_touch", sense: "Mechanical" },
  { id: "bioelectric-fci", label: "Bioelectric FCI", namespace: "bioelectric_fci", sense: "Bioelectric" },
  { id: "model-registry", label: "Model registry", namespace: "model_registry" },
]

export interface ScaffoldRow {
  label: string
  /** What has to exist for this row to carry a real value. */
  needs: string
}

/** Command & Control. The design shows a live mission board, a command terminal
 *  and a compliance/integration readout. None of the three has a backend. */
export const C2_SCAFFOLD: ScaffoldRow[] = [
  { label: "Mission board", needs: "A mission store — profile, objectives, AOR, classification, window." },
  { label: "Command terminal", needs: "A command bus with an audit trail. Tasking is inert until one exists." },
  { label: "STANAG export", needs: "A STANAG serializer and a released-format review." },
  { label: "Compliance monitor", needs: "Real control evidence. Never a hardcoded COMPLIANT badge." },
  { label: "Integration status", needs: "Actual adapters. Palantir, Anduril and JADC2 are unconfigured." },
]

/** Defense portal. CAC/PIV is the intended credential; today the console is
 *  gated on an email allowlist through Supabase, and it says so. */
export const PORTAL_SCAFFOLD: ScaffoldRow[] = [
  { label: "CAC/PIV credential", needs: "A card reader integration and a certificate trust chain." },
  { label: "Tenant profile", needs: "Per-customer tenancy. Only the owner allowlist exists today." },
  { label: "Session audit", needs: "An append-only audit log the operator can be shown." },
  { label: "Merkle attestation", needs: "A signed evidence root. Nothing is anchored yet." },
]

/** OEI narrative. The design shows generated prose over live channels. */
export const OEI_SCAFFOLD: ScaffoldRow[] = [
  { label: "Mycorrhizae channels", needs: "The mesh channel registry, with real throughput per channel." },
  { label: "Narrative generation", needs: "An NLM bind. No model is trained or deployed in this workspace." },
  { label: "MINDEX context", needs: "Query access to the MINDEX namespaces listed under Data Fusion." },
  { label: "AVANI policy gate", needs: "The policy engine, and its decisions recorded as evidence." },
  { label: "Raw channel stream", needs: "A live transport with integrity verification per message." },
]

/** Stack inventory. Edge devices and model readiness. */
export const STACK_SCAFFOLD: ScaffoldRow[] = [
  { label: "Edge device registry", needs: "Device attestation and secure-mode reporting from the fleet." },
  { label: "AI model readiness", needs: "A model registry reporting version and evaluation results." },
  { label: "Intel product export", needs: "A product template and a release path with human review." },
]
