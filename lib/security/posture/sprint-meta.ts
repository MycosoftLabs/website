// Lightweight, client-safe CMMC self-assessment framing constants.
//
// Kept SEPARATE from the full posture overlay so client components can show the
// current-vs-target context banner without bundling the 110-control JSON. These
// mirror `mycosoft-posture-overlay-v1.json` (sprint + score header) — if the
// overlay's sprint/score header changes, update these to match.

export const CMMC_SPRINT_META = {
  kickoffDate: '2026-07-13',
  targetSprsSubmissionDate: '2026-07-17',
  phase1Cutoff: '2026-11-09',
  poamCloseDeadline: '2026-08-31',
  c3paoAssessmentTarget: 'Q4 2026 – Q1 2027',
  totalControls: 110,
  // Current, honest as-of-2026-07-10 posture (nothing implemented yet).
  currentImplemented: 0,
  currentPartial: 2,
  currentSprsScore: -234,
  // Projected post-sprint target (never presented as achieved).
  targetImplemented: 109,
  targetSprsScore: 109,
  conditionalThreshold: 88,
  openPoamItem: 'AU.L2-3.3.4',
} as const;
