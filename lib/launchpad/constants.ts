/**
 * FUSARIUM Launchpad — boundary banner, safe status vocabulary, and draft labels.
 *
 * These strings are load-bearing compliance controls, not copy. The master plan
 * (§2.3, §10.1, §11.7) requires: a persistent non-CUI workspace banner, a status
 * vocabulary that never claims certification, and DRAFT/placeholder labels on
 * every generated document. Import from here — never inline variants.
 */

// ---------------------------------------------------------------------------
// Workspace banners (spec §4.3)
// ---------------------------------------------------------------------------

export const COMMERCIAL_NON_CUI_BANNER = 'COMMERCIAL // NON-CUI WORKSPACE';
export const DEMO_BANNER = 'DEMO // SYNTHETIC DATA';
export const CUI_REFERENCE_BANNER =
  'CUSTOMER-CONTROLLED CUI REFERENCE — CONTENT NOT STORED HERE';
export const PARTNER_SANDBOX_BANNER = 'PARTNER SANDBOX // NON-OPERATIONAL';

// ---------------------------------------------------------------------------
// Safe status vocabulary (spec §2.3) — the ONLY labels the UI may render for
// control/assessment status. Keys mirror launchpad_control_states.state plus
// derived presentation states.
// ---------------------------------------------------------------------------

export const STATUS_VOCABULARY = {
  not_started: 'Not started',
  in_progress: 'In progress',
  implemented: 'Customer-marked implemented',
  not_applicable: 'Customer-marked not applicable',
  evidence_indexed: 'Evidence indexed',
  needs_review: 'Needs review',
  score_estimate: 'Weighted score estimate',
  conditional_estimate: 'Conditional eligibility estimate',
  customer_affirmed: 'Customer affirmed',
  reported_by_customer: 'Assessment status reported by customer',
} as const;

/**
 * Phrases that must never appear in Launchpad-rendered status output unless
 * quoting an authorized third-party or government record. Used by the prompt
 * firewall and by the honesty-test grep in verification.
 */
export const PROHIBITED_CLAIMS = [
  'certified by mycosoft',
  'mycosoft compliant',
  'guaranteed cmmc',
  'dod approved',
  'government approved',
  'cleared company',
  'cmmc certified',
  'cmmc compliant',
] as const;

// ---------------------------------------------------------------------------
// Document factory labels (spec §11.7)
// ---------------------------------------------------------------------------

export const DRAFT_LABEL = 'DRAFT — CUSTOMER REVIEW REQUIRED';
export const PLACEHOLDER = '[CUSTOMER INPUT REQUIRED]';

// ---------------------------------------------------------------------------
// Boundary reminder rendered near every upload/reference affordance (§10.1)
// ---------------------------------------------------------------------------

export const EVIDENCE_BOUNDARY_NOTE =
  'Launchpad stores evidence metadata, references, and hashes only. Keep the ' +
  'evidence content — and all CUI, credentials, and raw logs — in your ' +
  'approved customer-controlled system.';

/** Data classes blocked from standard Launchpad (from data_classification_policy.yaml). */
export const BLOCKED_DATA_CLASSES = [
  'CUI (marked or unmarked)',
  'Classified information',
  'Export-controlled technical data',
  'Passwords, API keys, private keys, seed phrases, recovery codes',
  'SF-86 / background-investigation material; SSNs, passports, birth certificates',
  'Raw packet captures',
  'Full unredacted SIEM or endpoint logs',
  'Government-furnished information not authorized for this workspace',
] as const;

/** Bump when DRAFT legal documents change materially; acceptance ledger keeps history. */
export const TERMS_VERSION = 'draft-2026-08-11';
