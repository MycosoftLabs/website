import type { WalkthroughDef } from './types';

/**
 * Walkthrough: from zero to bid-ready. Written for a founder who has never
 * done government work. Every step defines its jargon inline and points at
 * the exact app page or official site to use. Education only — nothing here
 * asserts a compliance outcome or files anything on the customer's behalf.
 */
export const BECOME_A_DEFENSE_CONTRACTOR: WalkthroughDef = {
  id: 'become-a-defense-contractor',
  title: 'Become a defense contractor',
  tagline: 'Entity, registrations, and your first readiness baseline — the full path from zero to bid-ready.',
  audience: 'Founders who have never sold to the government and are starting from scratch.',
  intro: {
    what:
      'A step-by-step path through the registrations and habits every new government contractor needs: ' +
      'legal entity, EIN, banking, Login.gov, SAM.gov, and then your first security-readiness baseline in this workspace.',
    why:
      'The order matters. Each registration feeds the next, and name or number mismatches between them are the ' +
      'single most common reason new contractors stall for months. Doing these twelve steps in sequence avoids the rework.',
    next:
      'Work one step at a time. Mark each step done as you finish it — progress is saved in this browser, so you can leave and resume.',
  },
  steps: [
    {
      id: 'entity-ein',
      title: 'Form your company and get an EIN',
      what:
        'You need a legal business entity — usually an LLC or corporation — registered with your state, and an EIN ' +
        '(Employer Identification Number: the free tax ID the IRS issues to businesses). Sole proprietors can contract, ' +
        'but most primes and government portals expect a registered entity.',
      why:
        'Every registration downstream (SAM.gov, banking, insurance) asks for your exact legal name and EIN. ' +
        'Mismatches between state records, IRS records, and SAM.gov are the top cause of stalled registrations.',
      actions: [
        { text: 'Register your entity with your state and write down the exact legal name and formation date — you will re-type both, character for character, in later steps.' },
        {
          text: 'Apply for an EIN directly with the IRS. It is free and takes about 15 minutes online — never pay a third-party site for one.',
          link: { label: 'IRS — apply for an EIN (free)', href: 'https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number', external: true },
        },
        {
          text: 'Record your legal name and entity facts in Company. Launchpad stores non-restricted company facts only — never the EIN value, tax records, or passwords.',
          link: { label: 'Open Company', href: '/app/launchpad/company' },
        },
      ],
      terms: [
        { term: 'EIN', definition: 'Employer Identification Number — the free federal tax ID the IRS issues to a business. Treated like a company SSN, so it is not stored in this workspace.' },
      ],
    },
    {
      id: 'banking-insurance',
      title: 'Open business banking and line up insurance',
      what:
        'Open a business bank account in the entity’s exact legal name, and get baseline business insurance. ' +
        'General liability is the floor; many defense primes also expect errors & omissions and cyber liability before signing a subcontract.',
      why:
        'Government payments arrive by ACH (electronic bank transfer) to an account that must match your SAM.gov registration. ' +
        'Insurance certificates are routinely requested during subcontract onboarding — having them ready keeps deals moving.',
      actions: [
        { text: 'Open the business account using your EIN and formation documents. Personal accounts cannot receive federal payments.' },
        { text: 'Ask your insurer how to produce a COI (certificate of insurance — the one-page proof a prime requests) on demand.' },
        {
          text: 'Add renewal dates for the policy and the account review to your operating calendar.',
          link: { label: 'Open Tasks & deadlines', href: '/app/launchpad/tasks' },
        },
      ],
      terms: [
        { term: 'COI', definition: 'Certificate of insurance — a standard one-page summary of your coverage that primes and landlords request as proof.' },
      ],
    },
    {
      id: 'login-gov',
      title: 'Create your Login.gov account',
      what:
        'Login.gov is the shared sign-in service for many U.S. government websites, including SAM.gov. ' +
        'Create one account for the person who will own your registrations, protected by MFA ' +
        '(multi-factor authentication: a second proof of identity beyond the password, such as an authenticator app).',
      why:
        'You cannot register in SAM.gov without it, and losing access to this one account is a classic lockout that can take weeks to recover from.',
      actions: [
        {
          text: 'Sign up at Login.gov using a company email address you will control long-term — not a personal inbox.',
          link: { label: 'Login.gov — create an account', href: 'https://login.gov', external: true },
        },
        { text: 'Add at least two MFA methods (for example an authenticator app plus backup codes) so one lost phone cannot lock you out.' },
        {
          text: 'Record who owns the account and which MFA method it uses in Company — never the password itself.',
          link: { label: 'Open Company', href: '/app/launchpad/company' },
        },
      ],
      terms: [
        { term: 'MFA', definition: 'Multi-factor authentication — proving who you are with two or more independent factors (password + authenticator app, for example). Also called 2FA.' },
      ],
    },
    {
      id: 'sam-uei',
      title: 'Register in SAM.gov and get your UEI',
      what:
        'SAM.gov (System for Award Management) is the government’s master vendor registry. Registering is free and issues your UEI ' +
        '(Unique Entity ID — the 12-character identifier every federal system uses to refer to your company).',
      why:
        'No active SAM registration means no federal awards, period. Prime contractors also check SAM before signing subcontracts, ' +
        'and the registration must be renewed every 365 days or it lapses silently.',
      actions: [
        {
          text: 'Register your entity at SAM.gov. It is free — ignore the paid “registration help” spam that will start arriving the moment you do.',
          link: { label: 'SAM.gov — entity registration', href: 'https://sam.gov', external: true },
        },
        { text: 'Expect entity validation against your state records. Use the exact legal name from step 1; this is where mismatches surface.' },
        {
          text: 'When the UEI is issued, record it and the annual renewal date in Company.',
          link: { label: 'Open Company', href: '/app/launchpad/company' },
        },
      ],
      official: { label: 'SAM.gov (official, free)', href: 'https://sam.gov', external: true },
      terms: [
        { term: 'UEI', definition: 'Unique Entity ID — the 12-character identifier SAM.gov issues to your entity. It replaced the DUNS number in 2022.' },
        { term: 'SAM.gov', definition: 'System for Award Management — the free federal registry every contractor must be active in to receive awards.' },
      ],
    },
    {
      id: 'reps-certs-cage',
      title: 'Complete Reps & Certs and receive your CAGE code',
      what:
        'Inside the SAM registration you complete Representations & Certifications — standard statements about your business ' +
        '(size, ownership, compliance posture). U.S. registrants are automatically assigned a CAGE code ' +
        '(Commercial and Government Entity code — a 5-character facility identifier) as SAM processing completes.',
      why:
        'Contracting officers rely on your reps & certs on every award, and inaccurate answers are false statements to the government. ' +
        'Answer carefully, honestly, and with the person who actually knows your size and ownership.',
      actions: [
        { text: 'Complete Reps & Certs during SAM registration. If a question is unclear, look it up before answering — do not guess.' },
        {
          text: 'When your CAGE code arrives, record it in Company alongside the UEI.',
          link: { label: 'Open Company', href: '/app/launchpad/company' },
        },
        {
          text: 'Create an annual task to re-review reps & certs at each SAM renewal — your answers must stay current as the company changes.',
          link: { label: 'Open Tasks & deadlines', href: '/app/launchpad/tasks' },
        },
      ],
      terms: [
        { term: 'CAGE code', definition: 'Commercial and Government Entity code — a 5-character identifier for your facility, assigned automatically during SAM registration for U.S. entities.' },
        { term: 'Reps & Certs', definition: 'Representations & Certifications — the standardized statements about your business inside SAM that contracting officers rely on at award time.' },
      ],
    },
    {
      id: 'sprs-awareness',
      title: 'Understand SPRS before anyone asks',
      what:
        'SPRS (Supplier Performance Risk System) is the DoD database where your NIST SP 800-171 self-assessment score is posted. ' +
        'When defense work involves CUI (Controlled Unclassified Information — unclassified information the government still requires you to protect), ' +
        'DFARS contract clauses require a current score in SPRS before award.',
      why:
        'Primes increasingly open teaming conversations with “what’s your SPRS score?”. Knowing the vocabulary and the process ' +
        'makes you credible before you even have a score to report.',
      actions: [
        { text: 'Learn the shape of the number: 110 security requirements, weighted score ranging from −203 to +110. New contractors usually start negative — that is normal and honest.' },
        {
          text: 'Nothing to submit yet. The “CMMC Level 2 self-assessment” walkthrough ends with a human posting the score — this step is awareness only.',
          link: { label: 'Preview that walkthrough', href: '/app/launchpad/learn/walkthroughs/cmmc-l2-self-assessment' },
        },
        {
          text: 'Skim the requirement register so the 110 requirements stop being abstract.',
          link: { label: 'Open Requirements', href: '/app/launchpad/readiness/controls' },
        },
      ],
      official: { label: 'SPRS (official DoD site)', href: 'https://www.sprs.csd.disa.mil/', external: true },
      terms: [
        { term: 'SPRS', definition: 'Supplier Performance Risk System — the DoD database where suppliers’ NIST SP 800-171 self-assessment scores are posted and contracting officers look them up.' },
        { term: 'CUI', definition: 'Controlled Unclassified Information — unclassified information the government requires you to safeguard (32 CFR Part 2002). CUI never enters this workspace.' },
        { term: 'DFARS', definition: 'Defense Federal Acquisition Regulation Supplement — the DoD add-on to the federal contracting rules; its 252.204-70xx clauses drive the cybersecurity requirements.' },
      ],
    },
    {
      id: 'scope-environment',
      title: 'Scope your environment',
      what:
        'Write down, in plain language, the boundary of the computing environment you would use for government work: ' +
        'which laptops, which cloud services, which people. In Launchpad this lives in Scope, and every later assessment reads from it.',
      why:
        'Every security requirement you will ever assess is judged against this boundary. A small, deliberately-drawn scope is achievable; ' +
        '“everything the company owns” usually is not. Scoping first is how small teams keep this tractable.',
      actions: [
        {
          text: 'Open Scope and describe your environment: devices, cloud services, people, and where government data would live.',
          link: { label: 'Open Scope', href: '/app/launchpad/readiness/scope' },
        },
        { text: 'Write facts about systems, never sensitive content. This workspace is COMMERCIAL // NON-CUI — descriptions belong here, protected data does not.' },
        { text: 'Prefer the smallest boundary that can actually do the work. You can widen it later; shrinking after the fact is much harder.' },
      ],
      terms: [
        { term: 'Scope / boundary', definition: 'The declared set of systems, services, and people an assessment covers. Requirements are only assessed against what is inside the boundary.' },
      ],
    },
    {
      id: 'baseline-110',
      title: 'Baseline the 110 security requirements',
      what:
        'NIST SP 800-171 is the government standard listing 110 security requirements across 14 families (access control, awareness training, ' +
        'audit and accountability, and so on). Do a first honest pass over the register: mark each requirement Not started, In progress, ' +
        'Customer-marked implemented, or Not applicable.',
      why:
        'This baseline is the single input your score, POA&M, and SSP are derived from. A first pass full of “Not started” is normal ' +
        'and useful — an inflated baseline only defers the pain to an assessment. AI never marks anything implemented for you.',
      actions: [
        {
          text: 'Work through the register family by family. When in doubt, mark Not started — you can upgrade a state when the work is really done.',
          link: { label: 'Open Requirements', href: '/app/launchpad/readiness/controls' },
        },
        { text: 'For anything you mark Not applicable, write the reason down — assessors always ask.' },
      ],
      official: { label: 'NIST SP 800-171 Rev 2 (official publication)', href: 'https://csrc.nist.gov/pubs/sp/800/171/r2/upd1/final', external: true },
      terms: [
        { term: 'NIST SP 800-171', definition: 'The National Institute of Standards and Technology publication defining the 110 security requirements for protecting CUI in nonfederal systems.' },
      ],
    },
    {
      id: 'evidence-habit',
      title: 'Start the evidence habit',
      what:
        'Evidence is the proof a requirement is actually in place — a policy document, a screenshot, a configuration export. ' +
        'Launchpad indexes metadata plus a SHA-256 hash (a fingerprint of the file, computed in your browser); ' +
        'the file itself never leaves your systems and there is no upload path.',
      why:
        'An assessment without evidence is a list of opinions. Indexing evidence as you do the work costs minutes; ' +
        'reconstructing it months later costs weeks.',
      actions: [
        {
          text: 'Index one real artifact you already have — a policy, an MFA settings screenshot — and link it to the requirement IDs it supports.',
          link: { label: 'Open Evidence', href: '/app/launchpad/evidence' },
        },
        { text: 'Keep the content in your own authoritative system (your drive, your wiki). Launchpad records where it lives and its hash — never the content.' },
      ],
      terms: [
        { term: 'SHA-256 hash', definition: 'A cryptographic fingerprint of a file. If the file changes by one byte, the hash changes — so a stored hash proves which exact version you had, without storing the file.' },
      ],
    },
    {
      id: 'first-score',
      title: 'Compute your first score',
      what:
        'The Score screen runs the DoD assessment methodology over your register: start at 110 and subtract each unmet requirement’s ' +
        'weight (5, 3, or 1 point). The result — often negative on a first pass — is a weighted score estimate of where you stand today.',
      why:
        'A real number, however low, turns “we should get compliant someday” into a concrete work plan. ' +
        'It is also the same style of number a prime will eventually ask you to post to SPRS.',
      actions: [
        {
          text: 'Compute the score and read each gate explanation, not just the headline number.',
          link: { label: 'Open Score', href: '/app/launchpad/readiness/score' },
        },
        { text: 'Resist chasing the number. Flipping states without doing the underlying work produces a score you cannot defend — the register must reflect reality.' },
      ],
      terms: [
        { term: 'Weighted score', definition: 'The DoD methodology score: 110 minus the weights of unmet requirements. Range −203 to +110. It is an estimate you compute — not a grade anyone awards you.' },
      ],
    },
    {
      id: 'watch-opportunities',
      title: 'Watch opportunities',
      what:
        'Contract Radar tracks official opportunity feeds so you can see what agencies actually buy in your niche. ' +
        'A solicitation is the government’s published request for bids; reading real ones is the fastest education in this market.',
      why:
        'Fifteen minutes a week reading live solicitations teaches you your market’s language, contract vehicles, and set-asides ' +
        'faster than any course — and you will spot a realistic first bid far earlier.',
      actions: [
        {
          text: 'Open Contract Radar and scan what is live. An empty list is honest — it means the configured feeds returned nothing matching, never placeholder data.',
          link: { label: 'Open Contract Radar', href: '/app/launchpad/opportunities' },
        },
        { text: 'When something looks close to your capability, save it and read the full solicitation on the official site before getting excited.' },
      ],
      terms: [
        { term: 'Solicitation', definition: 'The government’s formal published request for bids or proposals (RFP, RFQ, and similar). Always read the original on the official portal.' },
        { term: 'Set-aside', definition: 'A competition reserved for a category of business — small business, SDVOSB, 8(a), HUBZone — which can dramatically shrink your competition.' },
      ],
    },
    {
      id: 'operating-calendar',
      title: 'Set your operating calendar',
      what:
        'Government contracting runs on renewals and recurring duties: SAM renewal (annual), insurance, training refreshes, ' +
        'and periodic self-assessment affirmations. Tasks & deadlines is the one calendar where all of it lives.',
      why:
        'An expired SAM registration silently disqualifies you from award — the most preventable failure in this business. ' +
        'A calendar you actually check is a real competitive advantage over contractors who scramble.',
      actions: [
        {
          text: 'Create recurring tasks for: SAM renewal, insurance renewal, annual reps & certs review, training refreshes, and a quarterly score refresh.',
          link: { label: 'Open Tasks & deadlines', href: '/app/launchpad/tasks' },
        },
        { text: 'Assign each task an owner by name. Unowned renewal tasks are how two-person companies miss them.' },
      ],
    },
  ],
};
