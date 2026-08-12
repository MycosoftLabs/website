/**
 * FUSARIUM Launchpad — tenant document factory.
 *
 * Multi-tenant counterpart to lib/reports/policy.ts, built on the SAME shared
 * assets (report-doc renderer, provider-agnostic LLM client, verified control
 * corpus) with a TenantProfile instead of the hardcoded Mycosoft context. The
 * internal generator is deliberately untouched.
 *
 * Discipline (master plan §11.7, enforced here):
 *  - every draft leads with DRAFT — CUSTOMER REVIEW REQUIRED;
 *  - missing facts render [CUSTOMER INPUT REQUIRED], never inventions;
 *  - prompts pass through the firewall in, outputs through the firewall out;
 *  - documents carry provenance (rule pack, template version, model, time);
 *  - the factory NEVER sets approved status and never signs or affirms —
 *    documents are drafts until a customer official acts;
 *  - classification is NONE: a non-CUI workspace never stamps CUI banners.
 */

import { CMMC_L2_CONTROLS } from '@/lib/security/reference/cmmc-l2-reference';
import { renderReportHtml, renderProse, type ReportDocument } from '@/lib/reports/report-doc';
import { generateNarrative, activeReportProvider } from '@/lib/reports/llm';
import { POLICY_FAMILIES } from '@/lib/reports/policy';
import { sanitizeForModel, filterModelOutput } from '@/lib/launchpad/prompt-firewall';
import { DRAFT_LABEL, PLACEHOLDER } from '@/lib/launchpad/constants';
import { tenantContext, reportOrg, type TenantProfile } from './tenant-profile';

export const TEMPLATE_VERSION = 'launchpad-doc-v1';

export interface TenantDraft {
  html: string;
  meta: {
    kind: 'policy' | 'ssp' | 'scope_memo';
    family?: string;
    title: string;
    templateVersion: string;
    rulePackVersion: string;
    provider: string | null;
    generatedAt: string;
    firewallRedactions: number;
    firewallFlags: string[];
    placeholdersPresent: boolean;
  };
}

function docControl(p: TenantProfile, suffix: string) {
  const now = new Date();
  const slug = (p.legalName === PLACEHOLDER ? 'ORG' : p.legalName.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase());
  return {
    number: `${slug}-LP-${suffix}-${now.toISOString().slice(0, 10)}`,
    date: now.toISOString().slice(0, 10),
    version: '0.1 (draft)',
    distribution: `${DRAFT_LABEL} — internal to ${p.legalName}. Not an executed policy.`,
    preparedBy: 'FUSARIUM Launchpad document factory (customer facts only; review required)',
  };
}

/** Draft one family policy for a tenant. Deterministic fallback when no LLM key. */
export async function buildTenantPolicy(
  family: string,
  profile: TenantProfile,
  rulePackVersion: string,
): Promise<TenantDraft | null> {
  const fam = POLICY_FAMILIES[family];
  if (!fam) return null;
  const controls = CMMC_L2_CONTROLS.filter((c) => c.family === family);

  const { text: safeContext, redactions } = sanitizeForModel(tenantContext(profile));
  const controlList = controls.map((c) => `${c.controlId} — ${c.title}`).join('\n');

  const narrativeResult = await generateNarrative({
    system:
      `You draft a ${fam.policyTitle} for a small U.S. defense-market startup. ` +
      `HARD RULES: never invent implementation facts, systems, dates, personnel, evidence, or approvals; ` +
      `write "${PLACEHOLDER}" wherever an organization-specific fact is missing; ` +
      `distinguish policy intention from implemented practice; ` +
      `never state or imply the organization is certified, compliant, or government-approved; ` +
      `begin the body with "${DRAFT_LABEL}".`,
    user: `Organization context:\n${safeContext}\n\nControls this policy must cover (${controls.length}):\n${controlList}\n\nDraft the ${fam.policyTitle}.`,
  });

  const fallback =
    `## 1. Purpose\n${DRAFT_LABEL}\n\nThis ${fam.policyTitle} establishes how ${profile.legalName} intends to satisfy the ` +
    `${fam.name} requirements of NIST SP 800-171 Rev. 2.\n\n## 2. Scope\n${safeContext}\n\n## 3. Policy statements\n` +
    controls.map((c) => `- **${c.controlId}** — ${c.title}. Implementation approach: ${PLACEHOLDER}`).join('\n') +
    `\n\n## 4. Review\nOwner: ${PLACEHOLDER} · Approver: ${PLACEHOLDER} · Review cadence: ${PLACEHOLDER}\n\n` +
    `*(No drafting model configured — the structure above is deterministic. Every ${PLACEHOLDER} needs a customer fact.)*`;

  const narrative = narrativeResult?.text ?? null;
  const { text: filtered, flagged } = filterModelOutput(narrative ?? fallback);
  const provider = activeReportProvider();
  const providerLabel = provider ? `${provider.provider} (${provider.model})` : null;

  const doc: ReportDocument = {
    classification: null, // non-CUI workspace: no CUI banners, ever
    title: `${fam.policyTitle} (DRAFT)`,
    subtitle: `${fam.name} · NIST SP 800-171 Rev. 2 · rule pack ${rulePackVersion}`,
    org: reportOrg(profile),
    docControl: docControl(profile, family),
    sections: [
      { id: 'draft-notice', heading: DRAFT_LABEL, bodyHtml: renderProse(
        'This document is a machine-prepared draft assembled from customer-provided facts and the published ' +
        'requirement catalog. It is not an executed policy, not legal advice, and not evidence of implementation. ' +
        `Unresolved items appear as ${PLACEHOLDER}. An authorized customer official must review, complete, approve, ` +
        'and store the executed version in the customer’s authoritative system.') },
      { id: 'policy-body', heading: fam.policyTitle, bodyHtml: renderProse(filtered) },
    ],
    // No affirmation block: the factory never signs or affirms.
    generatedBy: `FUSARIUM Launchpad document factory · ${providerLabel ?? 'deterministic (no model configured)'}`,
  };

  return {
    html: renderReportHtml(doc),
    meta: {
      kind: 'policy',
      family,
      title: fam.policyTitle,
      templateVersion: TEMPLATE_VERSION,
      rulePackVersion,
      provider: providerLabel,
      generatedAt: new Date().toISOString(),
      firewallRedactions: redactions,
      firewallFlags: flagged,
      placeholdersPresent: (narrative ?? fallback).includes(PLACEHOLDER) || filtered.includes(PLACEHOLDER),
    },
  };
}
