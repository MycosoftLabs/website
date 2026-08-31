/**
 * Tenant SSP outline — de-Mycosoft. Facts come only from TenantProfile.
 * Never marks a control MET. Always DRAFT.
 */

import { CMMC_L2_CONTROLS } from '@/lib/security/reference/cmmc-l2-reference';
import { renderReportHtml, renderProse, type ReportDocument } from '@/lib/reports/report-doc';
import { sanitizeForModel, filterModelOutput } from '@/lib/launchpad/prompt-firewall';
import { DRAFT_LABEL, PLACEHOLDER } from '@/lib/launchpad/constants';
import { reportOrg, tenantContext, type TenantProfile } from './tenant-profile';
import { TEMPLATE_VERSION, type TenantDraft } from './policy-factory';
import { RULE_PACK_V1 } from '@/lib/launchpad/scoring/engine';

export async function buildTenantSsp(
  profile: TenantProfile,
  controlSummary: { implemented: number; partial: number; notImplemented: number; na: number },
): Promise<TenantDraft> {
  const { text: safeContext, redactions } = sanitizeForModel(tenantContext(profile));
  const families = Array.from(new Set(CMMC_L2_CONTROLS.map((c) => c.family))).sort();
  const fallback = [
    `## 1. System identification`,
    `Organization: ${profile.legalName}`,
    `UEI: ${profile.uei ?? PLACEHOLDER} · CAGE: ${profile.cage ?? PLACEHOLDER}`,
    `Site: ${profile.site ?? PLACEHOLDER}`,
    ``,
    `## 2. Assessment boundary (customer-described)`,
    profile.boundaryDescription ?? PLACEHOLDER,
    ``,
    `## 3. Systems in scope (customer-described)`,
    profile.stackSummary ?? PLACEHOLDER,
    ``,
    `## 4. Control register snapshot (customer-marked; not a certification)`,
    `Implemented: ${controlSummary.implemented} · Partial: ${controlSummary.partial} · Not implemented: ${controlSummary.notImplemented} · N/A: ${controlSummary.na} · Catalog size: ${CMMC_L2_CONTROLS.length}`,
    ``,
    `## 5. Family coverage`,
    ...families.map((f) => `- ${f}: ${PLACEHOLDER}`),
    ``,
    `This outline is not an executed SSP and does not mark any requirement MET.`,
  ].join('\n');

  const { text: filtered, flagged } = filterModelOutput(fallback);
  const now = new Date().toISOString().slice(0, 10);
  const doc: ReportDocument = {
    classification: null,
    title: 'System Security Plan (DRAFT)',
    subtitle: `NIST SP 800-171 Rev. 2 / CMMC L2 · rule pack ${RULE_PACK_V1.version}`,
    org: reportOrg(profile),
    docControl: {
      number: `LP-SSP-${now}`,
      date: now,
      version: '0.1 (draft)',
      distribution: `${DRAFT_LABEL} — internal to ${profile.legalName}. Not an executed SSP.`,
      preparedBy: 'FUSARIUM Launchpad document factory (customer facts only)',
    },
    sections: [
      {
        id: 'draft-notice',
        heading: DRAFT_LABEL,
        bodyHtml: renderProse(
          'This is a machine-prepared outline assembled from customer-provided facts. ' +
            'It is not an executed System Security Plan, not a SPRS submission, and not evidence that any control is implemented. ' +
            `Unresolved items appear as ${PLACEHOLDER}.`,
        ),
      },
      { id: 'ssp-body', heading: 'SSP outline', bodyHtml: renderProse(filtered) },
      { id: 'context', heading: 'Organization context (sanitized)', bodyHtml: renderProse(safeContext) },
    ],
    generatedBy: 'FUSARIUM Launchpad document factory · deterministic SSP outline',
  };

  return {
    html: renderReportHtml(doc),
    meta: {
      kind: 'ssp',
      title: 'System Security Plan (DRAFT)',
      templateVersion: TEMPLATE_VERSION,
      rulePackVersion: RULE_PACK_V1.version,
      provider: null,
      generatedAt: new Date().toISOString(),
      firewallRedactions: redactions,
      firewallFlags: flagged,
      placeholdersPresent: true,
    },
  };
}
