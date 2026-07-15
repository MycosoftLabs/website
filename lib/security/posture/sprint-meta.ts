// Lightweight, client-safe CMMC self-assessment framing constants.
//
// Kept SEPARATE from the full posture overlay so client components can show the
// current-vs-target context banner without bundling the 110-control JSON. These
// mirror `mycosoft-posture-overlay-v1.json` (sprint + score header) — if the
// overlay's sprint/score header changes, update these to match.
//
// PROV = endpoint-provisioning date. The two CMMC assessment laptops (Morgan +
// RJ) are NOT yet procured, so every endpoint-dependent milestone is gated on
// hardware, not a fixed calendar date. Endpoint-gated dates are `null` and
// render as "TBD — pending endpoint provisioning" until PROV is set. Presenting
// a fixed target date we cannot meet would violate the honesty rule.

export const PROV_TBD = 'TBD — pending endpoint provisioning';

/** Render a sprint milestone date, falling back to the PROV placeholder. */
export function sprintDate(d: string | null | undefined): string {
  return d && d.trim() ? d : PROV_TBD;
}

export const CMMC_SPRINT_META = {
  kickoffDate: '2026-07-13',
  totalControls: 110,

  // --- PROV (endpoint provisioning) — set when both laptops are procured,
  //     encrypted, PreVeil-enrolled, and inventoried. null => TBD. ---
  endpointProvisioningDate: null as string | null,

  // SPRS submission is gated on PROV: AU.L2-3.3.4 + SI.L2-3.14.6 require the
  // endpoints + Wazuh agents, which don't exist yet. null => TBD.
  targetSprsSubmissionDate: null as string | null,

  // AU.L2-3.3.4 POA&M close is PROV+~2 days; the 180-day statutory ceiling is
  // the hard backstop if PROV keeps slipping. null => TBD until PROV set.
  poamCloseDeadline: null as string | null,
  poamCloseCeiling: '2027-01-11', // 32 CFR §170.21 180-day ceiling from open date

  phase1Cutoff: '2026-11-09',
  c3paoAssessmentTarget: 'Q4 2026 – Q1 2027',

  // Current, honest posture (nothing implemented yet).
  currentImplemented: 0,
  currentPartial: 2,
  currentSprsScore: -234,

  // Projected post-sprint target (never presented as achieved).
  targetImplemented: 109,
  targetSprsScore: 109,
  conditionalThreshold: 88,

  openPoamItem: 'AU.L2-3.3.4',

  // Not-Met items that CAN close now, independent of the laptops:
  //   IR.L2-3.6.3 — tabletop on paper with Morgan + RJ
  //   PS.L2-3.9.1 — Sterling/HireRight background checks
  laptopIndependentClosable: ['IR.L2-3.6.3', 'PS.L2-3.9.1'] as string[],
  // Not-Met items blocked on PROV (endpoints + Wazuh):
  endpointGated: ['AU.L2-3.3.4', 'SI.L2-3.14.6'] as string[],
};
