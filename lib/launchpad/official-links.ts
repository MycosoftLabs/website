/**
 * FUSARIUM Launchpad — curated official-documentation links.
 *
 * One typed library feeding every education/requirements surface (training,
 * Tier-1, requirements register, advisory, resources, glossary), so a founder
 * who has never done government work always has the authoritative source one
 * click away — and so we never scatter half-remembered URLs across pages.
 *
 * RULES
 * - Official/government sources are TEXT LINKS ONLY. Agency seals and logos
 *   are legally protected marks — never render them.
 * - Vendor links are plain-text names (GTM §18.1): no logos here; logo assets
 *   live on resource cards and only with a recorded license basis.
 * - Every entry says WHY a founder would open it, in plain language.
 * - Links verified 2026-08-13. If a link rots, fix it here — nowhere else.
 */

export interface OfficialLink {
  label: string;
  url: string;
  /** One founder-plain sentence: what you'll find and why you'd open it. */
  why: string;
  kind: 'regulation' | 'guidance' | 'portal' | 'training' | 'vendor-docs';
}

// ---------------------------------------------------------------------------
// Core regulatory + guidance set (requirements register, score, SSP, reports)
// ---------------------------------------------------------------------------
export const REGULATORY_LINKS: OfficialLink[] = [
  {
    label: 'NIST SP 800-171 Rev. 2 (the 110 requirements)',
    url: 'https://csrc.nist.gov/pubs/sp/800/171/r2/upd1/final',
    why: 'The source text of every requirement you are marking in the register.',
    kind: 'regulation',
  },
  {
    label: '32 CFR Part 170 (the CMMC program rule)',
    url: 'https://www.ecfr.gov/current/title-32/subtitle-A/chapter-I/subchapter-G/part-170',
    why: 'The scoring methodology, POA&M eligibility, 180-day closeout, and the self-assessment rules this workspace implements.',
    kind: 'regulation',
  },
  {
    label: 'DoD CIO — CMMC program page',
    url: 'https://dodcio.defense.gov/CMMC/',
    why: 'Current program status straight from the Department — including phase timing changes.',
    kind: 'guidance',
  },
  {
    label: 'DFARS 252.204-7012 (safeguarding + 72-hour incident reporting)',
    url: 'https://www.acquisition.gov/dfars/252.204-7012-safeguarding-covered-defense-information-and-cyber-incident-reporting.',
    why: 'The contract clause that makes all of this binding once you hold a covered contract.',
    kind: 'regulation',
  },
  {
    label: 'DFARS 252.204-7019 / 7020 (assessment + SPRS posting requirements)',
    url: 'https://www.acquisition.gov/dfars/252.204-7019-notice-nist-sp-800-171-dod-assessment-requirements.',
    why: 'Why your self-assessment score has to be posted in SPRS before award.',
    kind: 'regulation',
  },
  {
    label: 'NARA CUI Registry',
    url: 'https://www.archives.gov/cui',
    why: 'The official list of what counts as CUI, category by category.',
    kind: 'guidance',
  },
];

// ---------------------------------------------------------------------------
// Portals (registrations, Tier-1 DIBNet, SPRS upload)
// ---------------------------------------------------------------------------
export const PORTAL_LINKS: OfficialLink[] = [
  {
    label: 'SAM.gov',
    url: 'https://sam.gov',
    why: 'Entity registration, your UEI, reps & certs, and annual renewal — the front door to federal contracting.',
    kind: 'portal',
  },
  {
    label: 'Login.gov',
    url: 'https://login.gov',
    why: 'The shared government sign-in you need before SAM.gov and most other portals.',
    kind: 'portal',
  },
  {
    label: 'SPRS (via PIEE)',
    url: 'https://piee.eb.mil',
    why: 'Where you post your NIST SP 800-171 self-assessment score — contracting officers check it here.',
    kind: 'portal',
  },
  {
    label: 'DIBNet',
    url: 'https://dibnet.dod.mil',
    why: 'The DoD cyber incident reporting portal — DFARS 7012 gives you 72 hours to report here.',
    kind: 'portal',
  },
  {
    label: 'DSIP (DoD SBIR/STTR)',
    url: 'https://www.dodsbirsttr.mil',
    why: 'Where DoD small-business innovation topics are posted and proposals are submitted.',
    kind: 'portal',
  },
  {
    label: 'Grants.gov',
    url: 'https://grants.gov',
    why: 'Federal grant opportunities and submissions, including many research programs.',
    kind: 'portal',
  },
  {
    label: 'Cyber AB Marketplace (find a C3PAO or RP)',
    url: 'https://cyberab.org/Catalog',
    why: 'The accreditation body directory — where you find certified assessors and registered practitioners when you want outside help.',
    kind: 'portal',
  },
  {
    label: 'DCSA (clearances + facility security)',
    url: 'https://www.dcsa.mil',
    why: 'The agency behind personnel clearances and facility clearances — authoritative answers on sponsorship and process.',
    kind: 'portal',
  },
];

// ---------------------------------------------------------------------------
// Free training sources (training tracker, Tier-1 AT records)
// Assign these as course links — completion records stay in your workspace,
// certificates stay in your systems.
// ---------------------------------------------------------------------------
export const TRAINING_LINKS: OfficialLink[] = [
  {
    label: 'DoD Mandatory CUI Training (DoDM 5200.48 aligned)',
    url: 'https://securityawareness.dcsa.mil/cui/index.html',
    why: 'The standard free CUI awareness course — the usual pick for AT.L2-3.2.1 evidence at a small contractor.',
    kind: 'training',
  },
  {
    label: 'Project Spectrum',
    url: 'https://www.projectspectrum.io',
    why: 'DoD-funded free cybersecurity training and readiness content built specifically for small defense suppliers.',
    kind: 'training',
  },
  {
    label: 'FedVTE (free federal cybersecurity training)',
    url: 'https://fedvte.usalearning.gov',
    why: 'A free catalog of role-based security courses — useful for AT.L2-3.2.2 role-specific training.',
    kind: 'training',
  },
  {
    label: 'CISA — free cybersecurity services & tools',
    url: 'https://www.cisa.gov/resources-tools/resources/free-cybersecurity-services-and-tools',
    why: 'Free scanning and awareness resources that small teams can actually use.',
    kind: 'training',
  },
  {
    label: 'DIB-CS program (DoD-DIB cybersecurity services)',
    url: 'https://dibnet.dod.mil/dibcsprogram/',
    why: 'Voluntary DoD threat-sharing and services program for defense-industrial-base companies.',
    kind: 'training',
  },
];

// ---------------------------------------------------------------------------
// Vendor documentation (enclave, signatures, booking, formation, cap table,
// networking). Text links, plain names — logos live on resource cards only,
// and only with a recorded license basis.
// ---------------------------------------------------------------------------
export const VENDOR_DOC_LINKS: OfficialLink[] = [
  { label: 'PreVeil — compliance documentation', url: 'https://www.preveil.com/compliance/', why: 'Shared-responsibility and CMMC documentation for the PreVeil enclave many small contractors use.', kind: 'vendor-docs' },
  { label: 'Exostar — support & onboarding docs', url: 'https://www.exostar.com/support/', why: 'Supplier onboarding and assessment documentation used across aerospace & defense primes.', kind: 'vendor-docs' },
  { label: 'DocuSign — developer & admin docs', url: 'https://developers.docusign.com', why: 'Envelope, signer, and Connect-webhook documentation behind the Launchpad signature pipeline.', kind: 'vendor-docs' },
  { label: 'Cal.com — docs', url: 'https://cal.com/docs', why: 'Scheduling, calendar-federation, and webhook documentation behind advisory booking.', kind: 'vendor-docs' },
  { label: 'Clerky — how it works', url: 'https://www.clerky.com', why: 'Startup formation and standard legal paperwork; a common formation path alongside counsel.', kind: 'vendor-docs' },
  { label: 'Pulley — docs & guides', url: 'https://pulley.com', why: 'Cap-table setup and equity management guides.', kind: 'vendor-docs' },
  { label: 'Ubiquiti UniFi — documentation', url: 'https://help.ui.com', why: 'Prosumer-managed networking (gateways, VLANs, APs) documentation — one example vendor class for the wired-office checklist.', kind: 'vendor-docs' },
  { label: 'Wazuh — documentation', url: 'https://documentation.wazuh.com', why: 'The open-source SIEM/agent stack referenced in the logging checklist.', kind: 'vendor-docs' },
  { label: 'Stripe — Checkout & webhooks', url: 'https://docs.stripe.com/payments/checkout', why: 'How Launchpad checkout and entitlement webhooks work — Stripe is the payment system of record.', kind: 'vendor-docs' },
  { label: 'FedRAMP Marketplace', url: 'https://marketplace.fedramp.gov/products', why: 'Look up a cloud product’s current authorization yourself — do not take a vendor homepage as proof.', kind: 'portal' },
  { label: 'DFARS 252.204-7021 (CMMC requirements)', url: 'https://www.acquisition.gov/dfars/252.204-7021-contractor-compliance-with-the-cybersecurity-maturity-model-certification-level-requirement.', why: 'The clause that will flow CMMC requirements onto contracts as the program phases in.', kind: 'regulation' },
];

// ---------------------------------------------------------------------------
// Per-surface selections
// ---------------------------------------------------------------------------
export const LINKS_BY_SURFACE = {
  requirements: [...REGULATORY_LINKS],
  score: [REGULATORY_LINKS[1], REGULATORY_LINKS[4], PORTAL_LINKS[2]],
  tier1: [TRAINING_LINKS[0], TRAINING_LINKS[1], TRAINING_LINKS[2], PORTAL_LINKS[3], REGULATORY_LINKS[3]],
  training: [...TRAINING_LINKS],
  registrations: [PORTAL_LINKS[1], PORTAL_LINKS[0], PORTAL_LINKS[2], PORTAL_LINKS[4], PORTAL_LINKS[5]],
  enclave: [VENDOR_DOC_LINKS[0], VENDOR_DOC_LINKS[7], REGULATORY_LINKS[5], REGULATORY_LINKS[3]],
  documents: [REGULATORY_LINKS[0], REGULATORY_LINKS[1], VENDOR_DOC_LINKS[2]],
  resources: [
    VENDOR_DOC_LINKS[0],
    VENDOR_DOC_LINKS[1],
    VENDOR_DOC_LINKS[7],
    PORTAL_LINKS[0],
    PORTAL_LINKS[7],
    TRAINING_LINKS[3],
  ],
  advisory: [PORTAL_LINKS[6], TRAINING_LINKS[1], VENDOR_DOC_LINKS[3]],
} as const;

export type LinkSurface = keyof typeof LINKS_BY_SURFACE;
