/**
 * FUSARIUM Launchpad — deterministic readiness report builders.
 *
 * NO LLM anywhere in this module: every report is pure assembly from tenant
 * data the customer recorded (the AI document factory is a separate tool under
 * /documents). Every builder returns markdown headed with the DRAFT_LABEL and
 * uses [CUSTOMER INPUT REQUIRED] for any fact the tenant has not supplied —
 * a missing fact is never invented.
 *
 * Two groups:
 *   'generated' — assembled from launchpad_control_states / score snapshots /
 *                 POA&M items / BOM parts (real tenant data, honestly empty
 *                 when the tenant has recorded nothing).
 *   'skeleton'  — educational structure + tenant profile fields + placeholders
 *                 for catalog entries that have no data-driven builder yet.
 *
 * Vocabulary is load-bearing: "customer-marked implemented", never a
 * certification claim. Nothing in this file states that any company holds a
 * CMMC status — reports describe estimates and customer-recorded facts only.
 */

import { DRAFT_LABEL, PLACEHOLDER, COMMERCIAL_NON_CUI_BANNER } from '@/lib/launchpad/constants';
import { CMMC_L2_CONTROLS, getControlReference } from '@/lib/security/reference/cmmc-l2-reference';
import { RULE_PACK_V1, type AssessmentState } from '@/lib/launchpad/scoring/engine';
import { fourIndependentMeasurements } from '@/lib/launchpad/scoring/indicators';
import type { TenantProfile } from '@/lib/launchpad/docs/tenant-profile';

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export type GeneratedReportKey =
  | 'cmmc_l2_self_assessment_report'
  | 'nist_800_171_summary'
  | 'sprs_score_report'
  | 'poam_export'
  | 'supply_chain_summary';

export type SkeletonReportKey =
  | 'sbir_sttr_readiness'
  | 'itar_ear_screening'
  | 'foci_prep'
  | 'nispom_orientation'
  | 'fedramp_alignment';

export type ReportKey = GeneratedReportKey | SkeletonReportKey;

export interface ReportCatalogEntry {
  key: ReportKey;
  title: string;
  group: 'generated' | 'skeleton';
  /** Plain-language description for founders new to government work. */
  description: string;
  /** Tenant tables (or "profile only") that feed the report. */
  sources: string[];
}

export const REPORT_CATALOG: ReportCatalogEntry[] = [
  {
    key: 'cmmc_l2_self_assessment_report',
    title: 'CMMC Level 2 Self-Assessment Report (DRAFT)',
    group: 'generated',
    description:
      'Your per-family posture and the four independent indicators, assembled from the requirement states you recorded. Unassessed requirements count as Not Met — silence never inflates the picture.',
    sources: ['launchpad_control_states', 'launchpad_evidence_index', 'company profile'],
  },
  {
    key: 'nist_800_171_summary',
    title: 'NIST SP 800-171 Assessment Summary (DRAFT)',
    group: 'generated',
    description:
      'The same recorded data framed against NIST SP 800-171 Rev. 2, with a plain-English explanation of the DFARS clauses (252.204-7019/-7020) that make this assessment matter for DoD contracts.',
    sources: ['launchpad_control_states', 'launchpad_evidence_index', 'company profile'],
  },
  {
    key: 'sprs_score_report',
    title: 'SPRS Score Report (DRAFT)',
    group: 'generated',
    description:
      'Your latest weighted score snapshot with the methodology and step-by-step instructions for entering it in SPRS yourself via PIEE. Launchpad never files anything for you.',
    sources: ['launchpad_score_snapshots', 'company profile'],
  },
  {
    key: 'poam_export',
    title: 'POA&M Export (DRAFT)',
    group: 'generated',
    description:
      'Your open Plan of Action & Milestones items with their 180-day closeout clocks and recorded milestones — the dated to-do list an assessor expects for every gap.',
    sources: ['launchpad_poam_items', 'company profile'],
  },
  {
    key: 'supply_chain_summary',
    title: 'Supply-Chain / Domestic-Sourcing Summary (DRAFT)',
    group: 'generated',
    description:
      'Bill-of-materials statistics (total parts, share with a U.S. country of origin, flagged lines) plus the flagged parts themselves. Honest empty when no BOM is indexed yet.',
    sources: ['launchpad_bom_parts', 'company profile'],
  },
  {
    key: 'sbir_sttr_readiness',
    title: 'SBIR/STTR Readiness Checklist (DRAFT skeleton)',
    group: 'skeleton',
    description:
      'A structured checklist for first-time SBIR/STTR (Small Business Innovation Research / Technology Transfer) applicants: registrations, eligibility, and proposal-volume prep. Structure + your profile only.',
    sources: ['company profile only'],
  },
  {
    key: 'itar_ear_screening',
    title: 'ITAR/EAR Applicability Screening Worksheet (DRAFT skeleton)',
    group: 'skeleton',
    description:
      'An educational worksheet describing how export-control jurisdiction (ITAR vs. EAR) gets determined and which questions counsel will ask. Launchpad and its AI never classify your technical data.',
    sources: ['company profile only'],
  },
  {
    key: 'foci_prep',
    title: 'FOCI Questionnaire Prep (DRAFT skeleton)',
    group: 'skeleton',
    description:
      'Describes the topics the SF-328 (Certificate Pertaining to Foreign Interests) covers so you can gather answers before engaging counsel. This is NOT the form and stores no answers.',
    sources: ['company profile only'],
  },
  {
    key: 'nispom_orientation',
    title: 'NISPOM Orientation Summary (DRAFT skeleton)',
    group: 'skeleton',
    description:
      'A first-timer orientation to the National Industrial Security Program (32 CFR Part 117): facility clearances, sponsorship, and the roles you would need to name. Launchpad cannot obtain a clearance.',
    sources: ['company profile only'],
  },
  {
    key: 'fedramp_alignment',
    title: 'FedRAMP-Alignment Note for Cloud Selection (DRAFT skeleton)',
    group: 'skeleton',
    description:
      'What FedRAMP is, why DFARS 252.204-7012 points cloud choices at the FedRAMP Moderate baseline, and the questions to ask a cloud vendor. A note — not an authorization of anything.',
    sources: ['company profile only'],
  },
];

const CATALOG_BY_KEY = new Map(REPORT_CATALOG.map((e) => [e.key, e]));

export function isReportKey(v: string): v is ReportKey {
  return CATALOG_BY_KEY.has(v as ReportKey);
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ScoreSnapshotRow {
  rule_pack_version: string;
  score: number;
  max_score: number;
  implemented_count: number;
  not_met_count: number;
  na_count: number;
  unassessed_count: number;
  eligibility: string;
  created_at: string;
}

export interface PoamItemRow {
  control_id: string;
  status: string;
  weakness: string | null;
  milestones: unknown;
  opened_at: string;
  due_at: string | null;
}

export interface BomPartRow {
  assembly: string | null;
  part_number: string | null;
  description: string | null;
  manufacturer: string | null;
  supplier: string | null;
  country_of_origin: string | null;
  origin_confidence: number | null;
  prototype_only: boolean;
  flags: unknown;
}

export interface ReportData {
  profile: TenantProfile;
  /** Recorded control states (assessed requirements only). */
  states: Record<string, AssessmentState | undefined>;
  /** Control ids covered by at least one evidence-index record. */
  evidenceControlIds: string[];
  latestSnapshot: ScoreSnapshotRow | null;
  /** Open + in-progress POA&M items. */
  poamItems: PoamItemRow[];
  bomParts: BomPartRow[];
}

export interface BuiltReport {
  key: ReportKey;
  title: string;
  markdown: string;
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

function cell(v: unknown, cap = 90): string {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v)
    // Backslash FIRST, then pipe. Escaping the pipe first turns an input of
    // `a\|b` into `a\\|b` — an escaped backslash followed by a bare pipe, which
    // breaks out of the table cell. Customer-supplied values (part names,
    // control notes) reach these reports, so the order is load-bearing.
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, cap);
  return s || '—';
}

function mdTable(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function draftHead(title: string): string {
  return [
    `# ${title}`,
    '',
    `**${DRAFT_LABEL}**`,
    '',
    `> ${COMMERCIAL_NON_CUI_BANNER} · Assembled deterministically from your Launchpad records on ${today()}.`,
    '> No AI wrote this document (the AI document factory is a separate tool). Nothing in it',
    '> certifies, accredits, approves, or guarantees anything, and it is not a government filing.',
    `> Review every line, replace every ${PLACEHOLDER} placeholder, and have your responsible`,
    '> official approve it before any external use.',
    '',
  ].join('\n');
}

function profileBlock(p: TenantProfile): string {
  const officials =
    p.officials && p.officials.length > 0
      ? p.officials.map((o) => `${o.name} (${o.title})`).join('; ')
      : PLACEHOLDER;
  return [
    '## Company profile',
    '',
    mdTable(
      ['Field', 'Value'],
      [
        ['Legal name', cell(p.legalName)],
        ['Entity type', cell(p.entityType ?? PLACEHOLDER)],
        ['State of formation', cell(p.state ?? PLACEHOLDER)],
        ['UEI (Unique Entity ID, from SAM.gov)', cell(p.uei ?? PLACEHOLDER)],
        ['CAGE code', cell(p.cage ?? PLACEHOLDER)],
        ['Primary site', cell(p.site ?? PLACEHOLDER)],
        ['Website', cell(p.website ?? PLACEHOLDER)],
        ['Headcount', cell(p.headcount ?? PLACEHOLDER)],
        ['Responsible officials', cell(officials, 160)],
      ],
    ),
    '',
  ].join('\n');
}

function methodologySection(): string {
  return [
    '## Methodology',
    '',
    `- **Corpus:** all 110 security requirements of NIST SP 800-171 Rev. 2 (rule pack \`${RULE_PACK_V1.version}\`).`,
    '- **Weighted scoring (DoD Assessment Methodology):** start at 110 and subtract each not-met',
    '  requirement\'s weight (5, 3, or 1). Two dual-value requirements — multi-factor authentication',
    '  (3.5.3) and FIPS-validated cryptography (3.13.11) — subtract 3 when partially implemented and',
    '  5 when absent. The System Security Plan requirement (3.12.4) carries no numeric weight but',
    '  blocks conditional status while not met.',
    `- **POA&M eligibility (per 32 CFR Part 170):** a Conditional CMMC Level 2 (Self) status requires a`,
    `  score of at least ${Math.ceil(RULE_PACK_V1.maxScore * RULE_PACK_V1.conditionalRatio)}, every gap eligible for a Plan of Action & Milestones (POA&M — your dated`,
    `  to-do list for gaps), and at most ${RULE_PACK_V1.poamMaxItems} open items, each closed within ${RULE_PACK_V1.poamWindowDays} days.`,
    '- **Unassessed counts as Not Met:** any requirement without a recorded state is scored as not',
    '  implemented. Silence never inflates a score.',
    '',
  ].join('\n');
}

function familyPostureTable(states: Record<string, AssessmentState | undefined>): string {
  interface FamRow {
    name: string;
    total: number;
    implemented: number;
    partial: number;
    notImplemented: number;
    notApplicable: number;
    unassessed: number;
  }
  const fams = new Map<string, FamRow>();
  for (const c of CMMC_L2_CONTROLS) {
    let f = fams.get(c.family);
    if (!f) {
      f = { name: c.familyName, total: 0, implemented: 0, partial: 0, notImplemented: 0, notApplicable: 0, unassessed: 0 };
      fams.set(c.family, f);
    }
    f.total++;
    const s = states[c.controlId];
    if (s === 'implemented') f.implemented++;
    else if (s === 'partial') f.partial++;
    else if (s === 'not_implemented') f.notImplemented++;
    else if (s === 'not_applicable') f.notApplicable++;
    else f.unassessed++;
  }
  const rows = [...fams.entries()].map(([code, f]) => [
    `${code} — ${cell(f.name, 60)}`,
    String(f.total),
    String(f.implemented),
    String(f.partial),
    String(f.notImplemented),
    String(f.notApplicable),
    String(f.unassessed),
  ]);
  return [
    '## Posture by requirement family',
    '',
    'Counts of your recorded states per family. "Customer-marked implemented" is a count you recorded — it is not a status determination by Launchpad or anyone else.',
    '',
    mdTable(
      ['Family', 'Requirements', 'Customer-marked implemented', 'Partial', 'Not implemented', 'Not applicable', 'Unassessed'],
      rows,
    ),
    '',
  ].join('\n');
}

function indicatorsSection(
  states: Record<string, AssessmentState | undefined>,
  evidenceControlIds: string[],
): string {
  const m = fourIndependentMeasurements(states, evidenceControlIds);
  return [
    '## Four independent indicators',
    '',
    'Launchpad reports these four measurements side by side and never blends them into one "compliance number":',
    '',
    mdTable(
      ['Indicator', 'Value', 'What it is'],
      [
        [
          'Customer-marked implemented',
          `${m.implementedCount.value} of ${m.implementedCount.total}`,
          cell(m.implementedCount.label, 120),
        ],
        [
          'Weighted score estimate',
          `${m.weightedScore.value} / ${m.weightedScore.max} (threshold ${m.weightedScore.threshold})`,
          cell(m.weightedScore.label, 120),
        ],
        ['POA&M eligibility estimate', cell(m.poamEligibility.value), cell(m.poamEligibility.label, 120)],
        [
          'Evidence completeness',
          `${Math.round(m.evidenceCompleteness.value * 100)}% (${m.evidenceCompleteness.covered} of ${m.evidenceCompleteness.assessed} assessed)`,
          cell(m.evidenceCompleteness.label, 140),
        ],
      ],
    ),
    '',
    `Eligibility reasoning: ${m.poamEligibility.reason}`,
    '',
    `> ${m.independenceNote}`,
    '',
  ].join('\n');
}

function unassessedDisclosure(states: Record<string, AssessmentState | undefined>): string {
  const assessed = Object.keys(states).length;
  const unassessed = Math.max(0, CMMC_L2_CONTROLS.length - assessed);
  return [
    '## Unassessed-requirements disclosure',
    '',
    unassessed > 0
      ? `**${unassessed} of ${CMMC_L2_CONTROLS.length} requirements have no recorded state and are scored as Not Met in this report.** Record a state for each in the requirement register before treating any number here as your posture.`
      : `All ${CMMC_L2_CONTROLS.length} requirements have a recorded state. Every state was recorded by your team (or a read-only agent check) — never by AI.`,
    '',
  ].join('\n');
}

function signoffBlock(): string {
  return [
    '## Customer review and approval',
    '',
    `- Reviewed by: ${PLACEHOLDER}`,
    `- Title: ${PLACEHOLDER}`,
    `- Date reviewed: ${PLACEHOLDER}`,
    `- Approval decision and notes: ${PLACEHOLDER}`,
    '',
    '*Approval is a human customer action. Generating this draft did not approve anything.*',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Generated-from-data builders
// ---------------------------------------------------------------------------

function buildCmmcSelfAssessment(d: ReportData): string {
  return [
    draftHead('CMMC Level 2 Self-Assessment Report'),
    profileBlock(d.profile),
    '## What this report is',
    '',
    'CMMC (Cybersecurity Maturity Model Certification) Level 2 is the DoD program that checks whether',
    'a contractor protects Controlled Unclassified Information (CUI). A **self-assessment** is your own',
    'documented review against all 110 NIST SP 800-171 requirements. This DRAFT assembles what you',
    'recorded in Launchpad; it does not assess you, and it makes no status claim on your behalf.',
    '',
    methodologySection(),
    indicatorsSection(d.states, d.evidenceControlIds),
    familyPostureTable(d.states),
    unassessedDisclosure(d.states),
    signoffBlock(),
  ].join('\n');
}

function buildNist800171Summary(d: ReportData): string {
  return [
    draftHead('NIST SP 800-171 Assessment Summary'),
    profileBlock(d.profile),
    '## Why this assessment matters (DFARS context)',
    '',
    'NIST SP 800-171 Rev. 2 defines 110 security requirements for protecting Controlled Unclassified',
    'Information (CUI) on contractor systems. Three DFARS clauses connect it to DoD contracts:',
    '',
    '- **DFARS 252.204-7012** requires contractors handling covered defense information to implement',
    '  NIST SP 800-171 and report cyber incidents to DoD within 72 hours.',
    '- **DFARS 252.204-7019** requires offerors to have a current (no more than three years old)',
    '  NIST SP 800-171 assessment score posted in SPRS (the Supplier Performance Risk System — the',
    '  DoD database where you report your own score) to be considered for award.',
    '- **DFARS 252.204-7020** requires you to give DoD access for higher-level (Medium/High)',
    '  assessments when asked, and to flow the requirement down to subcontractors.',
    '',
    'This DRAFT summarizes the assessment data you recorded; it is not a government assessment and',
    'not a score submission.',
    '',
    methodologySection(),
    indicatorsSection(d.states, d.evidenceControlIds),
    familyPostureTable(d.states),
    unassessedDisclosure(d.states),
    signoffBlock(),
  ].join('\n');
}

function buildSprsScoreReport(d: ReportData): string {
  const s = d.latestSnapshot;
  const scoreSection = s
    ? [
        '## Latest weighted score snapshot',
        '',
        mdTable(
          ['Field', 'Value'],
          [
            ['Score (weighted estimate)', `${s.score} / ${s.max_score}`],
            ['Snapshot date', cell(String(s.created_at).slice(0, 10))],
            ['Rule pack version', cell(s.rule_pack_version)],
            ['Customer-marked implemented', String(s.implemented_count)],
            ['Not met (includes unassessed)', String(s.not_met_count)],
            ['Not applicable', String(s.na_count)],
            ['Unassessed (scored as Not Met)', String(s.unassessed_count)],
            ['Eligibility estimate', cell(s.eligibility)],
          ],
        ),
        '',
        '*This is an estimate computed from the states you recorded. It becomes your official SPRS',
        'entry only after you review it, stand behind it, and enter it yourself.*',
        '',
      ].join('\n')
    : [
        '## Latest weighted score snapshot',
        '',
        '**No score snapshot exists yet.** Launchpad only computes a snapshot when you explicitly ask',
        'for one — go to *Readiness → Score*, review your recorded states, and select **Compute',
        'snapshot**. Then regenerate this report. Nothing here is estimated on your behalf.',
        '',
        `- Score: ${PLACEHOLDER}`,
        `- Snapshot date: ${PLACEHOLDER}`,
        `- Rule pack version: ${RULE_PACK_V1.version} (active)`,
        '',
      ].join('\n');

  return [
    draftHead('SPRS Score Report'),
    profileBlock(d.profile),
    '## What SPRS is',
    '',
    'SPRS (Supplier Performance Risk System) is the DoD database where contractors post their own',
    'NIST SP 800-171 assessment score. Contracting officers check it before award under DFARS',
    '252.204-7019. **You submit your score yourself — Launchpad never files anything for you.**',
    '',
    scoreSection,
    methodologySection(),
    '## How you enter the score in SPRS (you do this yourself)',
    '',
    '1. Confirm your SAM.gov registration is active and you know your UEI and CAGE code.',
    '2. Sign in to PIEE (the Procurement Integrated Enterprise Environment) at `https://piee.eb.mil`.',
    '   If you have no account, register one and request the **SPRS "Cyber Vendor"** role for your',
    '   CAGE code; your company\'s PIEE administrator approves the role.',
    '3. In PIEE, open the **SPRS** application, then the **NIST SP 800-171 Assessment** area, and add',
    '   a new **Basic (self) assessment** entry.',
    '4. Enter: the assessment date, the assessment standard (NIST SP 800-171), your score, the scope',
    `   (enterprise or enclave), the date you expect all requirements to be met (your POA&M completion`,
    '   date), your System Security Plan (SSP) name/version/date, and each CAGE code the assessment',
    '   covers.',
    '5. Save and verify the entry appears under your CAGE code. Keep your assessment artifacts for',
    '   six years.',
    '',
    `- Assessing entity: ${cell(d.profile.legalName, 120)} (self)`,
    `- SSP name/version/date: ${PLACEHOLDER}`,
    `- Scope description: ${PLACEHOLDER}`,
    `- Planned all-requirements-met date: ${PLACEHOLDER}`,
    '',
    signoffBlock(),
  ].join('\n');
}

function milestoneLines(milestones: unknown): string[] {
  if (!Array.isArray(milestones) || milestones.length === 0) return [];
  return milestones.slice(0, 20).map((m, i) => {
    if (typeof m === 'string') return `  ${i + 1}. ${cell(m, 160)}`;
    if (m && typeof m === 'object') {
      const o = m as Record<string, unknown>;
      const text =
        typeof o.title === 'string' ? o.title
        : typeof o.text === 'string' ? o.text
        : typeof o.description === 'string' ? o.description
        : PLACEHOLDER;
      const due = typeof o.due_at === 'string' ? o.due_at : typeof o.due === 'string' ? (o.due as string) : '';
      return `  ${i + 1}. ${cell(text, 160)}${due ? ` (target: ${cell(due.slice(0, 10), 20)})` : ''}`;
    }
    return `  ${i + 1}. ${PLACEHOLDER}`;
  });
}

function buildPoamExport(d: ReportData): string {
  const open = d.poamItems;
  const intro = [
    '## What a POA&M is',
    '',
    'A POA&M (Plan of Action & Milestones) is the dated to-do list for every security requirement you',
    `have not yet met. Under 32 CFR Part 170, each POA&M item must close within ${RULE_PACK_V1.poamWindowDays} days of the`,
    'assessment, only certain lower-weight requirements may sit on one, and a Conditional status',
    `allows at most ${RULE_PACK_V1.poamMaxItems} open items.`,
    '',
  ].join('\n');

  let body: string;
  if (open.length === 0) {
    body = [
      '## Open items',
      '',
      '**No open POA&M items are recorded.** That means one of two things: you have no recorded gaps,',
      'or you have not yet computed a score snapshot (which opens POA&M rows for eligible gaps). If',
      'you have not assessed yet, this is the second case — record your states and compute a snapshot',
      'before relying on this export.',
      '',
    ].join('\n');
  } else {
    const rows = open.map((p) => {
      const ref = getControlReference(p.control_id);
      return [
        cell(p.control_id, 20),
        cell(ref?.title ?? PLACEHOLDER, 70),
        ref?.isNa ? 'NA (blocking)' : cell(ref?.weightMax ?? PLACEHOLDER, 10),
        cell(p.status, 20),
        cell(String(p.opened_at).slice(0, 10), 12),
        p.due_at ? cell(String(p.due_at).slice(0, 10), 12) : PLACEHOLDER,
      ];
    });
    const details = open
      .map((p) => {
        const lines = [
          `### ${p.control_id}`,
          '',
          `- Weakness (customer-described): ${p.weakness ? cell(p.weakness, 400) : PLACEHOLDER}`,
          `- Opened: ${cell(String(p.opened_at).slice(0, 10), 12)} · Due (180-day clock): ${p.due_at ? cell(String(p.due_at).slice(0, 10), 12) : PLACEHOLDER}`,
          '- Milestones:',
        ];
        const ms = milestoneLines(p.milestones);
        lines.push(...(ms.length > 0 ? ms : [`  1. ${PLACEHOLDER}`]));
        lines.push('');
        return lines.join('\n');
      })
      .join('\n');
    body = [
      `## Open items (${open.length})`,
      '',
      mdTable(['Requirement', 'Title', 'Weight', 'Status', 'Opened', 'Due (180-day)'], rows),
      '',
      '## Item detail and milestones',
      '',
      details,
    ].join('\n');
  }

  return [draftHead('POA&M Export'), profileBlock(d.profile), intro, body, signoffBlock()].join('\n');
}

function isDomestic(country: string | null): boolean {
  if (!country) return false;
  return /^(us|usa|u\.s\.|u\.s\.a\.|united states|united states of america)$/i.test(country.trim());
}

function buildSupplyChainSummary(d: ReportData): string {
  const parts = d.bomParts;
  let body: string;
  if (parts.length === 0) {
    body = [
      '## Bill of materials',
      '',
      '**No BOM (bill of materials) is indexed in this workspace.** This report has nothing to',
      'summarize — that is stated plainly rather than estimated. Index your parts list under',
      '*Origin → BOM* first, then regenerate.',
      '',
    ].join('\n');
  } else {
    const total = parts.length;
    const domestic = parts.filter((p) => isDomestic(p.country_of_origin)).length;
    const unknownOrigin = parts.filter((p) => !p.country_of_origin).length;
    const flagged = parts.filter((p) => Array.isArray(p.flags) && (p.flags as unknown[]).length > 0);
    const prototypeOnly = parts.filter((p) => p.prototype_only).length;
    const domesticPct = Math.round((domestic / total) * 100);

    const flaggedRows = flagged.slice(0, 100).map((p) => [
      cell(p.part_number, 24),
      cell(p.description, 60),
      cell(p.manufacturer, 30),
      cell(p.country_of_origin, 24),
      cell(
        Array.isArray(p.flags)
          ? (p.flags as unknown[])
              .map((f) => (typeof f === 'string' ? f : JSON.stringify(f)))
              .join('; ')
          : '',
        90,
      ),
    ]);

    body = [
      '## Summary statistics',
      '',
      mdTable(
        ['Measure', 'Value'],
        [
          ['Total parts indexed', String(total)],
          ['Parts with a U.S. country of origin', `${domestic} (${domesticPct}%)`],
          ['Parts with no recorded country of origin', String(unknownOrigin)],
          ['Flagged parts (customer review required)', String(flagged.length)],
          ['Prototype-only parts', String(prototypeOnly)],
        ],
      ),
      '',
      '*"Country of origin" is what you recorded per part. Launchpad does not verify origin and does',
      'not determine compliance with any domestic-sourcing rule (Buy American, Berry Amendment,',
      'Section 889, etc.) — those determinations belong to you and your counsel.*',
      '',
      flagged.length > 0
        ? ['## Flagged parts', '', mdTable(['Part number', 'Description', 'Manufacturer', 'Origin', 'Flags'], flaggedRows), flagged.length > 100 ? `\n*Showing the first 100 of ${flagged.length} flagged parts.*` : '', ''].join('\n')
        : '## Flagged parts\n\nNo parts carry flags.\n',
    ].join('\n');
  }

  return [draftHead('Supply-Chain / Domestic-Sourcing Summary'), profileBlock(d.profile), body, signoffBlock()].join('\n');
}

// ---------------------------------------------------------------------------
// Educational skeletons — pure structure + profile + placeholders
// ---------------------------------------------------------------------------

function skeletonNote(): string {
  return [
    '## How to use this worksheet',
    '',
    'This is an **educational skeleton**: structure and definitions only, pre-filled with your company',
    `profile where Launchpad has it. Every ${PLACEHOLDER} is yours to complete — Launchpad has no`,
    'data-driven builder for this document yet and invents nothing.',
    '',
  ].join('\n');
}

function buildSbirSttrSkeleton(d: ReportData): string {
  return [
    draftHead('SBIR/STTR Readiness Checklist'),
    profileBlock(d.profile),
    skeletonNote(),
    '## What SBIR/STTR is',
    '',
    'SBIR (Small Business Innovation Research) and STTR (Small Business Technology Transfer) are',
    'federal programs that fund small-business R&D in phases (Phase I feasibility, Phase II',
    'development, Phase III commercialization). Awards are contracts or grants — you must be',
    'registered and eligible before you can even submit.',
    '',
    '## Registrations',
    '',
    `- [ ] Active SAM.gov registration (UEI on file: ${cell(d.profile.uei ?? PLACEHOLDER, 20)})`,
    `- [ ] CAGE code assigned (on file: ${cell(d.profile.cage ?? PLACEHOLDER, 20)})`,
    '- [ ] SBA Company Registry record at SBIR.gov (issues your SBC Control ID)',
    '- [ ] Agency submission portal account (for DoD topics: DSIP at dodsbirsttr.mil)',
    `- [ ] Grants.gov account if targeting granting agencies: ${PLACEHOLDER}`,
    '',
    '## Eligibility (answer honestly; counsel can confirm edge cases)',
    '',
    `- [ ] For-profit U.S. small business, 500 or fewer employees (current headcount: ${cell(d.profile.headcount ?? PLACEHOLDER, 12)})`,
    '- [ ] More than 50% owned and controlled by U.S. individuals (or by other qualifying small businesses)',
    `- [ ] Principal investigator employment plan (SBIR: primarily employed by you at award): ${PLACEHOLDER}`,
    `- [ ] STTR only — partnering U.S. research institution and workshare plan: ${PLACEHOLDER}`,
    `- [ ] Foreign ownership/affiliation review done (see the FOCI prep worksheet): ${PLACEHOLDER}`,
    '',
    '## Topic and proposal prep',
    '',
    `- [ ] Target agency and topic number(s): ${PLACEHOLDER}`,
    `- [ ] Technical volume outline drafted: ${PLACEHOLDER}`,
    `- [ ] Cost volume basis (labor rates, materials, subcontracts): ${PLACEHOLDER}`,
    `- [ ] Company commercialization record / plan: ${PLACEHOLDER}`,
    `- [ ] Submission deadline and internal review date: ${PLACEHOLDER}`,
    '',
    '*Launchpad does not submit proposals. A human at your company submits through the agency portal.*',
    '',
    signoffBlock(),
  ].join('\n');
}

function buildItarEarSkeleton(d: ReportData): string {
  return [
    draftHead('ITAR/EAR Applicability Screening Worksheet'),
    profileBlock(d.profile),
    skeletonNote(),
    '## Definitions (first-time orientation)',
    '',
    '- **ITAR** (International Traffic in Arms Regulations): State Department rules, administered by',
    '  DDTC, covering defense articles and services on the U.S. Munitions List (USML).',
    '- **EAR** (Export Administration Regulations): Commerce Department rules, administered by BIS,',
    '  covering dual-use items on the Commerce Control List (CCL), each with an ECCN. Items subject',
    '  to the EAR but not listed are **EAR99**.',
    '- An **export** includes releasing controlled technical data to a foreign person inside the U.S.',
    '  ("deemed export") — not just shipping hardware abroad.',
    '',
    '## Screening questions (gather answers for counsel)',
    '',
    `- [ ] What products/technical data do we make or handle? ${PLACEHOLDER}`,
    `- [ ] Were any designed, modified, or configured for military use? ${PLACEHOLDER}`,
    `- [ ] Do any appear on a USML category or CCL entry we can identify? ${PLACEHOLDER}`,
    `- [ ] Do we employ or plan to employ foreign persons with access to technical data? ${PLACEHOLDER}`,
    `- [ ] Do we have foreign customers, suppliers, or collaborators? ${PLACEHOLDER}`,
    `- [ ] Are any items furnished by the government or a prime under a defense contract? ${PLACEHOLDER}`,
    '',
    '## Jurisdiction determination paths',
    '',
    '1. **Self-classification** with counsel against the USML and CCL.',
    '2. **Commodity Jurisdiction (CJ) request** to DDTC when ITAR applicability is unclear.',
    '3. **Commodity classification request (CCATS)** to BIS for an ECCN determination.',
    '4. If you manufacture or export defense articles: **DDTC registration** is required even before',
    '   any export occurs.',
    '',
    '> **Launchpad and its AI do not and cannot classify your items or technical data.** Jurisdiction',
    '> and classification are legal determinations — engage qualified export-control counsel.',
    '',
    signoffBlock(),
  ].join('\n');
}

function buildFociSkeleton(d: ReportData): string {
  return [
    draftHead('FOCI Questionnaire Prep'),
    profileBlock(d.profile),
    skeletonNote(),
    '## What FOCI is',
    '',
    'FOCI (Foreign Ownership, Control, or Influence) is the government\'s assessment of whether',
    'foreign interests could improperly influence a company that handles classified or',
    'sensitive work. Companies seeking a facility clearance complete the **SF-328 (Certificate',
    'Pertaining to Foreign Interests)**. This worksheet **describes the SF-328 topics so you can',
    'gather facts in advance — it is not the form, and Launchpad stores no answers to it.**',
    '',
    '## Topics the SF-328 covers (gather these facts)',
    '',
    `- Foreign ownership of your equity, direct or beneficial, at any percentage: ${PLACEHOLDER}`,
    `- Foreign persons holding voting rights, board seats, or officer/key-management roles: ${PLACEHOLDER}`,
    `- Contracts, agreements, or arrangements with foreign persons or governments: ${PLACEHOLDER}`,
    `- Indebtedness to foreign persons (loans, convertible notes, security interests): ${PLACEHOLDER}`,
    `- Revenue or income derived from foreign sources, by country and share: ${PLACEHOLDER}`,
    `- Joint ventures, partnerships, or licensing with foreign entities: ${PLACEHOLDER}`,
    `- Foreign persons with the ability to control or influence company decisions in any other way: ${PLACEHOLDER}`,
    '',
    '## If FOCI factors exist',
    '',
    'DCSA (the Defense Counterintelligence and Security Agency) may require a mitigation instrument —',
    'e.g. a board resolution, Security Control Agreement (SCA), Special Security Agreement (SSA),',
    'Voting Trust, or Proxy Agreement. Which one (if any) fits is a determination made by DCSA with',
    'your counsel — **never by Launchpad, and never by AI.**',
    '',
    signoffBlock(),
  ].join('\n');
}

function buildNispomSkeleton(d: ReportData): string {
  return [
    draftHead('NISPOM Orientation Summary'),
    profileBlock(d.profile),
    skeletonNote(),
    '## What the NISP and NISPOM are',
    '',
    '- The **NISP** (National Industrial Security Program) is the framework under which private',
    '  companies work with classified information.',
    '- The **NISPOM** (NISP Operating Manual) is its rulebook, now codified at **32 CFR Part 117**.',
    '- **DCSA** (Defense Counterintelligence and Security Agency) oversees industry participation.',
    '',
    '## Facility clearance (FCL) basics',
    '',
    '- An **FCL** is a determination that a *company* is eligible to access classified information at',
    '  a given level. It is separate from personnel clearances, which ride on the FCL.',
    '- **You cannot self-sponsor.** A government customer or a cleared prime contractor sponsors you',
    '  when a legitimate classified need exists.',
    '- FOCI factors (see the FOCI prep worksheet) are reviewed as part of the FCL process.',
    '',
    '## Roles you would need to name',
    '',
    `- Facility Security Officer (FSO): ${PLACEHOLDER}`,
    `- Insider Threat Program Senior Official (ITPSO): ${PLACEHOLDER}`,
    `- Key Management Personnel (KMP) list: ${PLACEHOLDER}`,
    '',
    '## Honest boundaries',
    '',
    '> Launchpad cannot obtain, sponsor, or accelerate a facility clearance, and nothing in this',
    '> workspace handles classified information. This summary is orientation for founders who have',
    '> never seen the NISP — the authoritative text is 32 CFR Part 117 and DCSA guidance.',
    '',
    signoffBlock(),
  ].join('\n');
}

function buildFedrampSkeleton(d: ReportData): string {
  return [
    draftHead('FedRAMP-Alignment Note for Cloud Selection'),
    profileBlock(d.profile),
    skeletonNote(),
    '## What FedRAMP is',
    '',
    'FedRAMP (Federal Risk and Authorization Management Program) is the U.S. government\'s program',
    'for authorizing cloud services at defined security baselines (Low / Moderate / High). It applies',
    'to cloud service providers — your company does not "get FedRAMPed" by using an authorized cloud.',
    '',
    '## Why it matters for defense work',
    '',
    'Under **DFARS 252.204-7012(b)(2)(ii)(D)**, if you use an external cloud service to store,',
    'process, or transmit covered defense information, that service must meet security requirements',
    '**equivalent to the FedRAMP Moderate baseline**, and must support the clause\'s incident-reporting',
    '(72-hour), media-preservation, and access obligations.',
    '',
    '## Vendor questions before you sign',
    '',
    `- [ ] Is the offering FedRAMP-authorized (check the FedRAMP Marketplace) or Moderate-equivalent? ${PLACEHOLDER}`,
    `- [ ] Which specific offering/region is authorized — and is that the one we would buy? ${PLACEHOLDER}`,
    `- [ ] What is the authorization boundary, and does our data stay inside it (U.S. data residency)? ${PLACEHOLDER}`,
    `- [ ] Will the vendor support DFARS 7012 incident reporting, forensics, and media preservation? ${PLACEHOLDER}`,
    `- [ ] Is encryption FIPS-validated in the modes we would use? ${PLACEHOLDER}`,
    '',
    '## Honest boundaries',
    '',
    '> This note is educational context for choosing a cloud. It is **not** a FedRAMP authorization,',
    '> an ATO, or an equivalency determination — those exist only in government and third-party',
    '> assessment records, and Launchpad makes no such determination.',
    '',
    signoffBlock(),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export function buildReport(key: ReportKey, data: ReportData): BuiltReport {
  const entry = CATALOG_BY_KEY.get(key)!;
  let markdown: string;
  switch (key) {
    case 'cmmc_l2_self_assessment_report': markdown = buildCmmcSelfAssessment(data); break;
    case 'nist_800_171_summary': markdown = buildNist800171Summary(data); break;
    case 'sprs_score_report': markdown = buildSprsScoreReport(data); break;
    case 'poam_export': markdown = buildPoamExport(data); break;
    case 'supply_chain_summary': markdown = buildSupplyChainSummary(data); break;
    case 'sbir_sttr_readiness': markdown = buildSbirSttrSkeleton(data); break;
    case 'itar_ear_screening': markdown = buildItarEarSkeleton(data); break;
    case 'foci_prep': markdown = buildFociSkeleton(data); break;
    case 'nispom_orientation': markdown = buildNispomSkeleton(data); break;
    case 'fedramp_alignment': markdown = buildFedrampSkeleton(data); break;
  }
  return { key, title: entry.title, markdown };
}
