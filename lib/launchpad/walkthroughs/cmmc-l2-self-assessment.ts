import type { WalkthroughDef } from './types';

/**
 * Walkthrough: running a CMMC Level 2 SELF-assessment honestly, end to end.
 *
 * Vocabulary is deliberate throughout: statuses are "customer-marked", scores
 * are estimates the customer computes, and the SPRS posting is done by a human
 * at the customer — Launchpad never files anything and never asserts that any
 * company "is compliant". AI never marks a requirement implemented.
 */
export const CMMC_L2_SELF_ASSESSMENT: WalkthroughDef = {
  id: 'cmmc-l2-self-assessment',
  title: 'CMMC Level 2 self-assessment',
  tagline: 'Scope, mark, evidence, score, and post — the honest path through a Level 2 self-assessment.',
  audience: 'Teams pursuing CMMC Level 2 (Self-Assessment) who want a defensible result, not a pretty one.',
  intro: {
    what:
      'CMMC (Cybersecurity Maturity Model Certification) is the DoD program that verifies contractors protect CUI. ' +
      'At Level 2, many contracts allow a self-assessment: you assess your own environment against the 110 NIST SP 800-171 ' +
      'requirements, post the resulting score to SPRS, and affirm it annually. This walkthrough is that process, in order.',
    why:
      'A self-assessment is a formal representation to the government. Done honestly, it is a work plan you can defend; ' +
      'inflated, it is a false claim with contract and legal consequences. Every step here is built around marking only what is true.',
    next:
      'Start at scoping. Each step feeds the next, and the final two steps — posting to SPRS and the annual affirmation — are always performed by a human at your company.',
  },
  steps: [
    {
      id: 'assessment-scope',
      title: 'Scope the assessment',
      what:
        'Define exactly which systems, services, and people are inside the assessment boundary — where CUI ' +
        '(Controlled Unclassified Information — unclassified information the government requires you to protect) ' +
        'would be stored, processed, or transmitted. Everything inside gets assessed; everything outside must be genuinely separated.',
      why:
        'Scope is the first thing any assessor or prime challenges. An unclear boundary means every laptop and SaaS ' +
        'account you own is arguably in scope — small companies survive this by scoping deliberately and documenting the separation.',
      actions: [
        {
          text: 'Open Scope and write the boundary: in-scope devices, cloud services, people, and data flows.',
          link: { label: 'Open Scope', href: '/app/launchpad/readiness/scope' },
        },
        { text: 'Describe systems in plain language — never paste CUI, credentials, or raw logs into this workspace.' },
        { text: 'Note what is deliberately OUT of scope and what separates it (different accounts, no CUI path). You will reuse this text in the SSP.' },
      ],
      terms: [
        { term: 'CMMC', definition: 'Cybersecurity Maturity Model Certification — the DoD program (32 CFR Part 170) for verifying contractor cybersecurity. Level 2 maps to the 110 NIST SP 800-171 requirements.' },
        { term: 'CUI', definition: 'Controlled Unclassified Information — unclassified information requiring safeguarding under 32 CFR Part 2002. It lives only in your approved systems, never in this workspace.' },
      ],
      official: { label: '32 CFR Part 170 — the CMMC rule (eCFR)', href: 'https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-170', external: true },
    },
    {
      id: 'requirements-pass-1',
      title: 'Requirements pass 1 — mark honestly',
      what:
        'Go through all 110 NIST SP 800-171 requirements and set an honest state on each: Not started, In progress, ' +
        'Customer-marked implemented, or Not applicable. “Customer-marked implemented” is the strongest state this product ' +
        'ever records — it is your statement, not a certification, and AI never sets it for you.',
      why:
        'This register is the factual core of the whole assessment. Every downstream number and document derives from it, ' +
        'and an assessor’s first move is to pick a requirement you marked implemented and ask to see it work.',
      actions: [
        {
          text: 'Work the register family by family. Mark a requirement implemented only if you could demonstrate it to a stranger today.',
          link: { label: 'Open Requirements', href: '/app/launchpad/readiness/controls' },
        },
        { text: 'Record a written rationale for every Not applicable — “we have no wireless” is a rationale; silence is not.' },
        { text: 'Do not rush this pass. Two honest hours here save two dishonest weeks later.' },
      ],
      official: { label: 'NIST SP 800-171 Rev 2 (official publication)', href: 'https://csrc.nist.gov/pubs/sp/800/171/r2/upd1/final', external: true },
    },
    {
      id: 'tier1-operator-controls',
      title: 'Record Tier-1 operator controls',
      what:
        'Some requirements are proven by people, not scanners: security training completions, personnel screening, ' +
        'an incident-response tabletop exercise (a talk-through rehearsal of an incident), and DIBNet reporting readiness. ' +
        'The Tier-1 screen records these human-entered facts with a person, a date, and an artifact reference.',
      why:
        'These operator controls are exactly what small companies skip and assessors check first. A dated record with a named ' +
        'person and a pointer to the artifact is the difference between “we do training” and proof.',
      actions: [
        {
          text: 'Open Tier-1 and record each completed item: who, when, and a reference to where the artifact lives in your systems.',
          link: { label: 'Open Tier-1 Turnkey', href: '/app/launchpad/readiness/tier1' },
        },
        { text: 'If an item has not happened yet, leave it empty — an honest gap here becomes a POA&M line, a fabricated record becomes a finding.' },
      ],
      terms: [
        { term: 'Tabletop exercise', definition: 'A scheduled talk-through of an incident scenario (“laptop stolen — now what?”) that exercises your response plan without touching production.' },
        { term: 'DIBNet', definition: 'The DoD portal where contractors report qualifying cyber incidents under DFARS 252.204-7012 — within 72 hours. A human at your company files; readiness means knowing who and how.' },
      ],
      official: { label: 'DIBNet (official DoD portal)', href: 'https://dibnet.dod.mil/', external: true },
    },
    {
      id: 'evidence-indexing',
      title: 'Index evidence for what you marked',
      what:
        'For each requirement you marked implemented, index at least one piece of evidence: title, requirement IDs it covers, ' +
        'where the content lives, and a SHA-256 hash (a file fingerprint computed in your browser). ' +
        'The evidence content itself stays in your systems — Launchpad has no upload path by design.',
      why:
        'Evidence coverage is what makes your register defensible. It also feeds the evidence-completeness indicator, ' +
        'so you can see at a glance which implemented marks are still just assertions.',
      actions: [
        {
          text: 'Open Evidence and index artifacts for your implemented requirements — policies, configuration exports, screenshots.',
          link: { label: 'Open Evidence', href: '/app/launchpad/evidence' },
        },
        { text: 'Name the authoritative system for each item (your drive, wiki, or enclave) so anyone can find the content later.' },
        { text: 'Re-index when an artifact changes materially — the hash pins the exact version you assessed against.' },
      ],
    },
    {
      id: 'compute-score',
      title: 'Compute the score',
      what:
        'The Score screen applies the DoD Assessment Methodology to your register: start from 110, subtract the weight ' +
        '(5, 3, or 1 point) of every requirement not yet implemented. The range runs from −203 to +110, and the output is ' +
        'a weighted score estimate — your number, computed from your own marks.',
      why:
        'This is the number DFARS clauses expect in SPRS and the number primes ask about. Because it derives entirely from ' +
        'your register, it is only as honest as pass 1 — which is why the register came first.',
      actions: [
        {
          text: 'Compute the score and read the gate panel: the 88-point conditional threshold and which gaps are eligible for a POA&M.',
          link: { label: 'Open Score', href: '/app/launchpad/readiness/score' },
        },
        { text: 'Screenshot or export the result for your records with today’s date — the posting step will ask when the assessment was completed.' },
      ],
      terms: [
        { term: 'DoD Assessment Methodology', definition: 'The published method for scoring a NIST SP 800-171 assessment: 110 max, minus 5/3/1-point weights per unmet requirement, floor −203.' },
      ],
    },
    {
      id: 'poam-eligible-gaps',
      title: 'Open POA&M items for eligible gaps',
      what:
        'A POA&M (Plan of Action and Milestones — a dated to-do list for closing security gaps) is allowed for SOME requirements ' +
        'under CMMC Level 2. Highly-weighted requirements are generally not POA&M-eligible, your score must be at least 88 ' +
        '(80% of 110) for a conditional self-assessment status, and every POA&M item must close within 180 days.',
      why:
        'The 180-day clock and the eligibility rules are hard limits from the CMMC rule, not preferences. Opening a POA&M on an ' +
        'ineligible requirement, or letting one age past 180 days, invalidates the conditional status you were counting on.',
      actions: [
        {
          text: 'Open POA&M and review which of your gaps the rule pack marks eligible — the eligibility is deterministic, not an AI judgment.',
          link: { label: 'Open POA&M', href: '/app/launchpad/readiness/poam' },
        },
        { text: 'Give every item an owner and a realistic milestone date inside the 180-day window.' },
        { text: 'Ineligible gaps have no shortcut: they must be implemented before a conditional status is claimable at all.' },
      ],
      terms: [
        { term: 'POA&M', definition: 'Plan of Action and Milestones — the formal, dated plan for closing known gaps. Under CMMC L2 it is limited to eligible requirements and a 180-day closeout.' },
      ],
    },
    {
      id: 'closure-waves',
      title: 'Work the closure waves',
      what:
        'The Closure board organizes your open gaps into waves — ordered batches of related fixes — so remediation runs like ' +
        'a project instead of a pile. Each wave pulls from your own register states and POA&M items.',
      why:
        'Gap lists fail as flat lists. Sequencing them (quick wins first, dependencies respected, 180-day items prioritized) ' +
        'is how a two-person company actually finishes.',
      actions: [
        {
          text: 'Open Closure and review the proposed waves against your team’s reality — reorder where you know better.',
          link: { label: 'Open Closure', href: '/app/launchpad/readiness/closure' },
        },
        { text: 'As work completes, update the requirement state in the register and index the new evidence — the wave board reads from the same truth.' },
      ],
    },
    {
      id: 'ssp-draft',
      title: 'Draft the SSP',
      what:
        'The SSP (System Security Plan) is the document that describes your boundary, your systems, and how each requirement is met. ' +
        'It is itself required by requirement 3.12.4 — no SSP, no valid assessment. Launchpad drafts it from your scope and register, ' +
        'always labelled DRAFT with placeholders where only you know the answer.',
      why:
        'The SSP is the first document a prime, an assessor, or a contracting officer asks for. A generated draft saves you the ' +
        'blank page; the review — checking every statement against reality — is unavoidably yours.',
      actions: [
        {
          text: 'Generate the SSP draft from your current scope and register.',
          link: { label: 'Open SSP', href: '/app/launchpad/readiness/ssp' },
        },
        { text: 'Review every section and resolve every placeholder. The DRAFT label comes off only by your explicit human approval, never automatically.' },
      ],
      terms: [
        { term: 'SSP', definition: 'System Security Plan — the master document describing your environment and how each of the 110 requirements is addressed. Required by NIST SP 800-171 requirement 3.12.4.' },
      ],
    },
    {
      id: 'reports',
      title: 'Assemble the reports',
      what:
        'The Reports screen assembles your assessment package: score summary, register snapshot, POA&M, and evidence coverage — ' +
        'as dated, exportable documents that reflect exactly what your workspace records say.',
      why:
        'When a prime or contracting officer asks “show me your posture”, you answer with a dated package instead of a scramble. ' +
        'Dated snapshots are also your before/after record as gaps close.',
      actions: [
        {
          text: 'Generate the report set and store a copy in your own document system alongside the evidence.',
          link: { label: 'Open Reports', href: '/app/launchpad/readiness/reports' },
        },
        { text: 'Check the honesty of the language before sharing: everything should read “customer-marked” and “estimate” — if a sentence claims more, stop and fix the source data.' },
      ],
    },
    {
      id: 'sprs-posting',
      title: 'Post the score to SPRS — a human does this',
      what:
        'A person at your company posts the self-assessment to SPRS (Supplier Performance Risk System). Access runs through PIEE ' +
        '(Procurement Integrated Enterprise Environment — the DoD portal platform): register in PIEE, request the SPRS “Cyber Vendor” role, ' +
        'then enter your score, assessment date, scope description, and the date you expect a perfect 110.',
      why:
        'Launchpad never submits to a government system on your behalf — this posting is a formal representation your company makes. ' +
        'DFARS 252.204-7019/7020 require the score in SPRS before CUI-handling awards.',
      actions: [
        {
          text: 'Register at PIEE and request the SPRS Cyber Vendor role for the person who will post (this can take a few days to approve).',
          link: { label: 'PIEE (official DoD portal)', href: 'https://piee.eb.mil/', external: true },
        },
        { text: 'In SPRS, enter: your weighted score, the assessment completion date, the scope of the assessment, and the plan-of-action completion date.' },
        {
          text: 'Record in Tasks who posted, when, and when re-posting is due — a self-assessment score is valid for three years, but the affirmation (next step) is annual.',
          link: { label: 'Open Tasks & deadlines', href: '/app/launchpad/tasks' },
        },
      ],
      official: { label: 'SPRS (official DoD site)', href: 'https://www.sprs.csd.disa.mil/', external: true },
      terms: [
        { term: 'PIEE', definition: 'Procurement Integrated Enterprise Environment — the DoD portal platform that hosts SPRS access (and invoicing via WAWF). Your SPRS login is a PIEE account with the right role.' },
      ],
    },
    {
      id: 'retention-affirmation',
      title: 'Retain for six years, affirm annually',
      what:
        'The CMMC rule requires you to retain the artifacts supporting your assessment for six years, and requires a senior ' +
        'company official — the Affirming Official — to affirm continued compliance with the requirements annually in SPRS.',
      why:
        'The assessment is not a one-time event. A missed annual affirmation lapses your CMMC status, and missing artifacts ' +
        'six years from now turns a routine records request into a crisis.',
      actions: [
        { text: 'Name your Affirming Official — a senior official with authority to bind the company — and write it down.' },
        {
          text: 'Create recurring tasks: annual affirmation in SPRS, annual register re-review, and a yearly evidence-retention check.',
          link: { label: 'Open Tasks & deadlines', href: '/app/launchpad/tasks' },
        },
        {
          text: 'Keep the evidence index current — it is your six-year retention catalog, pointing at where every artifact lives in your systems.',
          link: { label: 'Open Evidence', href: '/app/launchpad/evidence' },
        },
      ],
      terms: [
        { term: 'Affirming Official', definition: 'The senior company official who annually affirms in SPRS that the company continues to meet the requirements. This is a named human accountability, not a system action.' },
      ],
    },
  ],
};
