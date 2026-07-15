// ═══════════════════════════════════════════════════════════════════════════
// CMMC Level 3 — 24 Enhanced Requirements (NIST SP 800-172, Feb2021)
// ═══════════════════════════════════════════════════════════════════════════
//
// Source of truth: `cmmc-l3-controls.json` (Perplexity 2026-07-12) — verbatim
// NIST SP 800-172 titles + the 32 CFR §170.14(c)(4) text with DoD ODPs resolved
// + NIST discussion text + page numbers. REFERENCE ONLY (not the L2 sprint).
//
// Publication nuance: NIST withdrew 800-172 (Feb2021) on 2026-05-13 for r3, but
// 32 CFR §170.14 incorporates the Feb2021 version BY NAME/DATE — so Feb2021 stays
// the legally operative L3 source until the CFR is amended.

import l3File from './cmmc-l3-controls.json';

interface RawL3 {
  control_id: string;
  domain: string;
  domain_name: string;
  nist_800_172_requirement_number: string;
  verbatim_title_nist_800_172: string;
  cfr_text_with_dod_odp: string;
  page_number_nist_800_172: string;
  discussion_guidance_nist_800_172: string;
  poam_eligible_at_l3: boolean;
}

const RAW = l3File as unknown as {
  controls: RawL3[];
  total_controls: number;
  regulatory_basis?: string;
  prerequisite?: string;
  scoring_methodology?: string | Record<string, unknown>;
  poam_rules_l3?: Record<string, unknown>;
  publication_status_note?: string;
};

export interface L3Requirement {
  id: string;
  family: string;
  familyName: string;
  title: string; // verbatim NIST 800-172
  cfrText: string; // 32 CFR §170.14(c)(4) with DoD ODPs
  guidance: string; // NIST discussion
  pageNumber: string;
  poamIneligible: boolean; // 7 items per §170.21(a)(3)
}

export const CMMC_L3_REQUIREMENTS: L3Requirement[] = RAW.controls.map((c) => ({
  id: c.control_id,
  family: c.domain,
  familyName: c.domain_name,
  title: c.verbatim_title_nist_800_172,
  cfrText: c.cfr_text_with_dod_odp,
  guidance: c.discussion_guidance_nist_800_172,
  pageNumber: c.page_number_nist_800_172,
  poamIneligible: !c.poam_eligible_at_l3,
}));

export const CMMC_L3_META = {
  totalRequirements: RAW.total_controls ?? CMMC_L3_REQUIREMENTS.length,
  source: 'NIST SP 800-172 (Feb2021) / CMMC Assessment Guide – Level 3; 32 CFR §170.14(c)(4)',
  assessor: 'DCMA DIBCAC only (no self-assessment counts toward L3 status)',
  prerequisite: RAW.prerequisite ?? 'Final Level 2 (C3PAO) status required before an L3 assessment may proceed (32 CFR §170.18(a)(1))',
  scoring: 'Flat 1 point per requirement, max 24 (32 CFR §170.24(c)(3)); Conditional needs score/24 ≥ 0.8',
  poamIneligibleCount: CMMC_L3_REQUIREMENTS.filter((r) => r.poamIneligible).length, // 7
  publicationNote: RAW.publication_status_note ?? 'NIST 800-172 Feb2021 remains legally operative (not r3) until 32 CFR §170.14 is amended.',
  phaseStart: '2027-11-10', // Phase 3
  verifyTacoL3: 'VERIFY whether NUWC TAC-O Phase 2 (N66604-26-9-A00X) requires L3 sooner via a contract-specific clause rather than the general phase schedule.',
} as const;
