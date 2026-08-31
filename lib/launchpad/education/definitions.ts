/**
 * Tenant education topics (commercial non-CUI). Public-knowledge definitions only.
 * Does not store CUI. SF-86 is excluded.
 */

export interface EducationTopic {
  slug: string;
  title: string;
  category: 'networks' | 'clearance' | 'classification' | 'cui' | 'program';
  summary: string;
  body: string;
  storesInLaunchpad: string;
  neverStores: string;
}

export const EDUCATION_TOPICS: EducationTopic[] = [
  {
    slug: 'cybernet',
    title: 'Cybernet',
    category: 'networks',
    summary: 'Informal name for interconnected computer networks used to process information.',
    body:
      'In defense-contractor conversation, “cybernet” is not a single DoD system. Treat it as the customer’s described computing environment: endpoints, identity, logging, and boundary. Launchpad records customer-authored facts about that environment — never packet captures or raw logs.',
    storesInLaunchpad: 'Customer-authored environment notes and evidence hashes.',
    neverStores: 'Raw traffic, PCAPs, full SIEM logs, credentials.',
  },
  {
    slug: 'niprnet',
    title: 'NIPRNet',
    category: 'networks',
    summary: 'Non-classified Internet Protocol Router Network — DoD’s unclassified IP network.',
    body:
      'NIPRNet carries unclassified DoD traffic and is distinct from SIPRNet (secret) and JWICS (SCI). A commercial contractor does not “join NIPRNet” by using Launchpad. Access, if any, is through authorized DoD/prime channels the customer already has. Launchpad never proxies NIPRNet.',
    storesInLaunchpad: 'Whether the customer recorded that they have an authorized NIPRNet path (yes/no/unknown).',
    neverStores: 'NIPRNet credentials, tokens, or traffic.',
  },
  {
    slug: 'dibnet',
    title: 'DIBNet',
    category: 'networks',
    summary: 'Defense Industrial Base Network — incident-reporting channel for contractors handling CUI.',
    body:
      'DIBNet is the DoD portal used to report qualifying cyber incidents under DFARS 252.204-7012. Launchpad can track whether the customer recorded a tabletop, an incident-readiness contact, or that a human filed a report. Launchpad does not file DIBNet reports and does not store incident packet captures.',
    storesInLaunchpad: 'Tier-1 incident / tabletop completion metadata and dates.',
    neverStores: 'CUI from an incident, malware samples, raw logs, or the DIBNet submission itself.',
  },
  {
    slug: 'security-clearances',
    title: 'Security clearances (overview)',
    category: 'clearance',
    summary: 'Personnel clearances are granted by the government, not by software or by the employer alone.',
    body:
      'Typical US personnel clearance levels discussed in commercial readiness work: Confidential, Secret, Top Secret, and (separately) SCI access which is not a level but a compartmented access. A company cannot sponsor its own Facility Clearance without an eligible contract need. Individuals do not self-apply via Launchpad. SF-86 / e-QIP / NBIS are out of this product.',
    storesInLaunchpad:
      'Facility-clearance readiness checklist flags the customer chooses, plus a required disclaimer acknowledgment.',
    neverStores: 'SF-86 answers, SSNs, investigation files, or clearance adjudication data.',
  },
  {
    slug: 'classifications',
    title: 'Classification levels (education)',
    category: 'classification',
    summary: 'US classification: Unclassified, Confidential, Secret, Top Secret — plus CUI which is not a classification.',
    body:
      'Classification is a government marking for National Security Information. CUI is a separate safeguarding category for unclassified information that still requires protection. Launchpad is a COMMERCIAL // NON-CUI workspace. Classified information and CUI must stay in the customer’s authorized enclave (for example PreVeil), never in this app.',
    storesInLaunchpad: 'Education text and customer-selected “we do not process CUI here” acknowledgements.',
    neverStores: 'Classified content, CUI content, or screenshots of marked documents.',
  },
  {
    slug: 'cui',
    title: 'CUI (education only)',
    category: 'cui',
    summary: 'Controlled Unclassified Information — not stored in Launchpad.',
    body:
      'CUI is unclassified information requiring safeguarding under 32 CFR Part 2002. Examples include certain CTI. This product educates; it does not become a CUI repository. Uploads and prompts that look like CUI banners or secret-shaped strings are blocked and quarantined as metadata-only events.',
    storesInLaunchpad: 'DLP hit kinds (not the blocked payload). Evidence hashes pointing at customer systems.',
    neverStores: 'CUI files, CUI screenshots, or CUI pasted into AI prompts.',
  },
  {
    slug: 'fcl-nisp',
    title: 'Facility clearance and NISP',
    category: 'program',
    summary: 'National Industrial Security Program (32 CFR 117) governs cleared facilities — Launchpad cannot obtain an FCL.',
    body:
      'An FCL is granted when there is a legitimate need, typically a classified contract. Launchpad may hold a customer checklist and open a counsel-referral task. It cannot sponsor, guarantee, or submit an FCL package.',
    storesInLaunchpad: 'Checklist flags and counsel-task ids.',
    neverStores: 'Classified contract exhibits, DD-254 body text imported from an enclave.',
  },
];

export function topicBySlug(slug: string): EducationTopic | undefined {
  return EDUCATION_TOPICS.find((t) => t.slug === slug);
}
