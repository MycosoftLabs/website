/**
 * Tenant-scoped report catalogue. DRAFT + placeholders only.
 * Never claims CMMC / FedRAMP / SPRS Met. Never invents scores.
 */

import { DRAFT_LABEL, PLACEHOLDER } from '@/lib/launchpad/constants';
import { RULE_PACK_V1 } from '@/lib/launchpad/scoring/engine';
import { reportOrg, type TenantProfile } from '@/lib/launchpad/docs/tenant-profile';
import { renderProse, renderReportHtml, type ReportDocument } from '@/lib/reports/report-doc';
import { filterModelOutput } from '@/lib/launchpad/prompt-firewall';

export const REPORT_TYPES = [
  'remediation_plan',
  'cmmc_l2_self_assessment',
  'nist_800_171',
  'sprs_score',
  'poam',
  'supply_chain',
  'sbir_sttr',
  'ear_itar',
  'foci',
  'nisp',
  'om',
  'fedramp',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export function isReportType(v: string): v is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(v);
}

export interface ReportInputs {
  implementedCount?: number;
  score?: number;
  maxScore?: number;
  poamOpen?: number;
  bomLines?: number;
}

const TITLES: Record<ReportType, string> = {
  remediation_plan: 'Remediation plan (DRAFT)',
  cmmc_l2_self_assessment: 'CMMC Level 2 self-assessment cover (DRAFT)',
  nist_800_171: 'NIST SP 800-171 worksheet (DRAFT)',
  sprs_score: 'SPRS score worksheet (DRAFT)',
  poam: 'POA&M worksheet (DRAFT)',
  supply_chain: 'Supply-chain / Made-in-America worksheet (DRAFT)',
  sbir_sttr: 'SBIR/STTR readiness cover (DRAFT)',
  ear_itar: 'EAR/ITAR counsel referral (DRAFT)',
  foci: 'FOCI questionnaire tracker (DRAFT)',
  nisp: 'NISP / FCL readiness checklist (DRAFT)',
  om: 'Operations & maintenance worksheet (DRAFT)',
  fedramp: 'FedRAMP pointer (DRAFT — not an authorization)',
};

export function buildTenantReport(
  kind: ReportType,
  profile: TenantProfile,
  inputs: ReportInputs = {},
): { html: string; title: string } {
  const now = new Date().toISOString().slice(0, 10);
  const body = [
    `Organization: ${profile.legalName}`,
    `UEI: ${profile.uei ?? PLACEHOLDER} · CAGE: ${profile.cage ?? PLACEHOLDER}`,
    `Rule pack: ${RULE_PACK_V1.version}`,
    ``,
    kind === 'sprs_score'
      ? `Weighted score estimate: ${inputs.score ?? PLACEHOLDER} / ${inputs.maxScore ?? RULE_PACK_V1.maxScore}. This is an estimate, not a SPRS submission.`
      : '',
    kind === 'cmmc_l2_self_assessment'
      ? `Customer-marked implemented count: ${inputs.implementedCount ?? PLACEHOLDER}. This is not a certification and Mycosoft does not claim the customer is CMMC compliant.`
      : '',
    kind === 'poam'
      ? `Open POA&M items recorded by the customer: ${inputs.poamOpen ?? PLACEHOLDER}. Window: ${RULE_PACK_V1.poamWindowDays} days (rule pack).`
      : '',
    kind === 'supply_chain'
      ? `BOM lines indexed: ${inputs.bomLines ?? 0}. Origin Graph flags require customer review. Launchpad does not certify domestic content.`
      : '',
    kind === 'nist_800_171'
      ? `Same 110-requirement corpus as CMMC L2. Implemented count: ${inputs.implementedCount ?? PLACEHOLDER}. Not a Met claim.`
      : '',
    kind === 'sbir_sttr'
      ? `Outline only. Launchpad does not submit SBIR/STTR proposals.`
      : '',
    kind === 'ear_itar'
      ? `Counsel referral worksheet. AI does not classify export-controlled technical data.`
      : '',
    kind === 'foci'
      ? `FOCI tracker metadata only. AI does not classify FOCI. No SF-328 answers stored.`
      : '',
    kind === 'nisp'
      ? `FCL readiness checklist. Launchpad cannot obtain or guarantee a facility clearance.`
      : '',
    kind === 'om'
      ? `Operations & maintenance placeholders. Customer facts only.`
      : '',
    kind === 'fedramp'
      ? `Pointer only. Not a FedRAMP authorization, ATO, or equivalency claim.`
      : '',
    ``,
    `Owner: ${PLACEHOLDER} · Reviewer: ${PLACEHOLDER} · Next review: ${PLACEHOLDER}`,
  ]
    .filter(Boolean)
    .join('\n');

  const { text: filtered } = filterModelOutput(body);
  const doc: ReportDocument = {
    classification: null,
    title: TITLES[kind],
    subtitle: `${DRAFT_LABEL} · ${RULE_PACK_V1.version}`,
    org: reportOrg(profile),
    docControl: {
      number: `LP-RPT-${kind}-${now}`,
      date: now,
      version: '0.1 (draft)',
      distribution: `${DRAFT_LABEL} — not a government filing.`,
      preparedBy: 'FUSARIUM Launchpad document factory',
    },
    sections: [
      { id: 'draft', heading: DRAFT_LABEL, bodyHtml: renderProse('Customer review required. Not a filing. Not a MET claim.') },
      { id: 'body', heading: TITLES[kind], bodyHtml: renderProse(filtered) },
    ],
    generatedBy: 'FUSARIUM Launchpad · deterministic tenant report',
  };
  return { html: renderReportHtml(doc), title: TITLES[kind] };
}
