/**
 * FUSARIUM Launchpad — curated Resource Graph baseline catalog.
 *
 * A typed const array, NOT database seeds: this is editorial content that
 * ships with the app and versions with the code. Tenant-added custom cards
 * live in launchpad_resource_cards; the curated baseline lives here.
 *
 * Editorial rules (violations are content bugs):
 *  - Plain-text vendor names, neutral descriptions, no logos.
 *  - Every card discloses the relationship: relationship_type 'none' with the
 *    exact FTC material-connection disclosure below.
 *  - NEVER "official partner", "approved", "certified by", or "recommended by
 *    the government". NEVER "use this and you are CMMC compliant".
 *  - Education-first: jargon is defined inline the first time it appears, and
 *    every card says when a thing is required AND when it is not — founders
 *    new to government work waste money on gear and services they don't need.
 */

export type ResourceCategoryKey =
  | 'enclave'
  | 'supplier_network'
  | 'network'
  | 'formation'
  | 'cap_table'
  | 'federal_registration'
  | 'funding';

/** Custom (tenant-added) cards may also use 'other'. */
export type CustomResourceCategory = ResourceCategoryKey | 'other';

export const INDEPENDENCE_DISCLOSURE =
  'Independent resource — Mycosoft receives no compensation for this listing.';

export const CATALOG_LAST_VERIFIED = '2026-08-13';

export interface ResourceCatalogCard {
  id: string;
  category: ResourceCategoryKey;
  vendor: string;
  offering: string;
  /** What it is and why a founder might consider it — plain language. */
  why_consider: string;
  /** The honest trigger: when you actually need this. */
  when_required: string;
  /** The honest anti-sell: when you do NOT need this yet. */
  when_not_required: string;
  /** Where relevant: what data belongs in / near this resource. */
  data_allowed?: string[];
  /** Where relevant: what data must never go there. */
  data_not_allowed?: string[];
  relationship_type: 'none';
  /** Exact FTC material-connection disclosure — same string on every card. */
  disclosure: string;
  alternatives: string[];
  last_verified: string;
  /** Official domain, or null for vendor classes / process steps. */
  external_url: string | null;
  /**
   * Vendor mark. Render ONLY when logo_license records a real brand-kit / press
   * page basis. Government seals are never stored here. Default: omit / null
   * → UI shows a neutral monogram (GTM §18.1).
   */
  logo_src?: string | null;
  /** Human-readable license basis, e.g. "vendor brand kit: https://…". */
  logo_license?: string | null;
  /** Position for ordered categories (decision tree, registration path). */
  step?: number;
}

export interface ResourceCategoryMeta {
  key: ResourceCategoryKey;
  label: string;
  /** 'ordered' renders numbered steps (decision tree / registration path). */
  kind: 'list' | 'ordered';
  blurb: string;
}

export const RESOURCE_CATEGORIES: ResourceCategoryMeta[] = [
  {
    key: 'enclave',
    label: 'Secure collaboration / CUI enclave',
    kind: 'list',
    blurb:
      'CUI (Controlled Unclassified Information) is government information that must be safeguarded — technical drawings, specs, or data a defense contract marks for protection. It cannot live in ordinary email or a consumer cloud drive; it needs a protected environment (an "enclave"). You only need one of these once CUI is actually headed your way — each card below says when that is.',
  },
  {
    key: 'supplier_network',
    label: 'Supplier / assessment networks',
    kind: 'list',
    blurb:
      'Prime contractors (the large companies that hold the government contract and buy from you) run their suppliers through shared onboarding and assessment networks. You usually join these when a prime asks — not before.',
  },
  {
    key: 'network',
    label: 'Network & infrastructure — a decision tree',
    kind: 'ordered',
    blurb:
      'Work through these as decisions in order, not a shopping list. At each step ask: do we need this yet, and what is the smallest honest version? A pile of gear does not make a company secure or CMMC compliant; a network you understand and can produce evidence from does.',
  },
  {
    key: 'formation',
    label: 'Corporate formation',
    kind: 'list',
    blurb:
      'Get the company itself right before the federal registrations — every registration and contract hangs off a clean legal entity. Nothing here is legal advice; a real attorney beats any checklist for non-standard situations.',
  },
  {
    key: 'cap_table',
    label: 'Cap table / equity',
    kind: 'list',
    blurb:
      'Your cap table (capitalization table — the record of who owns what) must stay accurate from day one. Equity mistakes compound quietly and surface at the worst time: fundraising or acquisition diligence.',
  },
  {
    key: 'federal_registration',
    label: 'Federal registration path',
    kind: 'ordered',
    blurb:
      'The path to being eligible for federal work, in order — each step depends on the one before it. Everything here is free: nobody legitimate charges for the registrations themselves. And DUNS is retired — you never need a DUNS number; anyone selling you one is selling you the past.',
  },
  {
    key: 'funding',
    label: 'Funding',
    kind: 'list',
    blurb:
      'Ways companies fund the journey — dilutive (you sell ownership) and non-dilutive (you keep it). No listing here implies funding, endorsement, or any relationship between these organizations and Mycosoft; see the disclosure on every card.',
  },
];

export function resourceCategoryLabel(key: string): string {
  const meta = RESOURCE_CATEGORIES.find((c) => c.key === key);
  return meta ? meta.label : 'Other';
}

/** Whitelist for tenant-added custom cards. */
export const CUSTOM_RESOURCE_CATEGORIES: CustomResourceCategory[] = [
  ...RESOURCE_CATEGORIES.map((c) => c.key),
  'other',
];

const shared = {
  relationship_type: 'none' as const,
  disclosure: INDEPENDENCE_DISCLOSURE,
  last_verified: CATALOG_LAST_VERIFIED,
  logo_src: null as string | null,
  logo_license: null as string | null,
};

export const RESOURCE_CATALOG: ResourceCatalogCard[] = [
  // -------------------------------------------------------------------------
  // Secure collaboration / CUI enclave
  // -------------------------------------------------------------------------
  {
    ...shared,
    id: 'enclave-preveil',
    category: 'enclave',
    vendor: 'PreVeil',
    offering: 'Encrypted email and file sharing used for CUI enclaves',
    why_consider:
      'End-to-end encrypted email and drive that overlays your existing accounts, commonly used by small defense contractors as a lower-cost CUI enclave. It is a FedRAMP-authorized platform — verify its current authorization yourself on the FedRAMP Marketplace before relying on it, and confirm the plan you buy matches your contract requirements.',
    when_required:
      'When a contract (or a prime) is about to send you CUI or export-controlled technical data and you need a protected place to receive and store it.',
    when_not_required:
      'Before any CUI exists in your world. A plain commercial email and drive setup is fine for ordinary business data.',
    data_allowed: ['CUI and export-controlled technical data, inside the enclave, per your contract terms'],
    data_not_allowed: [
      'Classified information — CUI tools never hold classified data',
      'Anything your contract routes to a different named system',
    ],
    alternatives: ['Microsoft 365 GCC High', 'AWS GovCloud (US)', 'Google Workspace Assured Workloads', 'Self-hosted enclave'],
    external_url: 'https://www.preveil.com',
  },
  {
    ...shared,
    id: 'enclave-gcc-high',
    category: 'enclave',
    vendor: 'Microsoft',
    offering: 'Microsoft 365 GCC High',
    why_consider:
      'The full Microsoft 365 suite (mail, Teams, SharePoint, Office) delivered from a US-sovereign environment widely used across the defense industrial base. Licensing runs through approved resellers, costs meaningfully more than commercial Microsoft 365, and migration takes real planning.',
    when_required:
      'When your whole team needs to work on CUI day-to-day inside standard office tools, or a customer contractually requires it.',
    when_not_required:
      'For a one-to-five-person company with no CUI in hand — the cost and migration effort rarely pay off yet.',
    data_allowed: ['CUI and export-controlled data within the properly configured environment, per your contract terms'],
    data_not_allowed: ['Classified information'],
    alternatives: ['PreVeil', 'AWS GovCloud (US)', 'Self-hosted enclave'],
    external_url: 'https://www.microsoft.com/en-us/microsoft-365/government',
  },
  {
    ...shared,
    id: 'enclave-aws-govcloud',
    category: 'enclave',
    vendor: 'Amazon Web Services',
    offering: 'AWS GovCloud (US)',
    why_consider:
      'Isolated AWS regions operated by vetted US persons, built for workloads carrying CUI or ITAR requirements. It provides infrastructure building blocks — not email or office collaboration out of the box — so you design, build, and operate whatever runs there.',
    when_required:
      'When you run your own software or data pipelines that must process CUI or export-controlled data.',
    when_not_required:
      'When all you need is protected email and file storage — an enclave suite is far less work than building on raw cloud infrastructure.',
    data_allowed: ['CUI / ITAR workloads you architect and operate, per your contract terms'],
    data_not_allowed: ['Classified information'],
    alternatives: ['Microsoft Azure Government', 'Google Assured Workloads', 'Self-hosted enclave'],
    external_url: 'https://aws.amazon.com/govcloud-us/',
  },
  {
    ...shared,
    id: 'enclave-google-assured',
    category: 'enclave',
    vendor: 'Google',
    offering: 'Workspace Assured Controls / Cloud Assured Workloads',
    why_consider:
      'Google’s controls packages for government-aligned work: Assured Workloads on Google Cloud, and Assured Controls features for Google Workspace. Coverage differs by product and by contract requirement — map your specific obligations against what each package actually asserts before committing.',
    when_required:
      'When your team is committed to Google tooling and you have confirmed your contract requirements can be satisfied there.',
    when_not_required:
      'When your requirement names a different environment, or you have no CUI-bearing work yet.',
    data_allowed: ['Data the configured controls package is scoped to hold, per your contract terms'],
    data_not_allowed: ['Classified information'],
    alternatives: ['PreVeil', 'Microsoft 365 GCC High', 'AWS GovCloud (US)'],
    external_url: 'https://cloud.google.com/assured-workloads',
  },
  {
    ...shared,
    id: 'enclave-self-hosted',
    category: 'enclave',
    vendor: 'Self-hosted',
    offering: 'Customer-built and operated enclave',
    why_consider:
      'An environment you stand up and run yourself. Maximum control and no per-seat fees — but you inherit every security control alone instead of sharing responsibility with a provider, and you must produce all of the evidence yourself. Usually the hardest path for a small team.',
    when_required:
      'When connectivity, data-sovereignty, or architecture constraints rule out the hosted options.',
    when_not_required:
      'When a hosted enclave meets the requirement — most small contractors are better served buying this than building it.',
    alternatives: ['PreVeil', 'Microsoft 365 GCC High', 'AWS GovCloud (US)'],
    external_url: null,
  },

  // -------------------------------------------------------------------------
  // Supplier / assessment networks
  // -------------------------------------------------------------------------
  {
    ...shared,
    id: 'supplier-exostar',
    category: 'supplier_network',
    vendor: 'Exostar',
    offering: 'Supplier onboarding and assessment network',
    why_consider:
      'An identity and supplier-management network used across aerospace and defense primes. When a prime onboards you as a supplier, there is a good chance the paperwork, questionnaires, and assessments flow through an Exostar account they ask you to create.',
    when_required:
      'When a prime or large customer directs you to register — they will tell you exactly which services to enroll in.',
    when_not_required:
      'Speculatively. Creating accounts before a prime asks buys you nothing.',
    data_allowed: ['Company facts and questionnaire answers you choose to submit'],
    data_not_allowed: ['Your SAM.gov or portal passwords — never share credentials with anyone, including consultants'],
    alternatives: ['Direct supplier portals run by individual primes'],
    external_url: 'https://www.exostar.com',
  },

  // -------------------------------------------------------------------------
  // Network & infrastructure — decision tree (GTM §18.4)
  // -------------------------------------------------------------------------
  {
    ...shared,
    id: 'net-fiber',
    category: 'network',
    step: 1,
    vendor: 'Internet service (decision)',
    offering: 'Fiber serviceability by ZIP / address',
    why_consider:
      'Start here: check which carriers actually serve your address before you design anything. Business fiber with static IP addresses changes what is possible downstream — VPNs, offsite backups, hosting anything on-premises. Carrier serviceability checkers and your local APEX Accelerator can tell you what is available.',
    when_required: 'Before signing a lease or committing to an office network design.',
    when_not_required: 'Fully remote teams — skip the office build-out entirely until there is an office.',
    alternatives: ['Business cable or fixed wireless where fiber is unavailable'],
    external_url: null,
  },
  {
    ...shared,
    id: 'net-firewall',
    category: 'network',
    step: 2,
    vendor: 'Managed firewall / router (decision)',
    offering: 'The boundary device for your network',
    why_consider:
      'The firewall/router is the border of your network — it decides what traffic comes in and out, and it is where much of your first security evidence (rules, logs) comes from. Ubiquiti (UniFi) is one example of a prosumer-managed vendor class many small teams can operate themselves; enterprise firewall vendors and managed service providers are the usual alternatives. Pick the one you can actually configure, update, and export logs from.',
    when_required: 'The moment you have an office network carrying company data.',
    when_not_required: 'A fully remote company with no office network — endpoint management matters more first.',
    data_allowed: ['Configuration and log evidence you export and keep in your own systems'],
    data_not_allowed: ['Raw packet captures or firewall logs into Launchpad — references and hashes only'],
    alternatives: ['Ubiquiti (UniFi)-class gear', 'Enterprise firewall vendors', 'Managed service provider-run networking'],
    external_url: null,
  },
  {
    ...shared,
    id: 'net-switch-vlan',
    category: 'network',
    step: 3,
    vendor: 'Managed switch + VLANs (decision)',
    offering: 'Segmenting one network into isolated lanes',
    why_consider:
      'A VLAN (virtual LAN) splits one physical network into isolated segments — guest Wi-Fi, lab equipment, and business systems each in their own lane, unable to reach each other unless you allow it. A managed switch is the hardware that makes VLANs possible.',
    when_required:
      'When more than a handful of devices share your network, or anything untrusted (guests, lab hardware, IoT) plugs in.',
    when_not_required: 'A two-laptop office — segmentation can wait until there is something to segment.',
    alternatives: ['Separate physical networks (rarely worth it at small scale)'],
    external_url: null,
  },
  {
    ...shared,
    id: 'net-wifi',
    category: 'network',
    step: 4,
    vendor: 'Wi-Fi access points (decision)',
    offering: 'Business-grade wireless on the same management plane',
    why_consider:
      'Business-grade access points join the same management plane as your firewall and switch, giving you separate wireless networks per VLAN (a guest network that is truly separate) and visibility into what is connected.',
    when_required: 'Any office Wi-Fi that touches business systems.',
    when_not_required:
      'If the consumer router your ISP shipped is the whole network and no sensitive work happens there yet — but replace it before real data does.',
    alternatives: ['Wired-only offices (rare, but simplest to secure)'],
    external_url: null,
  },
  {
    ...shared,
    id: 'net-nas-backup',
    category: 'network',
    step: 5,
    vendor: 'NAS + backups (decision)',
    offering: 'NAS with immutable / offsite backup',
    why_consider:
      'A NAS (network-attached storage) is a small on-premises file server; the part that matters is the backup design. An immutable backup is a copy that cannot be altered or deleted for a set period — it is what lets you recover from ransomware — and an offsite copy survives fire or theft. The classic 3-2-1 rule: three copies, on two kinds of media, one offsite.',
    when_required: 'As soon as losing your files would hurt — effectively immediately.',
    when_not_required:
      'If everything truly lives in cloud services with their own versioning and you have actually verified you can restore.',
    data_allowed: ['Backup status facts you record as evidence'],
    data_not_allowed: ['Backup contents into Launchpad — the data stays in your systems'],
    alternatives: ['Cloud backup with customer-held encryption keys'],
    external_url: null,
  },
  {
    ...shared,
    id: 'net-ups',
    category: 'network',
    step: 6,
    vendor: 'UPS (decision)',
    offering: 'Uninterruptible power supply for site equipment',
    why_consider:
      'A UPS (uninterruptible power supply) is a battery that rides your equipment through short outages and lets it shut down cleanly in long ones — protecting the NAS and network gear from corruption.',
    when_required: 'Whenever you run on-premises gear whose sudden power loss would corrupt data.',
    when_not_required: 'Fully cloud/laptop teams with no fixed equipment.',
    alternatives: ['Facility-level backup power in serviced offices'],
    external_url: null,
  },
  {
    ...shared,
    id: 'net-endpoint-mgmt',
    category: 'network',
    step: 7,
    vendor: 'Endpoint management (decision)',
    offering: 'Inventory, policy, and patching for company machines',
    why_consider:
      'One place to see every company laptop and desktop, enforce disk encryption and screen locks, push updates, and wipe a lost machine (often called MDM — mobile device management). For a small remote team this is usually the highest-value control: it produces evidence for many requirements at once.',
    when_required:
      'From your second laptop onward, and before any sensitive contract data lands on machines.',
    when_not_required:
      'A single founder with a single machine can start with a written configuration checklist — but write it down.',
    data_allowed: ['Sanitized posture facts (encrypted: yes/no) you record as evidence'],
    data_not_allowed: ['Raw endpoint telemetry into Launchpad'],
    alternatives: ['OS-native management tooling', 'Managed IT providers'],
    external_url: null,
  },
  {
    ...shared,
    id: 'net-logging-siem',
    category: 'network',
    step: 8,
    vendor: 'Logging / SIEM (decision)',
    offering: 'Central log collection and review',
    why_consider:
      'A SIEM (security information and event management system) collects logs from your firewall, endpoints, and servers into one searchable place so problems can be spotted and investigated. Wazuh is an open-source example many small teams start with; commercial SIEMs trade money for less operating effort. Raw logs stay in your own systems — Launchpad never ingests them.',
    when_required:
      'When contract requirements call for audit logging and review, or your device count outgrows checking logs by hand.',
    when_not_required:
      'On day one — get the firewall, endpoints, and backups right first; centralizing their logs comes next.',
    data_allowed: ['Sanitized health summaries you choose to record'],
    data_not_allowed: ['Full or unredacted SIEM logs into Launchpad — references and hashes only'],
    alternatives: ['Commercial SIEM platforms', 'Managed security service providers'],
    external_url: 'https://wazuh.com',
  },
  {
    ...shared,
    id: 'net-cabling',
    category: 'network',
    step: 9,
    vendor: 'Structured cabling (decision)',
    offering: 'Labeled, documented cable plant',
    why_consider:
      'Labeled, documented cable runs with a tidy patch panel. Boring, cheap at build-time, expensive to retrofit — and a labeled network is one you can actually reason about and produce evidence for.',
    when_required: 'Any office build-out or renovation.',
    when_not_required: 'Rented space you will leave within the year — use disciplined labeling instead.',
    alternatives: ['Local low-voltage cabling contractors'],
    external_url: null,
  },

  // -------------------------------------------------------------------------
  // Corporate formation
  // -------------------------------------------------------------------------
  {
    ...shared,
    id: 'formation-clerky',
    category: 'formation',
    vendor: 'Clerky',
    offering: 'Startup formation and legal paperwork',
    why_consider:
      'An online formation service oriented around standardized startup paperwork — Delaware C-corp incorporation, post-incorporation setup, and common financing documents. Standardized documents keep future diligence clean.',
    when_required:
      'When forming a new company and your situation is standard enough for standardized paperwork.',
    when_not_required:
      'Non-standard situations — foreign founders, unusual ownership, existing IP entanglements — go to qualified counsel instead.',
    alternatives: ['Qualified startup counsel', 'Other online formation services'],
    external_url: 'https://www.clerky.com',
  },
  {
    ...shared,
    id: 'formation-counsel',
    category: 'formation',
    vendor: 'Qualified counsel (referral)',
    offering: 'Startup / government-contracts attorney',
    why_consider:
      'A lawyer who has done startup formation and, ideally, government contracting. Worth real money at the moments that are hard to undo: formation choices, equity splits, IP assignment, and your first significant contract.',
    when_required:
      'Anything non-standard, plus a review before you sign your first significant contract or subcontract.',
    when_not_required:
      'Routine filings a formation service handles fine — do not pay hourly rates for standardized paperwork.',
    alternatives: ['Clerky for standardized paperwork', 'State bar referral services'],
    external_url: null,
  },
  {
    ...shared,
    id: 'formation-registered-agent',
    category: 'formation',
    vendor: 'Registered agent (service class)',
    offering: 'Statutory agent for legal and state mail',
    why_consider:
      'Every entity must maintain a registered agent in its state of formation — the official recipient of lawsuits and state notices. A commercial registered-agent service keeps your home address off public records and reliably forwards documents.',
    when_required: 'Always — it is a statutory requirement of having an entity.',
    when_not_required:
      'You may serve as your own agent in your home state, at the cost of your address on the public record and being personally served.',
    alternatives: ['Serving as your own registered agent', 'Formation services and counsel often bundle this'],
    external_url: null,
  },
  {
    ...shared,
    id: 'formation-ein-irs',
    category: 'formation',
    vendor: 'IRS (direct)',
    offering: 'EIN — free, directly from the IRS',
    why_consider:
      'An EIN (Employer Identification Number) is your company’s federal tax ID; banks, payroll, and SAM.gov all want it. The IRS issues it free, online, in minutes. Warning: paid "EIN filing services" charge real money for this free form — never pay a middleman for an EIN.',
    when_required: 'Every company, right after formation.',
    when_not_required: 'It is always required — the only thing to skip is paying someone else to file it.',
    data_not_allowed: ['The EIN value itself does not belong in Launchpad — record where it is kept, not the number'],
    alternatives: ['None — go directly to irs.gov'],
    external_url: 'https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number',
  },
  {
    ...shared,
    id: 'formation-ip-assignment',
    category: 'formation',
    vendor: 'Founder agreements (process)',
    offering: 'Founder IP assignment + confidentiality agreements',
    why_consider:
      'Every founder and contractor signs an agreement assigning the intellectual property they create to the company, plus confidentiality terms. Missing assignments are a classic diligence failure — and in government work they undermine the data-rights assertions your proposals make.',
    when_required:
      'At formation for founders; before the first commit or drawing for every contractor and employee.',
    when_not_required:
      'Never optional once anyone creates IP — retrofitting signatures later gets harder and more expensive.',
    alternatives: ['Standard forms via Clerky or counsel'],
    external_url: null,
  },
  {
    ...shared,
    id: 'formation-records',
    category: 'formation',
    vendor: 'Corporate records (process)',
    offering: 'Board and stockholder records',
    why_consider:
      'Board minutes, written consents, and a current stock ledger. Ten minutes per decision, kept current — versus a costly clean-up when an investor or contracting officer wants proof of who owns and controls the company. Ownership and control questions also feed government FOCI (foreign ownership, control, or influence) reviews later.',
    when_required: 'From formation onward — every board action and stock issuance gets papered.',
    when_not_required: 'It is never safe to skip; small companies just have fewer records, not none.',
    alternatives: ['Cap-table tooling and counsel both help maintain these'],
    external_url: null,
  },
  {
    ...shared,
    id: 'formation-insurance',
    category: 'formation',
    vendor: 'Business insurance (service class)',
    offering: 'General liability and contract-driven coverage',
    why_consider:
      'General liability is the baseline most landlords and customers expect. Government contracts and primes often specify additional coverage — professional liability, cyber — with minimum limits written into the contract text. Read the clause before buying; coverage requirements are contract-specific.',
    when_required:
      'General liability when you sign a lease or a customer requires it; contract-specific lines when a contract names them.',
    when_not_required:
      'Speculative policies for contracts you have not won — buy what the signed contract actually requires.',
    alternatives: ['Business insurance brokers', 'Direct small-business insurers'],
    external_url: null,
  },

  // -------------------------------------------------------------------------
  // Cap table / equity
  // -------------------------------------------------------------------------
  {
    ...shared,
    id: 'captable-pulley',
    category: 'cap_table',
    vendor: 'Pulley',
    offering: 'Cap table and equity management',
    why_consider:
      'Software for tracking ownership, issuing option grants, modeling SAFEs and rounds, and coordinating 409A valuations (the independent appraisal that sets your option strike price). The value is one accurate, always-current ownership record instead of a drifting spreadsheet.',
    when_required:
      'Once you have more than founder shares — the first SAFE, option grant, or advisor share makes tooling worth it.',
    when_not_required:
      'A solo founder holding 100% can wait — but paper every issuance properly in the meantime.',
    alternatives: ['Carta (widely used alternative)', 'Spreadsheet plus counsel at the very earliest stage'],
    external_url: 'https://pulley.com',
  },

  // -------------------------------------------------------------------------
  // Federal registration path — ordered steps
  // -------------------------------------------------------------------------
  {
    ...shared,
    id: 'fed-login-gov',
    category: 'federal_registration',
    step: 1,
    vendor: 'Login.gov',
    offering: 'Create your Login.gov account',
    why_consider:
      'Login.gov is the shared sign-in account used across federal systems, including SAM.gov. Create it first — with a company email address (not a personal one) and strong multi-factor authentication — because everything else hangs off it.',
    when_required: 'First step for any federal registration.',
    when_not_required: 'Only if you will never touch a federal system.',
    alternatives: ['None — this is the standard federal sign-in'],
    external_url: 'https://login.gov',
  },
  {
    ...shared,
    id: 'fed-sam-registration',
    category: 'federal_registration',
    step: 2,
    vendor: 'SAM.gov',
    offering: 'Register your entity in SAM.gov',
    why_consider:
      'SAM (System for Award Management) is the government’s master vendor registry — you cannot receive a federal award without an active SAM registration. Registration is free at sam.gov. Third parties will offer to do it for a fee, and some are outright scams that phish new registrants.',
    when_required: 'Before any federal award, including SBIR/STTR.',
    when_not_required:
      'If you only ever sell to primes as a subcontractor you can sometimes defer it — but most primes still want it done.',
    alternatives: ['Free help: your local APEX Accelerator'],
    external_url: 'https://sam.gov',
  },
  {
    ...shared,
    id: 'fed-uei',
    category: 'federal_registration',
    step: 3,
    vendor: 'SAM.gov',
    offering: 'UEI — issued during SAM registration',
    why_consider:
      'The UEI (Unique Entity ID) is the 12-character identifier the government uses for your company. It is issued inside SAM.gov during registration, at no cost. DUNS is retired — a DUNS number is never needed for federal registration.',
    when_required: 'Automatic within step 2 — nothing separate to do.',
    when_not_required:
      'Never pay anyone for an "entity identifier" — the UEI is free and there is no other one.',
    alternatives: ['None — the UEI is the only entity identifier you need'],
    external_url: 'https://sam.gov',
  },
  {
    ...shared,
    id: 'fed-validation-repcerts',
    category: 'federal_registration',
    step: 4,
    vendor: 'SAM.gov',
    offering: 'Entity validation + Reps & Certs',
    why_consider:
      'SAM validates your legal entity against its documentation — name and address mismatches are the classic delay, so make everything match your formation documents exactly. Then you complete Representations & Certifications: standardized questions about size, ownership, and business status that contracting officers rely on. Answer accurately — they carry legal weight.',
    when_required: 'Part of completing SAM registration.',
    when_not_required: 'Not skippable — an incomplete registration cannot receive awards.',
    alternatives: ['Free help: APEX Accelerators'],
    external_url: 'https://sam.gov',
  },
  {
    ...shared,
    id: 'fed-cage-code',
    category: 'federal_registration',
    step: 5,
    vendor: 'DLA (via SAM.gov)',
    offering: 'CAGE code — assigned during registration',
    why_consider:
      'The CAGE (Commercial and Government Entity) code is a five-character site identifier assigned automatically by DLA (the Defense Logistics Agency) as part of SAM registration. There is no separate application and no fee — it arrives as your registration completes. DoD systems and many forms ask for it later, so record it.',
    when_required: 'Automatic — no action beyond completing SAM registration.',
    when_not_required: 'Never pay for CAGE "assignment" — it has no fee.',
    alternatives: ['None — assigned automatically'],
    external_url: 'https://cage.dla.mil',
  },
  {
    ...shared,
    id: 'fed-annual-renewal',
    category: 'federal_registration',
    step: 6,
    vendor: 'SAM.gov',
    offering: 'Annual renewal',
    why_consider:
      'SAM registration expires every 365 days. Calendar the renewal at least 45 days ahead: a lapsed registration blocks new awards AND payments on existing ones. Renewal is free — and beware renewal-scam emails; only act inside sam.gov itself.',
    when_required: 'Every year, while you do federal work.',
    when_not_required: 'Only once you have permanently exited federal contracting.',
    alternatives: ['Track it in your compliance calendar'],
    external_url: 'https://sam.gov',
  },

  // -------------------------------------------------------------------------
  // Funding
  // -------------------------------------------------------------------------
  {
    ...shared,
    id: 'funding-boost-vc',
    category: 'funding',
    vendor: 'Boost VC (example accelerator)',
    offering: 'Accelerator programs',
    why_consider:
      'Accelerators trade a small investment and a structured program for equity. Boost VC is listed factually as one example of an accelerator that invests in frontier and deep-tech companies; hundreds of others exist with different theses. Evaluate any program on the concrete terms offered. No listing implies funding or endorsement.',
    when_required: 'Never required — a fit question: speed, network, and structure in exchange for equity.',
    when_not_required:
      'If the equity cost outweighs what the program concretely provides for your stage.',
    alternatives: ['Other accelerators', 'Angel investors', 'Bootstrapping'],
    external_url: 'https://www.boost.vc',
  },
  {
    ...shared,
    id: 'funding-vc',
    category: 'funding',
    vendor: 'Venture capital (class)',
    offering: 'Institutional equity funding',
    why_consider:
      'Venture funds buy equity in companies aiming to grow fast enough to return their fund. Defense-focused funds exist and understand long government sales cycles better than generalists. Dilutive by definition — you are selling ownership and adding stakeholders. No listing implies funding or endorsement.',
    when_required:
      'Never required — many strong government-market companies grow on revenue and non-dilutive funding alone.',
    when_not_required:
      'When SBIR/STTR and early contracts can fund the same milestones without giving up ownership.',
    alternatives: ['SBIR/STTR (non-dilutive)', 'Revenue-funded growth', 'Angel investors'],
    external_url: null,
  },
  {
    ...shared,
    id: 'funding-sbir-sttr',
    category: 'funding',
    vendor: 'SBIR / STTR (federal program)',
    offering: 'Non-dilutive federal R&D funding',
    why_consider:
      'SBIR (Small Business Innovation Research) and STTR (Small Business Technology Transfer) award federal R&D money without taking equity — you keep full ownership. STTR additionally requires partnering with a research institution. Awards are competitive and milestone-based, and require an active SAM registration (see the Federal registration path).',
    when_required: 'Not required — but often the best first federal dollars for a technology company.',
    when_not_required:
      'If your product needs no R&D push, or you cannot yet support the proposal and reporting effort.',
    alternatives: ['Agency BAAs and prize competitions', 'APEX Accelerators for free guidance'],
    external_url: 'https://www.sbir.gov',
  },
  {
    ...shared,
    id: 'funding-apex-accelerators',
    category: 'funding',
    vendor: 'APEX Accelerators (DoD program)',
    offering: 'Free government-contracting assistance',
    why_consider:
      'APEX Accelerators (formerly PTACs — Procurement Technical Assistance Centers) are a DoD-funded network of advisors who help small businesses with registrations, market research, and first contracts at no cost. This is the free help everyone should actually use — start here before paying any consultant.',
    when_required: 'Never required — but the free counseling is the best value in this directory.',
    when_not_required: 'There is rarely a reason to skip free, government-funded help.',
    alternatives: ['SBA resource partners (SBDC, SCORE)'],
    external_url: 'https://www.apexaccelerators.us',
  },
];
