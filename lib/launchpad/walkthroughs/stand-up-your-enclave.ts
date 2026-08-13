import type { WalkthroughDef } from './types';

/**
 * Walkthrough: standing up a CUI enclave. Education and pointers only — the
 * enclave itself lives entirely outside this workspace. Launchpad tracks
 * references and metadata about the enclave; CUI content, credentials, and
 * raw logs never enter it. No provider named here is endorsed or certified
 * by Mycosoft; selection is the customer's decision.
 */
export const STAND_UP_YOUR_ENCLAVE: WalkthroughDef = {
  id: 'stand-up-your-enclave',
  title: 'Stand up your enclave',
  tagline: 'Decide if CUI is coming, pick a boundary strategy, and build the protected environment — honestly.',
  audience: 'Founders whose pipeline includes CUI-handling work and who need a protected environment before it arrives.',
  intro: {
    what:
      'An enclave is a small, dedicated, tightly-controlled computing environment where CUI (Controlled Unclassified ' +
      'Information) lives — separate from your everyday laptops and SaaS. This walkthrough covers deciding whether you ' +
      'need one, choosing a strategy, and standing it up: provider, hardware, identity, logging, and evidence.',
    why:
      'CUI may not be stored, processed, or transmitted outside an environment that meets the safeguarding requirements. ' +
      'An enclave keeps that burden small: you harden one contained environment instead of your whole company.',
    next:
      'Start with step 1 — whether CUI is actually coming. If it is not, you may only need basic safeguarding for now, and you can stop after that step.',
  },
  steps: [
    {
      id: 'decide-cui',
      title: 'Decide if CUI is actually coming',
      what:
        'Read your contracts, subcontracts, and realistic pipeline. CUI handling is signaled by DFARS clause 252.204-7012 in the ' +
        'contract, CUI markings on documents, or a prime telling you flow-down applies. If you will only touch FCI ' +
        '(Federal Contract Information — non-public information provided under contract), the lighter FAR 52.204-21 basic ' +
        'safeguarding applies instead, and you may not need an enclave yet.',
      why:
        'An enclave costs real money and ongoing discipline. Building one you do not need burns runway; needing one you do not ' +
        'have blocks award. This one decision sets the budget for everything below.',
      actions: [
        { text: 'Search your contracts and teaming agreements for “252.204-7012”, “CUI”, and “NIST SP 800-171”. Ask your prime in writing if unclear.' },
        {
          text: 'Record the decision and its basis as a task with a review date — pipelines change.',
          link: { label: 'Open Tasks & deadlines', href: '/app/launchpad/tasks' },
        },
        {
          text: 'If CUI is not coming yet, stop here and revisit when it is. If it is, continue to boundary strategy.',
          link: { label: 'Review your scope', href: '/app/launchpad/readiness/scope' },
        },
      ],
      terms: [
        { term: 'FCI', definition: 'Federal Contract Information — non-public information provided by or generated for the government under contract. Protected by 15 basic requirements (FAR 52.204-21), far lighter than CUI safeguarding.' },
        { term: 'Flow-down', definition: 'When a prime contractor passes its contract clauses (like DFARS 252.204-7012) down to subcontractors. If you are a sub, the clause reaches you through the prime.' },
      ],
      official: { label: 'NARA CUI Registry (what counts as CUI)', href: 'https://www.archives.gov/cui', external: true },
    },
    {
      id: 'boundary-strategy',
      title: 'Pick a boundary strategy',
      what:
        'Two workable shapes: (1) an enclave — a small dedicated environment (specific devices, a protected cloud tenant) where all ' +
        'CUI lives and nothing else happens; or (2) whole-environment — your entire company network meets the requirements. ' +
        'For small teams the enclave almost always wins: fewer systems to harden, assess, and evidence.',
      why:
        'This choice determines the size of every later effort — how many of the 110 requirements touch how many systems. ' +
        'Companies that skip this decision end up defending their whole network by accident.',
      actions: [
        { text: 'Decide which people and which workflows will ever touch CUI. That set, plus its devices and services, is your candidate enclave.' },
        {
          text: 'Write the strategy into your assessment scope, including how the enclave is separated from the rest of the company.',
          link: { label: 'Open Scope', href: '/app/launchpad/readiness/scope' },
        },
        { text: 'Plan the discipline that keeps it true: CUI is opened, edited, and stored only inside the enclave — never forwarded to personal or everyday accounts.' },
      ],
      terms: [
        { term: 'Enclave', definition: 'A deliberately small, separated environment (devices + services + people) where all CUI handling happens. Shrinks the assessment boundary to something a small team can actually defend.' },
      ],
    },
    {
      id: 'provider-selection',
      title: 'Select the enclave provider',
      what:
        'Most small contractors buy the protected environment rather than build it: a government-community cloud tenant or an ' +
        'encrypted overlay service designed for CUI. Look for services that are FedRAMP-authorized (the federal cloud security ' +
        'authorization program) at Moderate or higher, that state DFARS 252.204-7012 support (including incident reporting and ' +
        'FIPS-validated cryptography), and that publish a shared-responsibility matrix.',
      why:
        'The provider inherits a large fraction of your 110 requirements — or fails to. The shared-responsibility matrix is the ' +
        'document that says exactly which requirements the provider covers and which remain yours; without it you are guessing.',
      actions: [
        {
          text: 'Open Enclave Bridge and record the candidates you are evaluating — provider, offering, and the references you collected. Metadata only; no credentials.',
          link: { label: 'Open Enclave Bridge', href: '/app/launchpad/enclave' },
        },
        { text: 'Ask every candidate for: FedRAMP authorization details, a DFARS 7012 statement, and their shared-responsibility matrix for NIST SP 800-171.' },
        { text: 'Selection is your decision. Launchpad listings and playbooks are information, not endorsements or certifications of any provider.' },
      ],
      terms: [
        { term: 'FedRAMP', definition: 'The federal program that authorizes cloud services for government use at defined security baselines (Moderate, High). A common yardstick for CUI-capable cloud services.' },
        { term: 'Shared-responsibility matrix', definition: 'The provider document mapping which security requirements the service covers and which remain the customer’s. You still own everything on your side of the line.' },
      ],
      official: { label: 'FedRAMP Marketplace (official)', href: 'https://marketplace.fedramp.gov/', external: true },
    },
    {
      id: 'hardware-checklist',
      title: 'Work the hardware checklist',
      what:
        'Decide which physical devices are in the enclave — ideally a small number of dedicated, company-owned, centrally managed ' +
        'endpoints used only for CUI work. Each needs: full-disk encryption using FIPS-validated cryptography (encryption modules ' +
        'tested under the government’s FIPS 140 program), screen lock, current patches, and a line in your asset inventory.',
      why:
        'Every extra device multiplies your assessment surface. “Any laptop that happens to be handy” is how CUI leaks out of the ' +
        'enclave and how assessments fail; a short, named device list is how they pass.',
      actions: [
        { text: 'List the enclave devices: make, model, owner, and management state. This inventory is itself evidence for several requirements.' },
        { text: 'Enable and verify full-disk encryption in FIPS mode where the platform supports it, plus automatic screen lock and update enforcement.' },
        {
          text: 'Index the inventory and configuration screenshots as evidence — content stays in your systems, the index records where and its hash.',
          link: { label: 'Open Evidence', href: '/app/launchpad/evidence' },
        },
      ],
      terms: [
        { term: 'FIPS-validated cryptography', definition: 'Encryption modules validated under the government’s FIPS 140 program. DFARS-covered CUI protection expects FIPS-validated crypto, not just “encrypted”.' },
      ],
    },
    {
      id: 'identity-mfa',
      title: 'Set up identity and MFA',
      what:
        'Give the enclave its own identities: dedicated accounts (not your everyday email), MFA (multi-factor authentication — a second ' +
        'proof beyond the password) enforced on every account, and separate admin accounts used only for administration.',
      why:
        'Identity is where most real intrusions start, and it is the family of requirements assessors probe hardest. ' +
        'Admin/user separation and universal MFA close the two most common findings at once.',
      actions: [
        { text: 'Create per-person enclave accounts and enforce MFA on all of them — no shared logins, no exceptions for the founder.' },
        { text: 'Create separate admin accounts for privileged work; nobody browses email with admin rights.' },
        {
          text: 'Update the requirement register for the identification & authentication and access-control requirements this work actually implements — mark only what is now true.',
          link: { label: 'Open Requirements', href: '/app/launchpad/readiness/controls' },
        },
      ],
    },
    {
      id: 'logging-monitoring',
      title: 'Stand up logging and monitoring',
      what:
        'The audit-and-accountability requirements expect the enclave to produce, retain, and review event logs. Small teams typically ' +
        'deploy a SIEM (Security Information and Event Management — software that collects and analyzes logs from your systems); ' +
        'Wazuh is a widely-used open-source option, and enclave providers often bundle equivalent capability.',
      why:
        'Without logs you cannot detect, investigate, or report an incident — and DFARS 7012 incident reporting assumes you can. ' +
        'Retention and an actual review habit matter as much as collection.',
      actions: [
        { text: 'Deploy log collection on enclave endpoints and services (your provider may cover part of this — check the shared-responsibility matrix).' },
        { text: 'Set a retention period and a named person who reviews alerts on a schedule; write both down.' },
        {
          text: 'Record the setup by reference in Enclave Bridge — architecture notes and metadata only. Raw logs stay in the enclave and are never pasted into this workspace.',
          link: { label: 'Open Enclave Bridge', href: '/app/launchpad/enclave' },
        },
      ],
      terms: [
        { term: 'SIEM', definition: 'Security Information and Event Management — software that centralizes logs from your systems and raises alerts. Wazuh is a common open-source example.' },
      ],
    },
    {
      id: 'evidence-the-setup',
      title: 'Evidence the setup',
      what:
        'Turn the build into assessable proof: index the architecture diagram, device inventory, identity configuration exports, ' +
        'logging configuration, and the provider’s responsibility matrix. Each evidence record carries a title, requirement IDs, ' +
        'the authoritative system where the content lives, and a browser-computed SHA-256 hash.',
      why:
        'Six months from now, “we set that up in the spring” is not evidence. Dated, hashed references made while you build are — ' +
        'and they satisfy the six-year retention habit before it is ever demanded.',
      actions: [
        {
          text: 'Index each artifact from steps 3–6 and link it to the requirements it supports.',
          link: { label: 'Open Evidence', href: '/app/launchpad/evidence' },
        },
        { text: 'Store the artifacts themselves in a durable system you control — the enclave’s own document store is a natural home.' },
      ],
    },
    {
      id: 'mark-requirements-honestly',
      title: 'Mark the related requirements — honestly',
      what:
        'Return to the requirement register and update the states this build genuinely changed: access control, identification & ' +
        'authentication, audit & accountability, system & communications protection, media protection. Use the provider’s ' +
        'shared-responsibility matrix to see what the service covers versus what stayed yours.',
      why:
        'Buying an enclave does not implement requirements by itself — configuration, procedures, and the human habits around it do. ' +
        'Marking only what is true keeps your score defensible; the gap that remains is simply your next closure wave.',
      actions: [
        {
          text: 'Update each affected requirement: Customer-marked implemented where you could demonstrate it today, In progress where configuration or procedure is still landing.',
          link: { label: 'Open Requirements', href: '/app/launchpad/readiness/controls' },
        },
        {
          text: 'Recompute your score to see what the enclave actually moved.',
          link: { label: 'Open Score', href: '/app/launchpad/readiness/score' },
        },
        {
          text: 'Feed the remaining gaps into your closure waves and POA&M where eligible.',
          link: { label: 'Open Closure', href: '/app/launchpad/readiness/closure' },
        },
      ],
    },
  ],
};
