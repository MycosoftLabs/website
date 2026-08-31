/**
 * FUSARIUM Launchpad — the founder's defense glossary.
 *
 * This file IS the education layer: a typed, static reference of the jargon a
 * founder meets in their first year of government work, written for someone
 * who has never touched a defense contract. Every entry is a neutral,
 * plain-language summary with a link to the official source — these are
 * educational summaries, not legal advice, and the official source always
 * wins.
 *
 * Editorial rules for entries:
 *  - Plain definition first (2–3 sentences a founder can repeat at a whiteboard).
 *  - Define jargon inside the entry the first time it appears.
 *  - Never promise outcomes ("you will be compliant") — describe how the
 *    system works and what the founder's next step is.
 *  - Anything time-sensitive (e.g. CMMC phase status) is stated WITH its date.
 */

export type GlossaryCategory =
  | 'Networks & Systems'
  | 'Information Types'
  | 'Clearances & Facilities'
  | 'Frameworks & Rules'
  | 'Contracting Basics'
  | 'Your Toolchain';

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  'Networks & Systems',
  'Information Types',
  'Clearances & Facilities',
  'Frameworks & Rules',
  'Contracting Basics',
  'Your Toolchain',
];

export interface GlossaryEntry {
  term: string;
  /** Alternate names, expansions, and search aliases. */
  aka?: string[];
  category: GlossaryCategory;
  /** 2–3 sentence founder-plain definition. */
  plain: string;
  /** Bullet-point specifics. */
  details: string[];
  /** Why a founder should care — one honest paragraph. */
  whyItMatters: string;
  officialSource: { label: string; url: string };
}

export const GLOSSARY: GlossaryEntry[] = [
  // -------------------------------------------------------------------------
  // Networks & Systems
  // -------------------------------------------------------------------------
  {
    term: 'NIPRNet',
    aka: ['Non-classified Internet Protocol Router Network', 'NIPR'],
    category: 'Networks & Systems',
    plain:
      "The Department of Defense's internal network for UNCLASSIFIED information — and where most contractor business actually happens. Your government contacts email you from it, .mil sites live on it, and no clearance is needed to work with people on it.",
    details: [
      'Carries unclassified traffic (including CUI-level material) inside DoD. It is not the open internet, but it connects to the internet through guarded gateways.',
      'Contractors typically never get NIPRNet accounts. You interact with DoD staff who are on NIPRNet by using public portals — SAM.gov, DSIP, PIEE — over the regular internet.',
      'Emails from contracting officers and program offices normally arrive from .mil addresses hosted on NIPRNet.',
    ],
    whyItMatters:
      'When a solicitation references .mil systems or says material is "available on NIPRNet", it means the unclassified side of DoD. Most small-business entry points — SBIR, unclassified R&D, early conversations — live entirely here, with no clearance required.',
    officialSource: { label: 'DISA — disa.mil', url: 'https://www.disa.mil' },
  },
  {
    term: 'SIPRNet',
    aka: ['Secret Internet Protocol Router Network', 'SIPR'],
    category: 'Networks & Systems',
    plain:
      "DoD's network for information classified up to SECRET. You will not touch it — and should not plan around it — unless your company holds a facility clearance, your people hold personnel clearances, and a specific contract requires classified work.",
    details: [
      'Physically and logically separate from the internet. Access requires cleared people, approved facilities, and government-sponsored accounts.',
      "Classified work is spelled out in a contract's DD Form 254 (the contract security classification specification) — that document is what triggers SIPRNet involvement.",
      'CUI-level work never requires SIPRNet: CUI (Controlled Unclassified Information) is unclassified by definition.',
    ],
    whyItMatters:
      "Founders often assume defense work requires clearances on day one. It usually doesn't — most first contracts are unclassified. Knowing SIPRNet is a later-stage concern keeps you from over-investing before a contract sponsors the need.",
    officialSource: { label: 'DISA — disa.mil', url: 'https://www.disa.mil' },
  },
  {
    term: 'JWICS',
    aka: ['Joint Worldwide Intelligence Communications System', 'TS/SCI network'],
    category: 'Networks & Systems',
    plain:
      "The network for TOP SECRET / Sensitive Compartmented Information (TS/SCI) — the intelligence community's system. It is the top rung of the network ladder; almost no small business starts anywhere near it.",
    details: [
      'Access requires TS/SCI clearances and work inside an accredited SCIF (Sensitive Compartmented Information Facility — a physically certified room for SCI work).',
      'Used for intelligence-community programs; contractor involvement comes only through specific cleared contracts.',
      'Listed here so you can recognize it in conversation — not because you need it.',
    ],
    whyItMatters:
      "Knowing the three-network ladder — NIPRNet (unclassified) → SIPRNet (SECRET) → JWICS (TS/SCI) — lets you place any program's sensitivity instantly when you read a solicitation or sit in a meeting.",
    officialSource: { label: 'Defense Intelligence Agency — dia.mil', url: 'https://www.dia.mil' },
  },
  {
    term: 'Enclave',
    aka: ['security enclave', 'CUI enclave', 'scoped environment'],
    category: 'Networks & Systems',
    plain:
      'A deliberately separated slice of your IT environment with its own boundary and controls — for example, a small set of laptops and one cloud tenant where all CUI lives, so the rest of your company stays out of scope.',
    details: [
      'Scoping down to an enclave is the most common small-business strategy for CMMC: fewer systems in scope means fewer places you must implement and prove the 110 requirements.',
      'An enclave can be physical (dedicated laptops), virtual (a separate cloud tenant such as GCC High), or a purchased encrypted-workspace service.',
      'The boundary must be real and documented in your SSP (System Security Plan) — how data flows in and out of the enclave is exactly what an assessor examines.',
    ],
    whyItMatters:
      'A well-drawn enclave can turn "secure the whole company" into "secure five laptops and one tenant" — often the difference between an affordable readiness project and an impossible one.',
    officialSource: { label: 'NIST CSRC glossary', url: 'https://csrc.nist.gov/glossary' },
  },
  {
    term: 'GovCloud & GCC High',
    aka: ['AWS GovCloud', 'Microsoft 365 GCC High', 'authorization vs equivalency'],
    category: 'Networks & Systems',
    plain:
      'US-government-oriented cloud environments — AWS GovCloud, Microsoft 365 GCC High, and peers — built to meet federal requirements such as US-persons support staff and FedRAMP High baselines. Contractors use them to store and process CUI, especially export-controlled CUI.',
    details: [
      '"Authorized" means the cloud service holds a formal FedRAMP authorization you can verify yourself on the public FedRAMP Marketplace.',
      '"Equivalency" (the DFARS 252.204-7012 alternative for clouds) means the vendor asserts it meets a FedRAMP Moderate equivalent — and the CUSTOMER is responsible for verifying that claim, typically by reviewing the vendor\'s body of evidence. Never take the sales page\'s word for it.',
      'Commercial Microsoft 365 or Google Workspace tenants are generally not appropriate for ITAR-controlled CUI, because support staff may include non-US persons — which can constitute an export.',
    ],
    whyItMatters:
      'Choosing the wrong cloud tier is one of the most expensive early mistakes: migrating a company\'s email and files later is painful. Decide where CUI will live before you win the contract, and verify authorization status yourself.',
    officialSource: { label: 'FedRAMP Marketplace', url: 'https://marketplace.fedramp.gov' },
  },

  // -------------------------------------------------------------------------
  // Information Types
  // -------------------------------------------------------------------------
  {
    term: 'CUI',
    aka: ['Controlled Unclassified Information', 'CUI Registry', 'CTI', 'Controlled Technical Information'],
    category: 'Information Types',
    plain:
      'Unclassified information the government requires you to protect because a law, regulation, or government-wide policy says so. It is the center of gravity for CMMC: if CUI touches your systems, NIST SP 800-171 applies to those systems.',
    details: [
      "The official list of CUI categories lives in the NARA CUI Registry (NARA is the National Archives and Records Administration, the government's CUI executive agent). If an information type is not in the Registry, it is not CUI.",
      'Controlled Technical Information (CTI) is the category defense contractors meet most: technical drawings, specifications, and data developed or delivered under DoD contracts.',
      'CUI is normally marked (banner markings like "CUI//SP-CTI"), but unmarked information can still be CUI — the content and the contract control, not the stamp.',
      'CUI is NOT classified. No clearance is needed to handle it — but the safeguarding requirements are binding contract obligations.',
    ],
    whyItMatters:
      'Whether you will handle CUI is the single biggest fork in your readiness budget: it decides CMMC Level 2 (110 requirements) versus Level 1 (15 requirements). Ask your customer, in writing, whether the work involves CUI.',
    officialSource: { label: 'NARA CUI Registry', url: 'https://www.archives.gov/cui' },
  },
  {
    term: 'FCI',
    aka: ['Federal Contract Information'],
    category: 'Information Types',
    plain:
      'Information provided by or generated for the government under contract that is not intended for public release. It is the baseline sensitivity tier below CUI — nearly every federal contract involves some FCI.',
    details: [
      'Protected by the 15 basic safeguarding requirements of FAR 52.204-21, which correspond to CMMC Level 1.',
      'Examples: contract performance details and process information exchanged with the government. Information the government has published publicly is not FCI.',
      'CMMC Level 1 for FCI is an annual self-assessment with a company affirmation — no third-party assessor involved.',
    ],
    whyItMatters:
      'If you hold any federal contract, you almost certainly hold FCI, which makes Level 1 hygiene the floor for everyone — a useful, low-cost first milestone on the way to Level 2.',
    officialSource: { label: 'FAR 52.204-21 (acquisition.gov)', url: 'https://www.acquisition.gov/far/52.204-21' },
  },
  {
    term: 'CDI (Covered Defense Information)',
    aka: ['covered defense information', 'CDI'],
    category: 'Information Types',
    plain:
      'The DFARS term for the defense flavor of CUI: unclassified controlled technical information or other CUI that is provided to you, or developed by you, under a DoD contract. In practice: DoD CUI sitting in your systems.',
    details: [
      'If a DoD contract includes DFARS clause 252.204-7012, any CDI on your systems must be protected to NIST SP 800-171.',
      'CDI includes Controlled Technical Information (CTI) — drawings, specifications, technical reports with military application.',
      'Holding CDI is also what triggers the 72-hour cyber incident reporting duty (reported through the DIBNet portal).',
    ],
    whyItMatters:
      '"Do we actually hold CDI?" is the question that decides whether the heavyweight DFARS cyber obligations bind you on a given contract. If the answer is unclear, ask the contracting officer in writing before you sign.',
    officialSource: { label: 'DFARS (acquisition.gov)', url: 'https://www.acquisition.gov/dfars' },
  },
  {
    term: 'Classification levels',
    aka: ['Unclassified', 'Confidential', 'Secret', 'Top Secret', 'SCI', 'SAP', 'U//CUI//C//S//TS'],
    category: 'Information Types',
    plain:
      'The US government ladder for national-security information: Unclassified (which includes CUI) → Confidential → Secret → Top Secret. The classified tiers require personnel clearances; CUI does not.',
    details: [
      'Unclassified: no clearance needed. CUI is a protection regime WITHIN unclassified — it never makes information classified.',
      'Confidential / Secret / Top Secret map to "damage" / "serious damage" / "exceptionally grave damage" to national security from unauthorized disclosure.',
      'SCI (Sensitive Compartmented Information) and SAP (Special Access Programs) are compartments layered on top of Top Secret or Secret clearances — access is granted program by program on strict need-to-know.',
      'Classified work happens only under a contract with a DD Form 254 and inside cleared facilities — it never simply "shows up" in a normal contract.',
    ],
    whyItMatters:
      "Reading a solicitation's security block correctly tells you in seconds whether you can bid today or whether the opportunity sits behind a multi-month clearance journey.",
    officialSource: { label: 'NARA Information Security Oversight Office', url: 'https://www.archives.gov/isoo' },
  },

  // -------------------------------------------------------------------------
  // Clearances & Facilities
  // -------------------------------------------------------------------------
  {
    term: 'Security clearance (personnel)',
    aka: ['PCL', 'Tier 3', 'Tier 5', 'continuous vetting'],
    category: 'Clearances & Facilities',
    plain:
      'A government determination that a specific person may access classified information. You cannot buy one or apply on your own — a government sponsor, or a cleared contract need, has to initiate it.',
    details: [
      'Sponsorship: an agency, or a cleared contractor with a valid classified contract requirement, submits the person for investigation. Individuals cannot self-sponsor.',
      'Investigation tiers: Tier 3 supports Secret; Tier 5 supports Top Secret. Investigations are run through DCSA (the Defense Counterintelligence and Security Agency).',
      'Continuous vetting has replaced fixed periodic reinvestigations — enrolled personnel are checked against government records on an ongoing basis.',
      'Interim clearances can be granted while a full investigation completes, at government discretion.',
    ],
    whyItMatters:
      "Clearances take months and require a sponsoring need, which creates a chicken-and-egg: you can't staff classified work without cleared people, and you can't clear people without a contract. If classified work is on your roadmap, plan the sequencing early — often by teaming with a cleared prime first.",
    officialSource: { label: 'DCSA — dcsa.mil', url: 'https://www.dcsa.mil' },
  },
  {
    term: 'Facility clearance (FCL)',
    aka: ['FCL', 'KMP', 'Key Management Personnel'],
    category: 'Clearances & Facilities',
    plain:
      'A clearance for your company — despite the name, it clears the legal entity, not a building. It is the determination that the company itself is eligible to access classified information, and it is required before performing on any classified contract.',
    details: [
      'Sponsorship: a government agency or a cleared prime contractor sponsors your FCL in connection with a specific classified requirement. Companies cannot self-sponsor.',
      'KMP (Key Management Personnel) — typically the senior management official and the FSO (Facility Security Officer) — must obtain personnel clearances as part of the FCL.',
      'The process is administered by DCSA under the National Industrial Security Program (see NISPOM).',
      'An FCL by itself does not authorize storing classified material on site — safeguarding capability is a separate approval.',
    ],
    whyItMatters:
      'No FCL means no classified work — but CUI-level (unclassified) work requires no FCL at all. Do not spend money chasing a facility clearance until a real classified opportunity is ready to sponsor you.',
    officialSource: { label: 'DCSA — dcsa.mil', url: 'https://www.dcsa.mil' },
  },
  {
    term: 'FOCI',
    aka: ['Foreign Ownership, Control, or Influence', 'SF-328'],
    category: 'Clearances & Facilities',
    plain:
      "The government's assessment of whether foreign interests could influence your company. Foreign investors, foreign board seats, or heavy foreign revenue can trigger mitigation requirements — and can complicate or block a facility clearance.",
    details: [
      'Assessed through the SF-328 questionnaire ("Certificate Pertaining to Foreign Interests") during FCL processing, and monitored afterwards.',
      'Mitigation instruments scale with severity — from board resolutions to proxy agreements that insulate the cleared entity from foreign owners.',
      'FOCI review looks at ownership, debt, revenue concentration, and governance rights, not just headline equity percentages.',
    ],
    whyItMatters:
      'Cap-table decisions at seed stage can decide whether your company is clearable years later. If defense is a core market, screen prospective investors for FOCI implications before you take their money.',
    officialSource: { label: 'DCSA — dcsa.mil', url: 'https://www.dcsa.mil' },
  },
  {
    term: 'NISPOM (32 CFR Part 117)',
    aka: ['National Industrial Security Program Operating Manual', '32 CFR 117'],
    category: 'Clearances & Facilities',
    plain:
      'The National Industrial Security Program Operating Manual — the rulebook for how cleared contractors protect classified information. Since 2021 it has been codified as a federal regulation at 32 CFR Part 117.',
    details: [
      'Governs facility clearances, contractor personnel security, insider-threat programs, and classified safeguarding.',
      'It binds cleared contractors — if your company holds no FCL, NISPOM does not apply to you yet.',
      'DCSA administers the program for most of industry.',
    ],
    whyItMatters:
      'This is the compliance regime you inherit the day you accept a facility clearance. Skim it before you pursue an FCL so the ongoing obligations (an FSO, insider-threat program, reporting duties) are priced into the decision.',
    officialSource: {
      label: 'eCFR — 32 CFR Part 117',
      url: 'https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-117',
    },
  },

  // -------------------------------------------------------------------------
  // Frameworks & Rules
  // -------------------------------------------------------------------------
  {
    term: 'CMMC',
    aka: ['Cybersecurity Maturity Model Certification', 'CMMC 2.0', 'Level 1', 'Level 2', 'Level 3', '32 CFR Part 170'],
    category: 'Frameworks & Rules',
    plain:
      "DoD's program for verifying that contractors actually implement the cybersecurity they already promised. Level 1 covers FCI with 15 requirements (self-assessed); Level 2 covers CUI with the 110 requirements of NIST SP 800-171 (self-assessed or third-party-certified, depending on the contract); Level 3 adds enhanced requirements for a small set of critical programs.",
    details: [
      'Level 1: 15 requirements from FAR 52.204-21; annual self-assessment plus a company affirmation.',
      'Level 2: the 110 requirements of NIST SP 800-171 r2. Some contracts accept a self-assessment; others require a certification assessment by a C3PAO. The solicitation tells you which.',
      'Level 3: adds selected NIST SP 800-172 requirements, assessed by the government (DIBCAC) on top of a Level 2 certification.',
      'The program rule is 32 CFR Part 170; the phased rollout began 10 November 2025.',
      'Dated status — as of mid-2026: Phase 1 is in effect; DoD suspended Phase 2 on 13 July 2026. This is a moving target — verify the current phase on the official CMMC site before making bid or spend decisions.',
    ],
    whyItMatters:
      'CMMC levels appear in solicitations as go/no-go eligibility gates. Knowing your target level — usually Level 2 if you will touch CUI — sets your entire readiness scope and budget.',
    officialSource: { label: 'DoD CIO — dodcio.defense.gov/CMMC', url: 'https://dodcio.defense.gov/CMMC/' },
  },
  {
    term: 'NIST SP 800-171 r2 vs 800-172',
    aka: ['NIST SP 800-171', 'NIST SP 800-172', 'the 110 controls', '14 families'],
    category: 'Frameworks & Rules',
    plain:
      'NIST SP 800-171 lists the 110 security requirements for protecting CUI in nonfederal (your) systems — the technical backbone of CMMC Level 2. NIST SP 800-172 adds enhanced requirements for the highest-risk programs — CMMC Level 3 territory.',
    details: [
      'CMMC Level 2 currently assesses against 800-171 Revision 2 (a Revision 3 exists; the CMMC rule pins the assessed version — verify current before you build to a spec).',
      'The 110 requirements are organized into 14 families — Access Control, Audit & Accountability, Configuration Management, Incident Response, and so on.',
      '800-172 requirements are designed against advanced persistent threats; only a small subset of contracts will ever invoke them.',
    ],
    whyItMatters:
      'When anyone says "the 110 controls", this document is what they mean. Your SSP, your SPRS score, and any assessment all trace back to it — it is the one spec worth reading end to end.',
    officialSource: { label: 'NIST SP 800-171 r2', url: 'https://csrc.nist.gov/pubs/sp/800/171/r2/upd1/final' },
  },
  {
    term: 'DFARS 252.204-7012',
    aka: ['7012', 'safeguarding clause', '72-hour reporting'],
    category: 'Frameworks & Rules',
    plain:
      'The foundational DoD cyber clause, in most DoD contracts since 2017. If your contract includes it, you must (1) safeguard covered defense information to NIST SP 800-171 and (2) report cyber incidents to DoD within 72 hours through the DIBNet portal.',
    details: [
      'The 72-hour clock runs from discovery of a reportable cyber incident. Reporting requires logging in to DIBNet with a DoD-approved Medium Assurance Certificate — obtain one BEFORE you ever need it.',
      'If you use an external cloud service to store or process CDI, the clause requires it to meet the FedRAMP Moderate baseline or equivalent (equivalency is a vendor claim the customer must verify).',
      'Flow-down: primes must insert the clause into subcontracts involving CDI — subcontractors carry the same duties.',
    ],
    whyItMatters:
      'Signing a contract containing 7012 is a binding representation that 800-171 safeguarding is in place. Treat it as the legal commitment it is — misrepresenting security posture has produced False Claims Act cases.',
    officialSource: { label: 'DFARS (acquisition.gov)', url: 'https://www.acquisition.gov/dfars' },
  },
  {
    term: 'DFARS 252.204-7019 / -7020 / -7021',
    aka: ['7019', '7020', '7021', 'SPRS clauses', 'CMMC clause'],
    category: 'Frameworks & Rules',
    plain:
      'Three companion clauses to 7012. 7019: to be considered for award you must have a current NIST SP 800-171 self-assessment score posted in SPRS. 7020: you must give the government access to verify that assessment, and flow the requirement to subs. 7021: the CMMC clause — you must hold the CMMC level the contract states.',
    details: [
      '7019 requires a Basic (self) assessment score, using the DoD Assessment Methodology, no older than three years, posted in SPRS.',
      '7020 lets DoD conduct higher-confidence (Medium/High) assessments of your implementation and obligates flow-down.',
      '7021 phases in with the CMMC program rule (32 CFR Part 170) — the contract will state the required level and assessment type.',
    ],
    whyItMatters:
      '7019 is the clause that bites first: no SPRS score on file means no award consideration. Posting an honest score takes an afternoon once your self-assessment exists.',
    officialSource: { label: 'DFARS (acquisition.gov)', url: 'https://www.acquisition.gov/dfars' },
  },
  {
    term: 'FAR 52.204-21',
    aka: ['basic safeguarding clause', '15 requirements'],
    category: 'Frameworks & Rules',
    plain:
      'The government-wide "basic safeguarding" clause: 15 elementary security requirements — limit access, patch software, run anti-malware, control visitors — for any contractor system that holds FCI. This clause is the substance of CMMC Level 1.',
    details: [
      'Applies across the whole federal government, not just DoD.',
      'The 15 requirements are deliberately basic — most are things a well-run IT shop does anyway.',
      'Under CMMC, Level 1 compliance with these requirements is self-assessed annually with an affirmation by a company official.',
    ],
    whyItMatters:
      'This is the floor for every federal contractor. If the 15 basics are not true of your company today, fix them first — they are prerequisites for everything above.',
    officialSource: { label: 'FAR 52.204-21 (acquisition.gov)', url: 'https://www.acquisition.gov/far/52.204-21' },
  },
  {
    term: 'ITAR vs EAR',
    aka: ['ITAR', 'EAR', 'USML', 'CCL', 'export control', 'deemed export', 'DDTC', 'BIS'],
    category: 'Frameworks & Rules',
    plain:
      'The two US export-control regimes. ITAR (run by the State Department) covers defense articles and services on the US Munitions List (USML). EAR (run by the Commerce Department) covers dual-use items on the Commerce Control List (CCL). "Export" includes showing controlled technical data to a foreign person — even inside the United States.',
    details: [
      "ITAR: administered by State's Directorate of Defense Trade Controls (DDTC). Manufacturers and exporters of USML defense articles must register with DDTC even if they never ship anything abroad.",
      "EAR: administered by Commerce's Bureau of Industry and Security (BIS — bis.doc.gov). CCL items carry ECCN codes; the regime is generally lighter-touch than ITAR.",
      'A "deemed export" occurs when a foreign person accesses controlled technical data — which makes hiring decisions and cloud-region choices export decisions.',
      'Export-controlled technical data is a CUI category, so on DoD contracts it also inherits CUI handling requirements.',
    ],
    whyItMatters:
      'ITAR violations carry criminal penalties. If your product touches the USML, giving a foreign-person engineer repo access or using the wrong cloud region can be a violation with zero data ever leaving your building. Classify your technology early.',
    officialSource: { label: 'State DDTC — pmddtc.state.gov', url: 'https://www.pmddtc.state.gov' },
  },
  {
    term: 'FedRAMP',
    aka: ['Federal Risk and Authorization Management Program', 'FedRAMP Moderate', 'FedRAMP High'],
    category: 'Frameworks & Rules',
    plain:
      'The government-wide program that security-authorizes cloud services for federal use at Low, Moderate, and High baselines. For contractors it matters because DFARS 7012 requires clouds holding covered defense information to meet FedRAMP Moderate or equivalent.',
    details: [
      'Every authorized service and its baseline is listed publicly on the FedRAMP Marketplace — you can verify any vendor claim in about 30 seconds.',
      '"Equivalency" is a vendor assertion, not an authorization; the customer bears the burden of verifying it (ask for the body of evidence).',
      "FedRAMP authorizes the provider's side of the shared-responsibility model — you still have to configure and operate your tenant securely.",
    ],
    whyItMatters:
      '"Is it on the FedRAMP Marketplace, and at what baseline?" is the first question to ask any SaaS vendor before CUI touches their product.',
    officialSource: { label: 'FedRAMP Marketplace', url: 'https://marketplace.fedramp.gov' },
  },
  {
    term: 'SSP (System Security Plan)',
    aka: ['System Security Plan', 'SSP'],
    category: 'Frameworks & Rules',
    plain:
      'The living document that defines your system boundary and describes, requirement by requirement, how each of the 110 NIST SP 800-171 controls is implemented in your environment. It is the first artifact any assessor asks for.',
    details: [
      'Describes scope and boundary, data flows, system components, and a per-requirement implementation narrative.',
      '800-171 itself requires an SSP (requirement 3.12.4) — without one you cannot legitimately produce a self-assessment score at all.',
      'Keep it truthful and current. An honest SSP with gaps and a real plan beats an aspirational SSP every time — assessors and courts both read them.',
    ],
    whyItMatters:
      'The SSP is where "we take security seriously" becomes checkable statements. Writing it is also the fastest way to discover what your environment actually looks like.',
    officialSource: { label: 'NIST SP 800-171 r2', url: 'https://csrc.nist.gov/pubs/sp/800/171/r2/upd1/final' },
  },
  {
    term: 'POA&M (Plan of Action & Milestones)',
    aka: ['POAM', 'POA&M', '180-day closeout'],
    category: 'Frameworks & Rules',
    plain:
      'Your documented list of security requirements not yet fully implemented — each with an owner, a plan, and a date. Under CMMC Level 2, a limited POA&M is permitted for certain lower-weight requirements, and it must be closed out within 180 days.',
    details: [
      'Only specific requirements are POA&M-eligible under the CMMC rule; the highest-weight requirements cannot be deferred.',
      'A conditional CMMC status requires meeting a minimum score AND closing every open POA&M item within 180 days, verified by a closeout assessment — miss the window and the conditional status lapses.',
      'A POA&M is a management tool, not an excuse ledger: dates and owners must be real, and progress must be demonstrable.',
    ],
    whyItMatters:
      'The 180-day clock is unforgiving and starts at assessment, not when convenient. Never bid a delivery timeline your POA&M closeout cannot meet.',
    officialSource: {
      label: 'eCFR — 32 CFR Part 170',
      url: 'https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-D/part-170',
    },
  },
  {
    term: 'C3PAO',
    aka: ['CMMC Third-Party Assessment Organization', 'certification assessment'],
    category: 'Frameworks & Rules',
    plain:
      'A CMMC Third-Party Assessment Organization — an accredited private company authorized to conduct CMMC Level 2 certification assessments. You hire one when a contract requires a certified (rather than self-assessed) Level 2 status.',
    details: [
      'Accredited and listed by the Cyber AB (the CMMC Accreditation Body) — check the official marketplace before engaging anyone.',
      'Assessments are performed by certified assessors against the 110 requirements; results are recorded in DoD systems and surface in SPRS.',
      'Capacity is limited industry-wide — book months ahead of any contract deadline, and expect meaningful cost.',
    ],
    whyItMatters:
      'If your pipeline includes contracts requiring certified Level 2, the C3PAO engagement is a long-lead budget item. Schedule and price it like one.',
    officialSource: { label: 'Cyber AB — cyberab.org', url: 'https://cyberab.org' },
  },

  // -------------------------------------------------------------------------
  // Contracting Basics
  // -------------------------------------------------------------------------
  {
    term: 'CAGE code',
    aka: ['Commercial and Government Entity code', 'NCAGE'],
    category: 'Contracting Basics',
    plain:
      'A five-character ID the government assigns to your company at a specific physical location. It is assigned automatically during SAM.gov registration and shows up on virtually every federal form afterwards.',
    details: [
      'Issued by the Defense Logistics Agency (DLA); one CAGE per physical location.',
      'Used to identify you in contracts, SPRS, DD Form 254s, and supplier systems.',
      'Foreign entities get an NCAGE (NATO CAGE) equivalent.',
    ],
    whyItMatters:
      'You will type this code into nearly every government system you ever touch. It costs nothing and arrives with SAM registration — one more reason SAM.gov is step one.',
    officialSource: { label: 'DLA CAGE program', url: 'https://cage.dla.mil' },
  },
  {
    term: 'UEI',
    aka: ['Unique Entity Identifier', 'Unique Entity ID', 'replaced DUNS'],
    category: 'Contracting Basics',
    plain:
      "The 12-character Unique Entity Identifier that replaced the DUNS number in April 2022. SAM.gov issues it free when you register — it is your company's primary identity across federal award systems.",
    details: [
      'Issued by SAM.gov itself — no third party is involved, and no one should ever charge you for one.',
      'Required for every federal application: contracts, grants, SBIR/STTR, and subcontract reporting.',
      'One UEI per legal entity (unlike CAGE, which is per location).',
    ],
    whyItMatters:
      'Grant and proposal portals reject submissions without a valid UEI, and validation hiccups can take days — register well before your first deadline.',
    officialSource: { label: 'SAM.gov', url: 'https://sam.gov' },
  },
  {
    term: 'EIN',
    aka: ['Employer Identification Number', 'federal tax ID'],
    category: 'Contracting Basics',
    plain:
      'Your Employer Identification Number — the federal tax ID the IRS issues to your business. You need it before you can register in SAM.gov, open business banking, or hire employees. It is free and takes minutes online.',
    details: [
      'Apply directly on the IRS website — it is free; paid "EIN filing services" add nothing.',
      'A prerequisite for SAM.gov entity registration (your legal name and taxpayer records must match IRS records exactly).',
      'Name/EIN mismatches between IRS and SAM records are a classic source of multi-week registration delays — copy your IRS records character for character.',
    ],
    whyItMatters:
      'It is the first identifier in the chain (EIN → SAM.gov → UEI + CAGE). Getting it right — and consistent — up front prevents the most common registration stall.',
    officialSource: {
      label: 'IRS — get an EIN',
      url: 'https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number',
    },
  },
  {
    term: 'SAM.gov',
    aka: ['System for Award Management', 'entity registration', 'contract opportunities'],
    category: 'Contracting Basics',
    plain:
      "The System for Award Management — the government's master vendor registry and the public site where contract opportunities are posted. Registration is free and mandatory before you can receive any federal award.",
    details: [
      'Registering yields your UEI and CAGE code and records your representations & certifications (small-business status and more).',
      'Registration must be renewed annually — a lapsed SAM registration blocks both new awards and payments on existing ones. Calendar it.',
      'The "Contract Opportunities" search (successor to FedBizOpps) is where solicitations are published.',
      'It is free. Companies that cold-call offering to "complete your SAM registration" for a fee are selling you something you can do yourself in an afternoon.',
    ],
    whyItMatters:
      'This is the literal front door: no SAM registration, no federal revenue. It is also the first place a program office looks you up, so keep it accurate.',
    officialSource: { label: 'SAM.gov', url: 'https://sam.gov' },
  },
  {
    term: 'Prime vs sub',
    aka: ['prime contractor', 'subcontractor', 'flow-down'],
    category: 'Contracting Basics',
    plain:
      'A prime contractor holds the contract directly with the government; a subcontractor contracts with the prime. Most founders do their first defense work as a sub on someone else\'s prime contract.',
    details: [
      'Primes carry the direct FAR/DFARS relationship and must "flow down" required clauses — including cyber clauses like 252.204-7012 — to their subs.',
      'Subbing first builds past performance and domain knowledge with less administrative burden.',
      'Flow-down means "we\'re just a sub" is not an exemption: if CDI reaches your systems, the safeguarding and incident-reporting duties reach you too.',
    ],
    whyItMatters:
      'Teaming as a sub is the lowest-friction entry into defense work — but read the flow-downs in the subcontract as carefully as a prime would read the contract.',
    officialSource: { label: 'SBA — federal contracting', url: 'https://www.sba.gov/federal-contracting' },
  },
  {
    term: 'SBIR / STTR',
    aka: ['Small Business Innovation Research', 'Small Business Technology Transfer', 'DSIP', 'America\'s Seed Fund', 'Phase I', 'Phase II', 'Phase III'],
    category: 'Contracting Basics',
    plain:
      'Set-aside federal R&D funding for small businesses — non-dilutive money (a contract or grant, not equity). Phase I funds feasibility, Phase II funds development, and Phase III (uncapped, sole-source eligible) funds transition to real programs. DoD proposals are submitted through DSIP.',
    details: [
      'SBIR is for small businesses alone; STTR requires partnering with a research institution (such as a university) that performs a minimum share of the work.',
      'DSIP — the Defense SBIR/STTR Innovation Portal at dodsbirsttr.mil — handles DoD topic releases and proposal submission. Registration and proposal volumes take time; start at least a week before any deadline.',
      'Phase III has no dollar cap and can be awarded sole-source based on prior SBIR/STTR work — it is the strategic reason the program exists.',
      'Topics are released on a published calendar per agency; matching your tech to an open topic is the core skill.',
    ],
    whyItMatters:
      'SBIR/STTR is the standard front door for technology founders entering defense: real money, no equity, and a past-performance record that primes and program offices respect.',
    officialSource: { label: 'SBIR.gov', url: 'https://www.sbir.gov' },
  },
  {
    term: 'OTA (Other Transaction Authority)',
    aka: ['Other Transaction Agreement', 'OT', 'consortium'],
    category: 'Contracting Basics',
    plain:
      'A flexible contracting instrument that sits outside most of the standard FAR — used for research and prototype projects, often run through consortia you join. OTs are faster and more negotiable than traditional contracts and were designed to attract nontraditional defense contractors.',
    details: [
      'Many prototype OTs flow through consortia (membership fees are typically modest); solicitations reach you via the consortium.',
      'A successful prototype OT can transition to follow-on production without a new competition — a major strategic feature.',
      'The FAR does not apply wholesale, but data-handling and security expectations (like CUI safeguarding) usually still arrive through the agreement terms.',
    ],
    whyItMatters:
      'OTs are how a lot of prototype-stage defense work moves now. Joining the one or two consortia relevant to your domain puts those solicitations in your inbox.',
    officialSource: { label: 'DAU — Other Transactions guide', url: 'https://aaf.dau.edu/aaf/ot/' },
  },
  {
    term: 'APEX Accelerators',
    aka: ['PTAC', 'Procurement Technical Assistance Centers'],
    category: 'Contracting Basics',
    plain:
      'Free, government-funded advisors (formerly called PTACs) whose whole job is helping small businesses enter government contracting — registrations, certifications, finding opportunities, and reviewing bids. Free is the operative word.',
    details: [
      'Local centers across every state; funded through the DoD Office of Small Business Programs.',
      'Typical help: SAM.gov registration, set-aside certification applications, bid/no-bid reviews, matching your capability to buying offices.',
      'They are advisors, not consultants selling a package — there is no upsell.',
    ],
    whyItMatters:
      'Free expert help exists and most founders never use it. Talk to your local APEX Accelerator before paying any consultant for registration or certification basics.',
    officialSource: { label: 'APEX Accelerators', url: 'https://www.apexaccelerators.us' },
  },
  {
    term: 'Set-asides: 8(a) / SDVOSB / WOSB',
    aka: ['8(a)', 'SDVOSB', 'WOSB', 'HUBZone', 'small business set-aside'],
    category: 'Contracting Basics',
    plain:
      'Competitions restricted to specific categories of small business, which shrinks the field you compete against. Certification goes through the SBA; your status is then claimed in your SAM.gov representations.',
    details: [
      '8(a): a nine-year SBA business-development program for firms owned by socially and economically disadvantaged individuals; includes sole-source eligibility.',
      'SDVOSB: service-disabled-veteran-owned small business set-asides.',
      'WOSB: women-owned small business set-asides in designated industries.',
      'HUBZone: set-asides for firms located in (and hiring from) Historically Underutilized Business Zones.',
    ],
    whyItMatters:
      'If your ownership qualifies, certification meaningfully shrinks your competition — some awards are restricted to, or sole-sourced within, these categories. Certify early; processing takes months.',
    officialSource: {
      label: 'SBA — contracting assistance programs',
      url: 'https://www.sba.gov/federal-contracting/contracting-assistance-programs',
    },
  },
  {
    term: 'TRL (Technology Readiness Level)',
    aka: ['TRL 1-9', 'technology maturity'],
    category: 'Contracting Basics',
    plain:
      'A 1-to-9 scale describing how mature a technology is: TRL 1 is basic research on paper; TRL 9 is a system proven in real operations. Program offices use it as shorthand for what maturity they intend to fund.',
    details: [
      'TRL 6 — a prototype demonstrated in a relevant environment — is a common bar for transitioning into acquisition programs.',
      'Rough SBIR mapping: Phase I work often sits around TRL 2–4, Phase II around TRL 4–6.',
      'State your TRL honestly with evidence; evaluators calibrate inflated claims very quickly.',
    ],
    whyItMatters:
      'Solicitations often state a target TRL. Reading it tells you instantly whether an opportunity wants your lab result or your production unit — and whether you should bid at all.',
    officialSource: { label: 'GAO — TRL assessment guide', url: 'https://www.gao.gov/products/gao-20-48g' },
  },

  // -------------------------------------------------------------------------
  // Your Toolchain
  // -------------------------------------------------------------------------
  {
    term: 'DIBNet',
    aka: ['dibnet.dod.mil', 'cyber incident reporting', 'Medium Assurance Certificate'],
    category: 'Your Toolchain',
    plain:
      "DoD's portal (dibnet.dod.mil) for defense-industrial-base cyber incident reporting. If DFARS 252.204-7012 is in your contract and you discover a reportable cyber incident, this is where the mandatory report goes — within 72 hours.",
    details: [
      'Logging in to submit a report requires a DoD-approved Medium Assurance Certificate (an external PKI certificate). Obtaining one takes days — get it before you ever need it, and note certificates expire.',
      'The portal also hosts information about DoD\'s voluntary DIB cybersecurity program.',
      'Build the 72-hour duty, the portal URL, and the certificate location into your written incident-response plan.',
    ],
    whyItMatters:
      'During an actual breach you will not have spare days to procure a login certificate. "Get the DIBNet cert early" is the single most common wish-we-had item among first-time contractors who hit an incident.',
    officialSource: { label: 'DIBNet — dibnet.dod.mil', url: 'https://dibnet.dod.mil' },
  },
  {
    term: 'SPRS',
    aka: ['Supplier Performance Risk System', 'SPRS score', 'PIEE'],
    category: 'Your Toolchain',
    plain:
      "DoD's Supplier Performance Risk System — the database contracting officers check before award, and the place your NIST SP 800-171 self-assessment score is posted. Under DFARS 7019, no current score in SPRS means no award consideration.",
    details: [
      'Scores use the DoD Assessment Methodology and range from -203 to a perfect 110; the score must be no more than three years old.',
      'Access runs through PIEE (the Procurement Integrated Enterprise Environment) — account setup takes time, so do it early.',
      'Post the honest number. An optimistic score is a written representation to the government, and misstatements have driven False Claims Act cases.',
      'CMMC statuses and annual affirmations also surface through SPRS.',
    ],
    whyItMatters:
      'This is the "no score, no award" gate — and posting a score takes an afternoon once your self-assessment is done. It is usually the highest-leverage single task in early readiness.',
    officialSource: { label: 'SPRS — sprs.csd.disa.mil', url: 'https://www.sprs.csd.disa.mil' },
  },
  {
    term: 'SIEM (and Wazuh)',
    aka: ['Security Information and Event Management', 'Wazuh', 'log aggregation'],
    category: 'Your Toolchain',
    plain:
      'Security Information and Event Management — software that collects logs from your systems in one place and raises alerts on suspicious activity. Wazuh is a widely used open-source option. Several 800-171 audit and monitoring requirements are far easier to satisfy with one running.',
    details: [
      'Central log collection generates much of the evidence for the Audit & Accountability (AU) family of 800-171 requirements.',
      'Open-source options (Wazuh, Security Onion) trade setup effort for license cost; commercial options (Microsoft Sentinel, Splunk) trade the reverse.',
      'Logs from CUI systems can themselves be sensitive — keep the SIEM inside your assessed boundary, or send it metadata only.',
    ],
    whyItMatters:
      'A SIEM is both an alarm system and an evidence generator: when an assessor asks "show me your audit logs and alerting", this is the demonstration.',
    officialSource: { label: 'NIST CSRC glossary', url: 'https://csrc.nist.gov/glossary' },
  },
  {
    term: 'MSP vs MSSP',
    aka: ['Managed Service Provider', 'Managed Security Service Provider', 'External Service Provider', 'ESP'],
    category: 'Your Toolchain',
    plain:
      'An MSP (Managed Service Provider) runs your IT; an MSSP (Managed Security Service Provider) runs your security monitoring. Many small contractors outsource both — and under CMMC, a provider with access to your in-scope systems gets pulled into your assessment scope.',
    details: [
      'A provider with administrative access to in-scope systems is an External Service Provider in CMMC scoping — their controls and practices get examined alongside yours.',
      'Before signing, ask any prospective MSP/MSSP for their own NIST SP 800-171 / CMMC posture in writing, and how they support customer assessments.',
      'Outsourcing operations never outsources responsibility: the SPRS score and the annual affirmation are signed by your company, not your vendor.',
    ],
    whyItMatters:
      'The wrong provider can quietly break your compliance story; the right one is the cheapest security team a two-person company can hire. Vet them like the assessor will.',
    officialSource: { label: 'CISA — cisa.gov', url: 'https://www.cisa.gov' },
  },
];
