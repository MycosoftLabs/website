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
import { POLICY_FAMILIES } from '@/lib/reports/policy';
import { sanitizeForModel, filterModelOutput } from '@/lib/launchpad/prompt-firewall';
import { DRAFT_LABEL, PLACEHOLDER } from '@/lib/launchpad/constants';
import { tenantContext, reportOrg, type TenantProfile } from './tenant-profile';

export interface PolicyNarrative {
  text: string | null;
  provider: string | null;
}

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

export function policyDraftPrompts(family: string, profile: TenantProfile): {
  system: string;
  user: string;
} | null {
  const fam = POLICY_FAMILIES[family];
  if (!fam) return null;
  const controls = CMMC_L2_CONTROLS.filter((c) => c.family === family);
  const { text: safeContext } = sanitizeForModel(tenantContext(profile));
  const controlList = controls.map((c) => `${c.controlId} — ${c.title}`).join('\n');
  return {
    system:
      `You draft a ${fam.policyTitle} for a small U.S. defense-market startup. ` +
      `HARD RULES: never invent implementation facts, systems, dates, personnel, evidence, or approvals; ` +
      `write "${PLACEHOLDER}" wherever an organization-specific fact is missing; ` +
      `distinguish policy intention from implemented practice; ` +
      `never state or imply the organization is certified, compliant, or government-approved; ` +
      `begin the body with "${DRAFT_LABEL}".`,
    user: `Organization context:\n${safeContext}\n\nControls this policy must cover (${controls.length}):\n${controlList}\n\nDraft the ${fam.policyTitle}.`,
  };
}

/** Draft one family policy for a tenant. LLM text must already be metered. */
export async function buildTenantPolicy(
  family: string,
  profile: TenantProfile,
  rulePackVersion: string,
  narrative?: PolicyNarrative | null,
): Promise<TenantDraft | null> {
  const fam = POLICY_FAMILIES[family];
  if (!fam) return null;
  const controls = CMMC_L2_CONTROLS.filter((c) => c.family === family);

  const { text: safeContext, redactions } = sanitizeForModel(tenantContext(profile));

  const fallback =
    `## 1. Purpose\n${DRAFT_LABEL}\n\nThis ${fam.policyTitle} establishes how ${profile.legalName} intends to satisfy the ` +
    `${fam.name} requirements of NIST SP 800-171 Rev. 2.\n\n## 2. Scope\n${safeContext}\n\n## 3. Policy statements\n` +
    controls.map((c) => `- **${c.controlId}** — ${c.title}. Implementation approach: ${PLACEHOLDER}`).join('\n') +
    `\n\n## 4. Review\nOwner: ${PLACEHOLDER} · Approver: ${PLACEHOLDER} · Review cadence: ${PLACEHOLDER}\n\n` +
    `*(No drafting model configured — the structure above is deterministic. Every ${PLACEHOLDER} needs a customer fact.)*`;

  const narrativeText = narrative?.text ?? null;
  const { text: filtered, flagged } = filterModelOutput(narrativeText ?? fallback);
  const providerLabel = narrative?.provider ?? null;

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
      placeholdersPresent: (narrativeText ?? fallback).includes(PLACEHOLDER) || filtered.includes(PLACEHOLDER),
    },
  };
}

/* ============================================================================
 * SSP skeleton composer — ADDITIVE exports only (nothing above is changed).
 *
 * Pure deterministic assembly: NO LLM call anywhere in this section. The
 * skeleton is markdown built from three customer-owned inputs — the company
 * profile, the recorded control states, and evidence-index counts — organized
 * by the 14 NIST SP 800-171 families. Every section is headed with the DRAFT
 * label, every missing fact renders the placeholder, and every status is
 * phrased "customer-marked …". The composer never claims any requirement is
 * MET and never states the organization is certified or compliant.
 * ========================================================================== */

export const SSP_SKELETON_VERSION = 'launchpad-ssp-skeleton-v1';

/** Mirror of launchpad_control_states.state — kept local so the composer
 * stays import-cycle-free with the scoring engine. */
export type SspControlState = 'implemented' | 'partial' | 'not_implemented' | 'not_applicable';

export interface SspFamilyCompleteness {
  family: string;
  familyName: string;
  total: number;
  implemented: number;
  partial: number;
  notImplemented: number;
  notApplicable: number;
  unassessed: number;
  /** Evidence-index records whose control_ids touch this family (metadata/hash only). */
  evidenceRecords: number;
}

export interface SspSkeletonMeta {
  kind: 'ssp';
  title: string;
  templateVersion: string;
  rulePackVersion: string;
  /** Always null — the skeleton is deterministic; no model is ever consulted. */
  provider: null;
  generatedAt: string;
  familyCount: number;
  controlCount: number;
  implementedCount: number;
  partialCount: number;
  notImplementedCount: number;
  notApplicableCount: number;
  unassessedCount: number;
  evidenceRecordCount: number;
  placeholdersPresent: boolean;
}

export interface SspSkeleton {
  markdown: string;
  meta: SspSkeletonMeta;
  families: SspFamilyCompleteness[];
}

/** Two-letter family code — the corpus `family` field is not guaranteed to be
 * the code, so fall back to the control-id prefix (e.g. "AC.L2-3.1.1" → AC). */
function sspFamilyCode(family: string, controlId: string): string {
  return /^[A-Z]{2}$/.test(family) ? family : controlId.slice(0, 2);
}

const SSP_STATE_LABEL: Record<SspControlState, string> = {
  implemented: 'Customer-marked implemented',
  partial: 'Customer-marked partial',
  not_implemented: 'Customer-marked not implemented',
  not_applicable: 'Customer-marked not applicable',
};

/**
 * Per-family completeness from the tenant's recorded states + evidence counts.
 * Iterates the FULL corpus (a control with no recorded state counts as
 * unassessed — silence never inflates completeness). Family order follows
 * POLICY_FAMILIES, the canonical 14-family sequence.
 */
export function sspFamilyCompleteness(
  states: Record<string, SspControlState | undefined>,
  evidenceCountByControl: Record<string, number>,
): SspFamilyCompleteness[] {
  return Object.keys(POLICY_FAMILIES).map((code) => {
    const controls = CMMC_L2_CONTROLS.filter((c) => sspFamilyCode(c.family, c.controlId) === code);
    const row: SspFamilyCompleteness = {
      family: code,
      familyName: POLICY_FAMILIES[code].name,
      total: controls.length,
      implemented: 0,
      partial: 0,
      notImplemented: 0,
      notApplicable: 0,
      unassessed: 0,
      evidenceRecords: 0,
    };
    for (const c of controls) {
      const s = states[c.controlId];
      if (s === 'implemented') row.implemented++;
      else if (s === 'partial') row.partial++;
      else if (s === 'not_applicable') row.notApplicable++;
      else if (s === 'not_implemented') row.notImplemented++;
      else row.unassessed++;
      row.evidenceRecords += evidenceCountByControl[c.controlId] ?? 0;
    }
    return row;
  });
}

/**
 * Assemble the SSP draft skeleton. Deterministic: same inputs → same markdown
 * (apart from the timestamp the caller passes in via `now`).
 */
export function composeSspSkeleton(
  profile: TenantProfile,
  states: Record<string, SspControlState | undefined>,
  evidenceCountByControl: Record<string, number>,
  rulePackVersion: string,
  now: Date = new Date(),
): SspSkeleton {
  const families = sspFamilyCompleteness(states, evidenceCountByControl);
  const date = now.toISOString().slice(0, 10);
  const officials =
    profile.officials && profile.officials.length > 0
      ? profile.officials.map((o) => `- ${o.name} — ${o.title}`).join('\n')
      : `- ${PLACEHOLDER} (name and title of the responsible official)`;

  const totals = families.reduce(
    (t, f) => ({
      implemented: t.implemented + f.implemented,
      partial: t.partial + f.partial,
      notImplemented: t.notImplemented + f.notImplemented,
      notApplicable: t.notApplicable + f.notApplicable,
      unassessed: t.unassessed + f.unassessed,
      evidence: t.evidence + f.evidenceRecords,
    }),
    { implemented: 0, partial: 0, notImplemented: 0, notApplicable: 0, unassessed: 0, evidence: 0 },
  );

  const head = (title: string) => `## ${title} — ${DRAFT_LABEL}`;

  const lines: string[] = [
    `# System Security Plan (DRAFT) — ${profile.legalName}`,
    '',
    `**${DRAFT_LABEL}**`,
    '',
    '> Machine-assembled skeleton built only from customer-recorded facts: the company profile, the',
    '> customer-owned control register, and evidence-index metadata (references and hashes — never content).',
    `> No language model was used. Every missing fact appears as ${PLACEHOLDER}. This document does not`,
    `> state or imply that ${profile.legalName} is CMMC certified or compliant, and it never marks a`,
    '> requirement MET — statuses below are customer-marked and require customer review before any use.',
    '',
    `- Document number: LP-SSP-${date}`,
    `- Date: ${date}`,
    `- Version: 0.1 (draft)`,
    `- Template: ${SSP_SKELETON_VERSION} · Rule pack: ${rulePackVersion}`,
    `- Prepared by: FUSARIUM Launchpad document factory (deterministic assembly; customer review required)`,
    '',
    head('1. System identification'),
    '',
    `- Organization legal name: ${profile.legalName}`,
    `- Entity type: ${profile.entityType ?? PLACEHOLDER}`,
    `- State of registration: ${profile.state ?? PLACEHOLDER}`,
    `- UEI: ${profile.uei ?? PLACEHOLDER}`,
    `- CAGE: ${profile.cage ?? PLACEHOLDER}`,
    `- Primary site: ${profile.site ?? PLACEHOLDER}`,
    `- Website: ${profile.website ?? PLACEHOLDER}`,
    `- Headcount: ${typeof profile.headcount === 'number' ? profile.headcount : PLACEHOLDER}`,
    '',
    head('2. Roles and responsibilities'),
    '',
    officials,
    '',
    head('3. Assessment boundary (customer-described)'),
    '',
    profile.boundaryDescription ?? PLACEHOLDER,
    '',
    head('4. System environment and in-scope systems (customer-described)'),
    '',
    profile.stackSummary ?? PLACEHOLDER,
    '',
    head('5. Control implementation summary'),
    '',
    'Counts below are customer-marked register states — a count is not a certification, an assessment',
    'result, or a government determination.',
    '',
    `| Register state | Count |`,
    `| --- | ---: |`,
    `| Customer-marked implemented | ${totals.implemented} |`,
    `| Customer-marked partial | ${totals.partial} |`,
    `| Customer-marked not implemented | ${totals.notImplemented} |`,
    `| Customer-marked not applicable | ${totals.notApplicable} |`,
    `| Not yet assessed | ${totals.unassessed} |`,
    `| Evidence-index records (metadata/hash only) | ${totals.evidence} |`,
    '',
  ];

  families.forEach((f, i) => {
    lines.push(head(`${6 + i}. ${f.family} — ${f.familyName}`), '');
    lines.push(
      `Register: ${f.implemented} customer-marked implemented · ${f.partial} partial · ` +
        `${f.notImplemented} not implemented · ${f.notApplicable} not applicable · ` +
        `${f.unassessed} not yet assessed · ${f.evidenceRecords} evidence record(s) indexed.`,
      '',
    );
    const controls = CMMC_L2_CONTROLS.filter((c) => sspFamilyCode(c.family, c.controlId) === f.family);
    for (const c of controls) {
      const s = states[c.controlId];
      const status = s ? SSP_STATE_LABEL[s] : 'Not yet assessed';
      const evidence = evidenceCountByControl[c.controlId] ?? 0;
      let followUp: string;
      if (s === 'implemented') followUp = `Implementation description: ${PLACEHOLDER}.`;
      else if (s === 'not_applicable') followUp = `Applicability justification: ${PLACEHOLDER}.`;
      else followUp = `Planned approach and target date: ${PLACEHOLDER}.`;
      lines.push(
        `- **${c.controlId}** — ${c.title}. Status: ${status}. ${followUp} Evidence indexed: ${evidence} record(s).`,
      );
    }
    lines.push('');
  });

  lines.push(
    head('20. Gaps and plan of action cross-reference'),
    '',
    'Requirements not customer-marked implemented or not applicable are gaps. Track each gap on the',
    `POA&M (Plan of Action & Milestones) with an owner, milestones, and a completion date: ${PLACEHOLDER}.`,
    '',
    head('21. Record retention'),
    '',
    'Assessment artifacts — including every affirmed version of this SSP, score snapshots, and the',
    'evidence they cite — must be retained for six years from the assessment date (32 CFR § 170.16).',
    `Customer retention location (your authoritative system, not Launchpad): ${PLACEHOLDER}.`,
    '',
    '---',
    '',
    `*${DRAFT_LABEL} — assembled ${now.toISOString()} by the FUSARIUM Launchpad document factory.*`,
    '*An authorized customer official must review, complete, approve, and store the executed version*',
    '*in the customer-controlled authoritative system before any external use.*',
    '',
  );

  const markdown = lines.join('\n');
  return {
    markdown,
    meta: {
      kind: 'ssp',
      title: `System Security Plan (DRAFT) — ${profile.legalName}`,
      templateVersion: SSP_SKELETON_VERSION,
      rulePackVersion,
      provider: null,
      generatedAt: now.toISOString(),
      familyCount: families.length,
      controlCount: CMMC_L2_CONTROLS.length,
      implementedCount: totals.implemented,
      partialCount: totals.partial,
      notImplementedCount: totals.notImplemented,
      notApplicableCount: totals.notApplicable,
      unassessedCount: totals.unassessed,
      evidenceRecordCount: totals.evidence,
      placeholdersPresent: markdown.includes(PLACEHOLDER),
    },
    families,
  };
}
