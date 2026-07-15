#!/usr/bin/env node
/**
 * CMMC L2 automated verification harness.
 *
 * Drives all 110 NIST 800-171 Rev.2 controls from the hydrated reference JSON and,
 * for each, determines HOW its evidence is collected, WHO owns it, WHAT is blocking
 * it, and whether a real evidence artifact exists yet. It produces:
 *   - docs/cmmc_l2/verification/plan.json     — the full 110-control verification plan
 *   - docs/cmmc_l2/verification/status.md     — human-readable status + tallies
 *   - docs/cmmc_l2/verification/soc_ops-updates.sql — soc_ops flips, ONLY for evidenced controls
 *
 * HONESTY GATE (non-negotiable): a control is only reported `met` — and only emitted
 * into the SQL — when a real evidence artifact for it is found on disk. No evidence =>
 * never `met`. This mirrors the compliance page's evidence-gated posture and keeps the
 * self-assessment defensible under DFARS 252.204-7020 / the False Claims Act.
 *
 * Evidence detection: set CMMC_EVIDENCE_DIR to the evidence tree (default ./evidence).
 * A control is "evidenced" if a file whose name contains its numeric id (e.g. "3.1.8")
 * or full id ("AC.L2-3.1.8") exists anywhere under that tree, OR (for doc controls) the
 * named policy/SSP/POA&M artifact exists.
 *
 * Usage:  node scripts/cmmc/verify-controls.mjs [--evidence <dir>] [--emit-sql]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');
const CONTROLS = JSON.parse(readFileSync(join(REPO, 'lib/security/reference/cmmc-l2-controls.json'), 'utf8')).controls;
const OUT = join(REPO, 'docs/cmmc_l2/verification');

const argEvidence = (() => { const i = process.argv.indexOf('--evidence'); return i > -1 ? process.argv[i + 1] : null; })();
const EVIDENCE_DIR = argEvidence || process.env.CMMC_EVIDENCE_DIR || join(REPO, 'evidence');

// ---- collector taxonomy ----
// automatable: a machine can gather + verify this now (given creds/systems). owner runs it.
// blocked: cannot be evidenced until a prerequisite exists (hardware / PreVeil / a human act).
const B = {
  ENDPOINT: 'blocked:no-cmmc-laptop',       // the two Win11 CUI laptops do not exist yet
  PREVEIL: 'blocked:preveil-not-provisioned',
  AGENTS: 'blocked:wazuh-agents-need-endpoints',
  PHYSICAL: 'operator:physical-home-office',
  HUMAN_TRAIN: 'operator:cdse-training-cert',
  HUMAN_BG: 'operator:background-check',
  HUMAN_TT: 'operator:ir-tabletop',
  SIGN: 'operator:sign-policy',
  NONE: 'ready:collect-now',
};

// Per-family default: { collector, owner, blocker, evidence } — evidence = subdir under EVIDENCE_DIR.
const FAMILY = {
  AC: { collector: 'endpoint-powershell + preveil-console', owner: 'cursor', blocker: B.ENDPOINT, evidence: 'ac' },
  AT: { collector: 'cdse-completion-certificate', owner: 'morgan', blocker: B.HUMAN_TRAIN, evidence: 'at' },
  AU: { collector: 'wazuh + preveil-audit-log', owner: 'cursor', blocker: B.AGENTS, evidence: 'au' },
  CA: { collector: 'ssp/poam/self-assessment artifacts', owner: 'myca', blocker: B.NONE, evidence: 'ca' },
  CM: { collector: 'endpoint-baseline + repo-config', owner: 'cursor', blocker: B.ENDPOINT, evidence: 'cm' },
  IA: { collector: 'preveil-mfa + endpoint-password-policy', owner: 'cursor', blocker: B.PREVEIL, evidence: 'ia' },
  IR: { collector: 'ir-plan + tabletop-report', owner: 'morgan', blocker: B.HUMAN_TT, evidence: 'ir' },
  MA: { collector: 'maintenance-policy + remote-maint-controls', owner: 'morgan', blocker: B.SIGN, evidence: 'ma' },
  MP: { collector: 'preveil-media + physical-disposal', owner: 'cursor', blocker: B.PREVEIL, evidence: 'mp' },
  PE: { collector: 'physical-access + visitor-log', owner: 'morgan', blocker: B.PHYSICAL, evidence: 'pe' },
  PS: { collector: 'background-check + access-agreement', owner: 'morgan', blocker: B.HUMAN_BG, evidence: 'ps' },
  RA: { collector: 'risk-assessment + vuln-scan (audit/npm/advisors)', owner: 'myca', blocker: B.NONE, evidence: 'ra' },
  SC: { collector: 'preveil-crypto + network-fw + web-tls', owner: 'cursor', blocker: B.PREVEIL, evidence: 'sc' },
  SI: { collector: 'defender + wazuh + flaw-remediation-scan', owner: 'cursor', blocker: B.ENDPOINT, evidence: 'si' },
};

// Per-control overrides: controls that are auto-verifiable NOW (evidence machine-collectable
// without laptops/PreVeil), with the exact collector command. These are where the number can
// honestly start climbing today.
const OVERRIDE = {
  // Security Assessment — the SSP, POA&M, and THIS self-assessment/audit are the evidence.
  'CA.L2-3.12.1': { collector: 'self-assessment report (docs/audits + report engine cmmc-l2)', owner: 'myca', blocker: B.NONE, cmd: 'node scripts/... generate cmmc-l2 report -> evidence/ca/3.12.1_self_assessment.pdf' },
  'CA.L2-3.12.2': { collector: 'POA&M export (report engine poam)', owner: 'myca', blocker: B.NONE, cmd: 'POST /api/security/reports/generate {poam} -> evidence/ca/3.12.2_poam.pdf' },
  'CA.L2-3.12.3': { collector: 'continuous monitoring log (audit + supabase advisors + npm audit cadence)', owner: 'myca', blocker: B.NONE },
  'CA.L2-3.12.4': { collector: 'SSP document (report engine) — NA-weighted but must exist', owner: 'myca', blocker: B.NONE, cmd: 'report engine cmmc-l2 -> evidence/ca/3.12.4_ssp.pdf' },
  // Risk Assessment — the CUI security audit IS the risk assessment + vuln scan evidence.
  'RA.L2-3.11.1': { collector: 'risk assessment (docs/audits/2026-07-15-cui-security-audit)', owner: 'myca', blocker: B.NONE },
  'RA.L2-3.11.2': { collector: 'vuln scan: npm audit + gitleaks + supabase advisors', owner: 'cursor', blocker: B.NONE, cmd: 'npm audit --json + advisors -> evidence/ra/3.11.2_vuln_scan.json' },
  'RA.L2-3.11.3': { collector: 'remediation record (undici fix, key restrict, RLS drafts)', owner: 'cursor', blocker: B.NONE },
  // Repo/GitHub-side config — auto via gh API (Cursor with org access).
  'CM.L2-3.4.3': { collector: 'gh branch-protection + PR-review policy', owner: 'cursor', blocker: B.NONE, cmd: 'gh api /repos/MycosoftLabs/website/branches/main/protection -> evidence/cm/3.4.3_branch_protection.json' },
  'CM.L2-3.4.4': { collector: 'gh required-status-checks (CI) config', owner: 'cursor', blocker: B.NONE },
  // Web boundary/comms for the PUBLIC surface — auto via curl (already evidenced in audit).
  'SC.L2-3.13.15': { collector: 'web session authenticity: TLS/headers (curl -I mycosoft.com)', owner: 'cursor', blocker: B.NONE, cmd: 'curl -sI https://mycosoft.com -> evidence/sc/3.13.15_headers.txt' },
  // Flaw remediation on the app — npm audit + update cadence.
  'SI.L2-3.14.1': { collector: 'flaw remediation: npm audit fix + Dependabot', owner: 'cursor', blocker: B.NONE, cmd: 'npm audit --json -> evidence/si/3.14.1_flaw_remediation.json' },
  // Personnel security access agreement (RJ) — doc already generated, needs signature.
  'PS.L2-3.9.2': { collector: 'signed access agreement (RJ_Access_Agreement)', owner: 'morgan', blocker: B.SIGN, evidence: 'ps' },
  // The two 48hr laptop-independent Not-Met items — genuinely closable now.
  'IR.L2-3.6.3': { collector: 'documented tabletop report (signed SAO+CFO)', owner: 'morgan', blocker: B.HUMAN_TT, evidence: 'ir' },
  'PS.L2-3.9.1': { collector: 'Sterling/HireRight background check PDFs (Morgan+RJ)', owner: 'morgan', blocker: B.HUMAN_BG, evidence: 'ps' },
  // The single planned POA&M item + its SIEM twin — endpoint/agent gated.
  'AU.L2-3.3.4': { collector: 'wazuh audit-failure alert test (agents on endpoints)', owner: 'cursor', blocker: B.AGENTS, evidence: 'au' },
  'SI.L2-3.14.6': { collector: 'wazuh SIEM monitoring (agents + endpoint telemetry)', owner: 'cursor', blocker: B.AGENTS, evidence: 'si' },
};

// ---- evidence detection ----
function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
// Dev-PC artifacts are NEVER valid Met evidence (they are not an in-scope CUI endpoint).
const DEV_PC = 'desktop-jqr4tav';
const EVIDENCE_FILES = walk(EVIDENCE_DIR)
  .map((p) => p.toLowerCase())
  .filter((f) => !f.includes(DEV_PC));
function hasEvidence(control) {
  const num = control.control_id.split('-').pop(); // e.g. 3.1.8
  const full = control.control_id.toLowerCase();
  // Necessary-but-not-sufficient: a matching, non-dev-PC artifact must exist. Final Met
  // still requires human/assessor validation that the artifact demonstrates the control
  // (the runbook §"validation gate"). soc_ops flips are PROPOSED, not auto-applied.
  return EVIDENCE_FILES.some((f) => f.includes(`_${num}`) || f.includes(`/${num}_`) || f.includes(full));
}

// ---- build the plan ----
const plan = CONTROLS.map((c) => {
  const base = FAMILY[c.family] || { collector: 'manual', owner: 'morgan', blocker: B.NONE, evidence: c.family.toLowerCase() };
  const o = OVERRIDE[c.control_id] || {};
  const spec = { ...base, ...o };
  const evidenced = hasEvidence(c);
  let status;
  if (evidenced) status = 'met';
  else if (spec.blocker.startsWith('ready')) status = 'ready-collect-now';
  else if (spec.blocker.startsWith('operator')) status = 'operator-action-required';
  else status = 'blocked';
  return {
    control_id: c.control_id,
    nist: c.control_id.split('-').pop(),
    family: c.family,
    weight: c.weight,
    poam_eligible: c.poam_eligible,
    collector: spec.collector,
    command: spec.cmd || null,
    owner: spec.owner,
    blocker: spec.blocker,
    evidence_dir: `${EVIDENCE_DIR.replace(REPO + '\\', '').replace(REPO + '/', '')}/${spec.evidence || c.family.toLowerCase()}`,
    evidenced,
    status,
    // objectives the assessor checks (verbatim from the hydrated guide) — the pass criteria:
    assessment_objectives: c.assessment_objectives || [],
  };
});

// ---- tallies ----
const tally = plan.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
const byOwner = plan.reduce((a, p) => { a[p.owner] = (a[p.owner] || 0) + 1; return a; }, {});
const readyNow = plan.filter((p) => p.status === 'ready-collect-now');
const operatorNow = plan.filter((p) => p.status === 'operator-action-required');

// ---- emit ----
writeFileSync(join(OUT, 'plan.json'), JSON.stringify({ generated_from: 'lib/security/reference/cmmc-l2-controls.json (MD5 abca7ab1)', evidence_dir: EVIDENCE_DIR, tally, controls: plan }, null, 2));

const md = [
  `# CMMC L2 — Automated Verification Status`,
  ``,
  `Evidence dir: \`${EVIDENCE_DIR}\` ${existsSync(EVIDENCE_DIR) ? '' : '(does not exist yet — 0 evidenced, expected)'}`,
  ``,
  `## Tally (110 controls)`,
  ...Object.entries(tally).map(([k, v]) => `- **${k}**: ${v}`),
  `- by owner: ${Object.entries(byOwner).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
  ``,
  `## Ready to collect NOW (no hardware/PreVeil/human blocker) — start here`,
  ...readyNow.map((p) => `- \`${p.control_id}\` (${p.owner}) — ${p.collector}${p.command ? `  \`${p.command}\`` : ''}`),
  ``,
  `## One human action away (operator) — you + RJ`,
  ...operatorNow.map((p) => `- \`${p.control_id}\` — ${p.blocker.replace('operator:', '')} → ${p.collector}`),
  ``,
  `## Blocked (surfaced honestly — cannot be evidenced yet)`,
  ...['blocked:no-cmmc-laptop', 'blocked:preveil-not-provisioned', 'blocked:wazuh-agents-need-endpoints'].map((b) => {
    const ids = plan.filter((p) => p.blocker === b).map((p) => p.control_id);
    return `- **${b}** (${ids.length}): ${ids.join(', ')}`;
  }),
  ``,
  `> Honesty gate: a control shows \`met\` only when a real evidence file for it exists under the evidence dir. Currently **${tally.met || 0} met**. As Cursor/PreVeil/hardware drop artifacts into \`evidence/<family>/\`, re-run this script and the count climbs — truthfully.`,
].join('\n');
writeFileSync(join(OUT, 'status.md'), md);

// gated SQL — ONLY evidenced controls
const metRows = plan.filter((p) => p.status === 'met');
const sql = metRows.length
  ? metRows.map((p) => `UPDATE soc_ops.compliance_controls SET implementation_state='implemented', last_verified_at=NOW() WHERE control_id IN ('${p.nist}','${p.control_id}'); -- evidence in ${p.evidence_dir}`).join('\n')
  : `-- No controls are evidenced yet. Nothing to flip. This file stays empty until real artifacts exist.\n-- (Honesty gate working as intended.)`;
writeFileSync(join(OUT, 'soc_ops-updates.sql'), sql + '\n');

console.log(`Verified plan for ${plan.length} controls.`);
console.log(`Tally: ${JSON.stringify(tally)}`);
console.log(`Ready-now: ${readyNow.length} · Operator: ${operatorNow.length} · Met (evidenced): ${tally.met || 0}`);
console.log(`Wrote: docs/cmmc_l2/verification/{plan.json,status.md,soc_ops-updates.sql}`);
