// ═══════════════════════════════════════════════════════════════════════════
// Security / compliance report builder (real data + LLM narrative)
// ═══════════════════════════════════════════════════════════════════════════
//
// Assembles the ACTUAL compliance data (SPRS score, control posture, POA&M,
// supply-chain BAA) and produces a government-standard ReportDocument. The LLM
// (MYCA reports agent) authors the executive summary from the real numbers; if
// no model is configured the report still generates from the data (deterministic
// summary) — it is never filler.

import { computeSprs, determineCmmcStatus } from '@/lib/security/reference/sprs';
import { postureSummary } from '@/lib/security/posture/nist-800-171-posture';
import { SPRS_MATH, POAM_RULES, VERIFICATION_FLAGS, CMMC_L2_CONTROLS } from '@/lib/security/reference/cmmc-l2-reference';
import { CMMC_SPRINT_META } from '@/lib/security/posture/sprint-meta';
import { MYCOSOFT_DEVICE_BOMS, checkDeviceBom } from '@/lib/security/supply-chain/bom-check';
import { generateNarrative, activeReportProvider } from './llm';
import { renderReportHtml, renderTable, renderProse, esc, type ReportDocument } from './report-doc';

export type SecurityReportType = 'cmmc-l2' | 'sprs' | 'poam' | 'supply-chain' | 'compliance-snapshot';

const ORG = {
  legalName: 'Mycosoft, LLC',
  parent: 'Mycosoft, Inc. (Delaware C-Corp)',
  uei: 'YK3ARVKJ77S9',
  cage: '9KR60',
  sao: 'Morgan Rockcoons',
  site: '451 Acero Pl, Chula Vista, CA 91910',
};

const REPORT_TITLES: Record<SecurityReportType, string> = {
  'cmmc-l2': 'CMMC Level 2 Self-Assessment Report',
  sprs: 'SPRS Score Report (NIST SP 800-171)',
  poam: 'Plan of Action & Milestones (POA&M)',
  'supply-chain': 'Supply-Chain & Made-in-America Compliance Report',
  'compliance-snapshot': 'Compliance Snapshot',
};

function assemble() {
  const cur = computeSprs('current');
  const tgt = computeSprs('target');
  const status = determineCmmcStatus(cur);
  const sumCur = postureSummary('current');
  const poamItem = CMMC_L2_CONTROLS.find((c) => c.controlId === 'AU.L2-3.3.4');
  const psath = checkDeviceBom(MYCOSOFT_DEVICE_BOMS.find((d) => d.deviceId === 'psathyrella-buoy')!);
  return { cur, tgt, status, sumCur, poamItem, psath };
}

async function execSummary(d: ReturnType<typeof assemble>): Promise<{ html: string; llm: boolean }> {
  const facts = [
    `Framework: CMMC Level 2 / NIST SP 800-171 Rev. 2 (110 requirements), self-assessment.`,
    `Current SPRS score: ${d.cur.score} of ${d.cur.maxScore} (${d.cur.met} met, ${d.cur.notMet} not met). Conditional threshold ${d.cur.conditionalThreshold}.`,
    `Projected post-sprint score: ${d.tgt.score} (${d.tgt.met}/${d.tgt.maxScore} met), target SPRS submission ${CMMC_SPRINT_META.targetSprsSubmissionDate}.`,
    `Current CMMC status eligibility: ${d.status.eligibility.replace('-', ' ')} — ${d.status.reason}`,
    `One control planned for the POA&M: AU.L2-3.3.4 (audit-failure alerting), close ${CMMC_SPRINT_META.poamCloseDeadline}.`,
    `Supply-chain (Psathyrella buoy, TAC-O): ${d.psath.baa?.asOrderedDomesticPct}% domestic content as-ordered (FAR 25.101 floor 65%), ${d.psath.swapNeeded.length} items to swap to US-made, ${d.psath.specialtyMetalRisks.length} specialty-metal items requiring DFARS 252.225-7009 certs.`,
  ].join('\n');

  const gen = await generateNarrative({
    // Per Perplexity's hard rule: the LLM writes framing prose only — it must
    // never invent a control status, score, weight, date, or determination.
    system: 'You are a DoD compliance officer writing the executive summary of a formal CMMC Level 2 self-assessment report for a small defense contractor. Write in precise, factual, government-standard prose, 2–3 short paragraphs, no headings. HARD RULE: never state or invent any control status, SPRS score, weight, date, eligibility, or compliance determination that is not present verbatim in the provided facts. Every number and status comes from the facts; you write only the connective prose around them.',
    user: `Write the executive summary using ONLY these facts. Do not add any number or status not listed here:\n\n${facts}`,
    maxTokens: 700,
  });
  if (gen) return { html: renderProse(gen.text), llm: true };

  // Deterministic fallback — still real, from the data.
  const fallback =
    `As of ${new Date().toISOString().slice(0, 10)}, ${ORG.legalName} has completed a self-assessment against the 110 NIST SP 800-171 Rev. 2 security requirements that comprise CMMC Level 2. The current SPRS score is ${d.cur.score} of ${d.cur.maxScore} (${d.cur.met} requirements met), against a conditional-eligibility threshold of ${d.cur.conditionalThreshold}. The organization is executing a self-assessment sprint targeting a score of ${d.tgt.score} and SPRS submission on ${CMMC_SPRINT_META.targetSprsSubmissionDate}; one 1-point requirement (AU.L2-3.3.4) is planned for the Plan of Action & Milestones with a close date of ${CMMC_SPRINT_META.poamCloseDeadline}.\n\n` +
    `Current status: ${d.status.reason}\n\n` +
    `On the supply-chain axis, the flagship Psathyrella maritime buoy (NUWC TAC-O Phase 2) currently measures ${d.psath.baa?.asOrderedDomesticPct}% domestic component content — below the FAR 25.101 65% floor — with ${d.psath.swapNeeded.length} components identified for substitution to US-made alternates (raising domestic content to approximately ${d.psath.baa?.postSwapDomesticPct}%) and ${d.psath.specialtyMetalRisks.length} specialty-metal items requiring DFARS 252.225-7009 mill certification before delivery.`;
  return { html: renderProse(fallback), llm: false };
}

export async function buildSecurityReport(reportType: SecurityReportType): Promise<{ html: string; meta: Record<string, unknown> }> {
  const d = assemble();
  const provider = activeReportProvider();
  const exec = await execSummary(d);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const sections: ReportDocument['sections'] = [];

  sections.push({ id: 'exec', heading: 'Executive Summary', bodyHtml: exec.html });

  // SPRS posture
  sections.push({
    id: 'sprs', heading: 'SPRS Score & Assessment Posture',
    bodyHtml:
      renderTable(
        ['Metric', 'Current', 'Projected (post-sprint)'],
        [
          ['SPRS score', d.cur.score, d.tgt.score],
          ['Requirements met', `${d.cur.met}/110`, `${d.tgt.met}/110`],
          ['Requirements not met', d.cur.notMet, d.tgt.notMet],
          ['Conditional threshold', d.cur.conditionalThreshold, d.cur.conditionalThreshold],
          ['Meets threshold', d.cur.meetsConditionalThreshold ? 'Yes' : 'No', d.tgt.meetsConditionalThreshold ? 'Yes' : 'No'],
        ]
      ) +
      `<div class="callout"><strong>CMMC status (current):</strong> ${esc(d.status.reason)}</div>` +
      `<p style="font-size:9pt;color:#555">Scoring per NIST SP 800-171 DoD Assessment Methodology v1.2.1 (Annex A) and 32 CFR §170.24. Weight distribution: ${esc(SPRS_MATH.distribution)}. Minimum possible ${SPRS_MATH.minScore}.</p>`,
  });

  // POA&M
  const poamRows: (string | number)[][] = [
    ['POAM-001', 'AU.L2-3.3.4', 'Alert on audit-logging process failure', 'Deploy Wazuh SIEM audit-failure alerting; soak', ORG.sao ?? '', CMMC_SPRINT_META.poamCloseDeadline, 'Planned'],
  ];
  sections.push({
    id: 'poam', heading: 'Plan of Action & Milestones (POA&M)',
    bodyHtml:
      renderTable(['POA&M ID', 'Control', 'Weakness', 'Remediation', 'Owner', 'Target close', 'Status'], poamRows) +
      `<p>Per 32 CFR §170.21, only 1-point requirements are POA&amp;M-eligible; POA&amp;M items must close within ${POAM_RULES.closeWindowDays} days of the Conditional status date. The following non-POA&amp;M-eligible gaps must be remediated before assessment (resolved during the sprint): IR.L2-3.6.3 (IR test), PS.L2-3.9.1 (personnel screening), SI.L2-3.14.6 (system monitoring / Wazuh).</p>`,
  });

  // Supply chain
  const baa = d.psath.baa!;
  sections.push({
    id: 'supply', heading: 'Supply-Chain & Made-in-America Compliance',
    bodyHtml:
      `<p>Flagship platform: Psathyrella autonomous maritime buoy (NUWC TAC-O Phase 2, N66604-26-9-A00X). BOM screened against prohibited-source rules (Section 889 / §1260H / §5949 / drone) and Buy American Act domestic content.</p>` +
      renderTable(
        ['Metric', 'Value'],
        [
          ['Domestic content (as-ordered)', `${baa.asOrderedDomesticPct}% (floor ${baa.floorPct}%)`],
          ['Domestic content (post-swap)', `${baa.postSwapDomesticPct}%`],
          ['Items to swap to US-made', String(d.psath.swapNeeded.length)],
          ['Specialty-metal items (DFARS 7009)', String(d.psath.specialtyMetalRisks.length)],
          ['Prohibited-source matches', String(d.psath.counts.prohibited)],
        ]
      ) +
      (d.psath.swapNeeded.length
        ? `<p style="font-weight:bold;margin-top:10px">Required swaps before deliverable:</p>` +
          renderTable(['Part', 'Component', 'Current vendor / origin', 'US-made alternate'],
            d.psath.swapNeeded.map((l) => [l.partNumber ?? '', l.component, `${l.vendor} (${l.country ?? '—'})`, l.recommendedSwap ?? '—']))
        : ''),
  });

  // Verification items
  sections.push({
    id: 'verify', heading: 'Open Verification Items',
    bodyHtml:
      `<p>Items requiring confirmation against primary regulatory text before being treated as final. Weights and POA&amp;M rules are reconciled and verified; the following are the remaining open items.</p>` +
      renderTable(['Severity', 'Topic', 'Reconcile against'],
        VERIFICATION_FLAGS.map((f) => [f.severity.toUpperCase(), f.topic, f.reconcileAgainst])),
  });

  const doc: ReportDocument = {
    classification: 'CUI',
    title: REPORT_TITLES[reportType],
    subtitle: 'NIST SP 800-171 Rev. 2 · CMMC Level 2 · DFARS 252.204-7012 / -7019 / -7020 / -7021',
    org: ORG,
    docControl: {
      number: `MYC-SEC-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
      date: dateStr,
      version: '1.0',
      distribution: 'DISTRIBUTION D. Distribution authorized to DoD and U.S. DoD contractors only. Handle as CUI.',
      preparedBy: 'MYCA Reports Agent',
    },
    sections,
    affirmation:
      'I affirm that the information in this report accurately reflects the current implementation status of the security requirements for the covered contractor information system, and that the organization is committed to continuing compliance with CMMC Program requirements (DFARS 252.204-7021).',
    generatedBy: provider ? `MYCA Reports Agent · ${provider.provider} ${provider.model}` : 'MYCA Reports Agent · data-only (no LLM provider configured)',
  };

  return {
    html: renderReportHtml(doc),
    meta: {
      reportType,
      llmUsed: exec.llm,
      provider: provider?.provider ?? null,
      model: provider?.model ?? null,
      sprsCurrent: d.cur.score,
      sprsTarget: d.tgt.score,
      generatedAt: now.toISOString(),
    },
  };
}
