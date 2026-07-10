// ═══════════════════════════════════════════════════════════════════════════
// Statutory & Regulatory Framework (2026) + CUI Handling
// ═══════════════════════════════════════════════════════════════════════════
//
// Source: Perplexity primary-source doc (2026-07-10), §4 and §5. REFERENCE ONLY.
// Citations are the primary/authoritative sources cited in the doc.

export interface StatutoryInstrument {
  instrument: string;
  citation: string;
  effectiveDate: string;
  applicability: string;
  keyObligation: string;
  href?: string;
}

export const STATUTORY_FRAMEWORK: StatutoryInstrument[] = [
  { instrument: 'DFARS 252.204-7012', citation: 'Safeguarding Covered Defense Information & Cyber Incident Reporting', effectiveDate: 'In force', applicability: 'Contract involves covered contractor information systems and CDI (CUI / controlled technical information)', keyObligation: 'Provide adequate security via NIST SP 800-171; report qualifying cyber incidents to DoD within 72 hours via dibnet.dod.mil', href: 'https://www.acquisition.gov/dfars/252.204-7012-safeguarding-covered-defense-information-and-cyber-incident-reporting.' },
  { instrument: 'DFARS 252.204-7019', citation: 'Notice of NIST SP 800-171 DoD Assessment Requirements', effectiveDate: 'In force (as of 2025-10-11)', applicability: 'Offeror must implement NIST SP 800-171 for the contract', keyObligation: 'Have a current (≤3-yr) NIST 800-171 DoD Assessment score posted to SPRS to be eligible for award', href: 'https://www.acquisition.gov/dfars/252.204-7019-notice-nistsp-800-171-dod-assessment-requirements.' },
  { instrument: 'DFARS 252.204-7020', citation: 'NIST SP 800-171 DoD Assessment Requirements', effectiveDate: 'In force', applicability: 'Contract requiring NIST SP 800-171 implementation', keyObligation: 'Post Basic/Medium/High assessment scores to SPRS; grants DoD right to conduct/review assessments' },
  { instrument: 'DFARS 252.204-7021', citation: 'Contractor Compliance With CMMC Level Requirements (Nov 2025 clause)', effectiveDate: 'Clause dated Nov 2025; Phase 1 began 2025-11-10', applicability: 'Contract specifies a required CMMC level', keyObligation: 'Have a "Current" CMMC Status at award and throughout performance (Conditional ≤180 days w/ affirmation)', href: 'https://www.acquisition.gov/dfars/252.204-7021-contractor-compliance-cybersecurity-maturity-model-certification-level-requirements.' },
  { instrument: '32 CFR Part 170', citation: 'CMMC Program (final rule)', effectiveDate: '2024-12-16', applicability: 'Establishes CMMC levels, assessment types, scoring, POA&M rules, scope', keyObligation: 'Codifies the CMMC framework, incorporating NIST 800-171 R2 (L2) and selected 800-172 (L3)', href: 'https://www.law.cornell.edu/cfr/text/32/170.14' },
  { instrument: '48 CFR (DFARS acquisition rule)', citation: 'Adds CMMC contract clauses to the DFARS', effectiveDate: 'Published 2025-09-10; clauses began appearing 2025-11-10', applicability: 'Solicitations/contracts for applicable defense work (COTS excluded initially)', keyObligation: 'Authorizes CMMC-level clauses to appear in DoD solicitations' },
  { instrument: '32 CFR Part 2002', citation: 'Controlled Unclassified Information (CUI) Program', effectiveDate: 'In force (implements EO 13556)', applicability: 'Any entity handling CUI on behalf of an agency', keyObligation: 'Establishes CUI categories, marking, safeguarding, dissemination, and decontrol rules', href: 'https://www.law.cornell.edu/cfr/text/32/2002.18' },
  { instrument: 'FAR 52.204-21', citation: 'Basic Safeguarding of Covered Contractor Information Systems', effectiveDate: 'In force', applicability: 'Any federal contract where FCI resides on/transits contractor systems', keyObligation: '15 basic safeguarding requirements (foundation of CMMC Level 1)' },
  { instrument: 'FAR 52.204-25', citation: 'Prohibition on Certain Telecom & Video Surveillance (Section 889)', effectiveDate: 'Clause Nov 2021; 889(a)(1)(A) 2019-08-13; (a)(1)(B) 2020-08-13', applicability: 'Any federal contract/subcontract', keyObligation: 'Prohibits covered telecom/video-surveillance from Huawei, ZTE, Hytera, Hikvision, Dahua (or affiliates)', href: 'https://www.acquisition.gov/far/52.204-25' },
  { instrument: 'FAR 52.204-30', citation: 'FASCSA Orders — Prohibition', effectiveDate: 'In force', applicability: 'DoD FASCSA orders → DoD contracts; DHS orders → all others', keyObligation: 'Must not provide/use any "covered article" from a FASCSA-prohibited source; flows to subcontracts', href: 'https://www.acquisition.gov/far/52.204-30' },
  { instrument: 'EO 14028', citation: "Improving the Nation's Cybersecurity", effectiveDate: 'May 2021', applicability: 'Federal agencies and their software/IT supply chains', keyObligation: 'Zero-trust adoption, software supply-chain security (SBOM), modernized baselines' },
  { instrument: 'EO 13556', citation: 'Controlled Unclassified Information', effectiveDate: 'Nov 2010', applicability: 'All executive branch agencies', keyObligation: 'Establishes the CUI Program; NARA is Executive Agent (legal basis for 32 CFR Part 2002)' },
  { instrument: 'FISMA', citation: '44 U.S.C. § 3551 et seq.', effectiveDate: 'In force', applicability: 'All federal agencies and information systems', keyObligation: 'Statutory foundation for federal infosec; NIST SP 800-series standards' },
];

export const STATUTORY_VERIFY_NOTE =
  'VERIFY the 48 CFR rule\'s current applicability to Mycosoft\'s NUWC TAC-O Phase 2 contract (N66604-26-9-A00X) directly against that contract\'s clause matrix — rule effective dates and contract clause flow-downs can diverge.';

// ── CUI handling (§5) ───────────────────────────────────────────────────────

export interface CuiCategory {
  category: string;
  bannerSpecified: string;
  bannerBasic: string;
  categoryMarking: string;
  relevance: string;
}

export const CUI_CATEGORIES: CuiCategory[] = [
  { category: 'Controlled Technical Information', bannerSpecified: 'CUI//SP-CTI', bannerBasic: '(none)', categoryMarking: 'CTI', relevance: 'Navy TAC-O SOW materials, DARPA program data — Mycosoft\'s primary anticipated CUI category' },
  { category: 'Export Controlled', bannerSpecified: 'CUI//SP-EXPT', bannerBasic: 'CUI', categoryMarking: 'EXPT', relevance: 'Undersea sensor technology potentially subject to ITAR/EAR' },
  { category: 'General Proprietary Business Information', bannerSpecified: 'CUI//SP-PROPIN', bannerBasic: 'CUI', categoryMarking: 'PROPIN', relevance: 'Cost data, contract-related pricing information' },
  { category: 'Unmarked / General CUI', bannerSpecified: '—', bannerBasic: 'CUI', categoryMarking: '—', relevance: 'General defense-related information requiring safeguarding without a more specific subcategory' },
];

export const CUI_HANDLING = {
  basicVsSpecified:
    'CUI Basic = protection required, no specific controls prescribed. CUI Specified = a specific authority prescribes controls (categories with an "SP-" banner, e.g. SP-CTI/SP-EXPT/SP-PROPIN). Where an authority prescribes only some controls, CUI Basic controls fill the gap. (32 CFR §170.14 / §2002.4(h))',
  markingRules: [
    'Banner marking: top (and generally bottom) of a document indicating overall CUI status, e.g. CUI, CUI//SP-CTI.',
    'Portion marking: individual sections/paragraphs/fields carry their own category marking so only CUI-bearing portions are flagged.',
    'Decontrolling (32 CFR §2002.18): decontrol "as soon as practicable"; does NOT authorize public release; unauthorized disclosure is NOT decontrol; may not decontrol to evade accountability.',
  ],
  storage: 'CUI at rest must be protected — NIST 800-171 3.13.16 (at rest) and 3.8.9 (backups).',
  transmission: 'CUI in transit — 3.13.8 (transmission), 3.1.13 (remote access), 3.13.11 (FIPS-validated crypto).',
  destruction: 'Media sanitization/destruction before disposal/reuse — 3.8.3 (5-point Basic, no POA&M eligibility).',
  enclaveGuidance:
    'Confine CUI to a small, tightly-controlled enclave (e.g. PreVeil Gov Community) to minimize the CUI Assessment Boundary. Distinguish CUI Assessment Boundary assets vs. Security Protection Assets (SPA) vs. Contractor Risk Managed Assets (scoped out when isolated).',
  exptOverlap:
    'CUI//SP-EXPT sits at the CUI ∩ export-control intersection (ITAR 22 CFR 120-130 / EAR 15 CFR 730-774). Mycosoft\'s undersea sensor work risks this overlap — have export-control counsel evaluate before any foreign-national engineering collaboration.',
  source: 'NARA CUI Registry; 32 CFR Part 2002; CMMC Assessment Guide L2 v2.13',
} as const;
