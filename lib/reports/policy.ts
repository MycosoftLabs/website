// ═══════════════════════════════════════════════════════════════════════════
// CMMC L2 policy + procedure generator (Batch B of the 48-hr sprint)
// ═══════════════════════════════════════════════════════════════════════════
//
// Auto-drafts the documentation an assessor requires: the 14 NIST SP 800-171
// family policies, the IR runbook, the RJ access agreement, and physical-access
// / visitor-log templates — LLM-authored from the real control guidance and
// Mycosoft's actual stack (PreVeil Gov CUI enclave, Google Workspace out of
// scope, Wazuh, 2-user home-office). Morgan reviews + signs.

import { CMMC_L2_CONTROLS } from '@/lib/security/reference/cmmc-l2-reference';
import { renderReportHtml, renderTable, renderProse, type ReportDocument } from './report-doc';
import { generateNarrative, activeReportProvider } from './llm';

const ORG = { legalName: 'Mycosoft, LLC', uei: 'YK3ARVKJ77S9', cage: '9KR60', sao: 'Morgan Rockcoons', site: '451 Acero Pl, Chula Vista, CA 91910' };

const MYCOSOFT_CONTEXT =
  'Mycosoft, LLC is a 2-user defense contractor (Morgan Rockcoons — CEO/Senior Affirming Official/primary CUI handler; RJ Ricasata — Engineering/secondary CUI handler), single-CAGE, single-site (home-office). CUI Assessment Boundary = PreVeil Gov Community (AWS GovCloud, FedRAMP Moderate Equivalent, FIPS 140-3 validated, CMVP #5145) on 2 Windows 11 laptops + iOS/Android mobile. Google Workspace, GitHub, Notion, Slack are OUTSIDE the CUI boundary (no CUI). Wazuh open-source SIEM is a Security Protection Asset. This is a home-office scope, not a 500-seat rollout.';

export const POLICY_FAMILIES: Record<string, { name: string; policyTitle: string }> = {
  AC: { name: 'Access Control', policyTitle: 'Access Control Policy' },
  AT: { name: 'Awareness and Training', policyTitle: 'Security Awareness & Training Policy' },
  AU: { name: 'Audit and Accountability', policyTitle: 'Audit & Accountability Policy' },
  CM: { name: 'Configuration Management', policyTitle: 'Configuration Management Policy' },
  IA: { name: 'Identification and Authentication', policyTitle: 'Identification & Authentication Policy' },
  IR: { name: 'Incident Response', policyTitle: 'Incident Response Policy' },
  MA: { name: 'Maintenance', policyTitle: 'Maintenance Policy' },
  MP: { name: 'Media Protection', policyTitle: 'Media Protection Policy' },
  PS: { name: 'Personnel Security', policyTitle: 'Personnel Security Policy' },
  PE: { name: 'Physical Protection', policyTitle: 'Physical Protection Policy' },
  RA: { name: 'Risk Assessment', policyTitle: 'Risk Assessment Policy' },
  CA: { name: 'Security Assessment', policyTitle: 'Security Assessment Policy' },
  SC: { name: 'System and Communications Protection', policyTitle: 'System & Communications Protection Policy' },
  SI: { name: 'System and Information Integrity', policyTitle: 'System & Information Integrity Policy' },
};

export const POLICY_KINDS = [
  ...Object.keys(POLICY_FAMILIES).map((f) => `policy:${f}`),
  'ir-runbook', 'access-agreement', 'physical-access', 'visitor-log',
];

function docControl(numSuffix: string) {
  const now = new Date();
  return {
    number: `MYC-SEC-POL-${numSuffix}-${now.toISOString().slice(0, 10)}`,
    date: now.toISOString().slice(0, 10),
    version: '1.0',
    distribution: 'Internal — Mycosoft compliance. Handle as CUI.',
    preparedBy: 'MYCA Reports Agent (draft for SAO review & signature)',
  };
}

function affirm(title: string) {
  return `I, ${ORG.sao}, Senior Affirming Official of ${ORG.legalName}, approve and adopt this ${title} as organizational policy effective on the date above, and affirm the organization's commitment to its continuing enforcement.`;
}

/** Generate one family policy document. */
export async function buildPolicy(family: string): Promise<{ html: string; meta: Record<string, unknown> } | null> {
  const meta = POLICY_FAMILIES[family];
  if (!meta) return null;
  const controls = CMMC_L2_CONTROLS.filter((c) => c.family === family);
  const provider = activeReportProvider();

  const controlList = controls
    .map((c) => `${c.controlId} — ${c.title}${c.guidance ? ` :: ${c.guidance.slice(0, 300)}` : ''}`)
    .join('\n');

  const gen = await generateNarrative({
    system: `You are a DoD compliance officer drafting a formal, government-standard organizational security policy for a small defense contractor. Write the "${meta.policyTitle}" covering the ${meta.name} family of NIST SP 800-171 Rev. 2 / CMMC Level 2. Structure with these markdown sections exactly: "## 1. Purpose", "## 2. Scope", "## 3. Policy" (numbered, specific, enforceable statements grounded in the described stack and mapped to the listed controls), "## 4. Roles & Responsibilities", "## 5. Enforcement", "## 6. Review". Precise, factual, present tense. Do NOT invent tools or evidence beyond the described stack. Where a control is satisfied by PreVeil or Wazuh, say so specifically. Keep it tight and real for a 2-person home-office shop — no boilerplate padding.`,
    user: `Organization context:\n${MYCOSOFT_CONTEXT}\n\nControls this policy must cover (${controls.length}):\n${controlList}\n\nDraft the ${meta.policyTitle}.`,
    maxTokens: 2200,
    reasoning: false,
  });

  const bodyHtml = gen
    ? renderProse(gen.text)
    : renderProse(`## 1. Purpose\nThis ${meta.policyTitle} establishes how ${ORG.legalName} satisfies the ${meta.name} requirements of NIST SP 800-171 Rev. 2 for the protection of CUI.\n\n## 2. Scope\n${MYCOSOFT_CONTEXT}\n\n## 3. Policy\n${controls.map((c) => `- **${c.controlId}** — ${c.title}.`).join('\n')}\n\n*(No LLM configured — set PERPLEXITY_API_KEY for a fully-authored draft.)*`);

  const doc: ReportDocument = {
    classification: 'CUI',
    title: meta.policyTitle,
    subtitle: `${meta.name} · NIST SP 800-171 Rev. 2 · CMMC Level 2 · ${controls.length} controls`,
    org: ORG,
    docControl: docControl(family),
    sections: [
      { id: 'policy', heading: meta.policyTitle, bodyHtml },
      {
        id: 'controls', heading: 'Applicable controls',
        bodyHtml: renderTable(['Control', 'Title', 'Weight'], controls.map((c) => [c.controlId, c.title, c.weightMax === null ? 'NA' : `${c.weightMax}pt`])),
      },
    ],
    affirmation: affirm(meta.policyTitle),
    generatedBy: provider ? `MYCA Reports Agent · ${provider.provider} ${provider.model}` : 'MYCA Reports Agent · data-only',
  };
  return { html: renderReportHtml(doc), meta: { kind: `policy:${family}`, family, controls: controls.length, llmUsed: Boolean(gen), provider: provider?.provider ?? null } };
}

async function buildAuthoredDoc(
  kind: string, title: string, subtitle: string, system: string, user: string, numSuffix: string, fallback: string, affirmText?: string
): Promise<{ html: string; meta: Record<string, unknown> }> {
  const provider = activeReportProvider();
  const gen = await generateNarrative({ system, user, maxTokens: 1600 });
  const bodyHtml = gen ? renderProse(gen.text) : renderProse(fallback);
  const doc: ReportDocument = {
    classification: 'CUI', title, subtitle, org: ORG, docControl: docControl(numSuffix),
    sections: [{ id: 'body', heading: title, bodyHtml }],
    affirmation: affirmText,
    generatedBy: provider ? `MYCA Reports Agent · ${provider.provider} ${provider.model}` : 'MYCA Reports Agent · data-only',
  };
  return { html: renderReportHtml(doc), meta: { kind, llmUsed: Boolean(gen), provider: provider?.provider ?? null } };
}

export async function buildSupportingDoc(kind: string): Promise<{ html: string; meta: Record<string, unknown> } | null> {
  switch (kind) {
    case 'ir-runbook':
      return buildAuthoredDoc('ir-runbook', 'Incident Response Runbook', 'IR.L2-3.6.1/.2/.3 · DFARS 252.204-7012 72-hour reporting',
        'You are a DoD compliance officer writing an Incident Response Runbook for a 2-person defense contractor. Include: detection sources, roles (Morgan=IR lead, RJ=support), severity classification, the response lifecycle (preparation, detection, analysis, containment, eradication, recovery, post-incident), the DFARS 252.204-7012 72-hour reporting procedure to DIBNet (dibnet.dod.mil, medium-assurance certificate required), three tabletop scenarios (phishing→CUI exfil, ransomware on endpoint, lost laptop), and evidence retention. Government-standard, concrete, present tense. Use markdown headings.',
        `${MYCOSOFT_CONTEXT}\n\nDraft the Incident Response Runbook.`,
        'IR', 'Incident Response Runbook — detection, roles, response lifecycle, DIBNet 72-hour reporting, tabletop scenarios. (Set PERPLEXITY_API_KEY for full draft.)',
        affirm('Incident Response Runbook'));
    case 'access-agreement':
      return buildAuthoredDoc('access-agreement', 'Access to Federal Contract Information / CUI — Acknowledgment', 'PS.L2-3.9.2 · to be signed by each CUI handler',
        'You are a DoD compliance officer drafting a one-page "Access to Federal Contract Information and Controlled Unclassified Information — Acknowledgment and Agreement" for an employee of a small defense contractor to sign. Include: acknowledgment of CUI handling obligations under 32 CFR Part 2002 and DFARS 252.204-7012, use only within the PreVeil enclave, non-disclosure, reporting of incidents, return/destruction on separation, and a signature block (name, role, date). Concise, formal, one page. Markdown.',
        `${MYCOSOFT_CONTEXT}\n\nDraft the access agreement for RJ Ricasata (Engineering, secondary CUI handler) and a generic version.`,
        'PS9', 'Access to Federal Contract Information / CUI — Acknowledgment. Signature block for RJ Ricasata. (Set PERPLEXITY_API_KEY for full draft.)');
    case 'physical-access':
      return buildAuthoredDoc('physical-access', 'Physical Access Authorization Record', 'PE.L2-3.10.1/.10.2/.10.3 · home-office CUI workstation area',
        'You are a DoD compliance officer drafting a Physical Access Authorization Record for a 2-person home-office defense contractor. Include: the defined CUI workstation area, the list of individuals authorized physical access (Morgan Rockcoons, RJ Ricasata), the visitor rule ("No visitors in the CUI workstation area; any visitor is escorted and logged"), device lock-when-unattended requirement, and a maintenance/review note. Concise, formal. Markdown.',
        `${MYCOSOFT_CONTEXT}\n\nDraft the Physical Access Authorization Record.`,
        'PE', 'Physical Access Authorization Record — authorized individuals, visitor rule, device security. (Set PERPLEXITY_API_KEY for full draft.)',
        affirm('Physical Access Authorization Record'));
    case 'visitor-log':
      return {
        ...(await (async () => {
          const provider = activeReportProvider();
          const doc: ReportDocument = {
            classification: 'CUI', title: 'Visitor & Physical Access Log', subtitle: 'PE.L2-3.10.4/.10.5 · maintain a record of physical access', org: ORG, docControl: docControl('PE5'),
            sections: [
              { id: 'inst', heading: 'Instructions', bodyHtml: renderProse('Record every visitor to, and every physical-access event in, the CUI workstation area. Retain for at least one year in PreVeil. No visitors are permitted in the CUI workstation area without escort by an authorized individual.') },
              { id: 'log', heading: 'Log', bodyHtml: renderTable(['Date', 'Name', 'Organization', 'Purpose', 'Time in', 'Time out', 'Escort (authorized individual)'], Array.from({ length: 15 }, () => ['', '', '', '', '', '', ''])) },
            ],
            generatedBy: provider ? `MYCA Reports Agent · ${provider.provider} ${provider.model}` : 'MYCA Reports Agent',
          };
          return { html: renderReportHtml(doc), meta: { kind: 'visitor-log', llmUsed: false, provider: provider?.provider ?? null } };
        })()),
      };
    default:
      return null;
  }
}
