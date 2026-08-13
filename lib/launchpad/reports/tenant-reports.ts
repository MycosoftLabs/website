/**
 * Tenant-scoped report catalogue (WP-6). Five types from the internal Reports
 * tab, parameterized by TenantProfile. Deterministic; no Mycosoft literals.
 * Never claims CMMC compliance.
 */

import { DRAFT_LABEL, PLACEHOLDER } from '@/lib/launchpad/constants';
import { RULE_PACK_V1 } from '@/lib/launchpad/scoring/engine';
import { reportOrg, type TenantProfile } from '@/lib/launchpad/docs/tenant-profile';
import { renderProse, renderReportHtml, type ReportDocument } from '@/lib/reports/report-doc';
import { filterModelOutput } from '@/lib/launchpad/prompt-firewall';

export const REPORT_TYPES = [
  'remediation_plan',
  'cmmc_l2_self_assessment',
  'sprs_score',
  'poam',
  'supply_chain',
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
  sprs_score: 'SPRS score worksheet (DRAFT)',
  poam: 'POA&M worksheet (DRAFT)',
  supply_chain: 'Supply-chain / Made-in-America worksheet (DRAFT)',
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
    kind === 'remediation_plan'
      ? `Sequence work from customer-recorded gaps. AI does not mark controls implemented.`
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
